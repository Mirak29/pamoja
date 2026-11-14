import { sql } from '@01edu/db'
import { now } from '@01edu/time'
import { every } from '/api/lib/background.ts'
import { listOf } from '/api/lib/json-list.ts'
import { cosine, DIMENSIONS, embed, EMBEDDING_MODEL } from '/api/llm.ts'
import { Embedding } from '/api/schema.ts'
// The entry table must exist before the queries below are prepared
import '/api/entries.ts'

// The embeddings of the matching (PAM-311, §7.3, §11): a vector for each
// profile (headline, bio, skills, intents) and each help request (title,
// description, skills). A request gets its own before its first wave; the
// profiles, and what Gemini could not read in time, are filled in the
// background. Their cosine gives up to 10 points of semantic proximity;
// without a vector, 0.

type Target = 'user' | 'help_request'

// The vectors read and written in a batch
const BATCH = 50
/**
 * Texts embedded per run of the background task: the free Gemini quota
 * refuses more than about 100 a minute
 */
const PER_RUN = 90
const TEXT_MAX = 2000

const getVector = sql<
  { vector: Uint8Array; inputHash: string },
  { targetType: Target; targetId: number; model: string }
>`
  SELECT vector, inputHash FROM embedding
  WHERE targetType = :targetType AND targetId = :targetId AND model = :model
`.get

const listVectors = sql<
  { targetId: number; vector: Uint8Array },
  { targetType: Target; ids: string; model: string }
>`
  SELECT targetId, vector FROM embedding
  WHERE targetType = :targetType AND model = :model
    AND targetId IN (SELECT value FROM json_each(:ids))
`.all

const deleteVector = sql<
  undefined,
  { targetType: Target; targetId: number; model: string }
>`
  DELETE FROM embedding
  WHERE targetType = :targetType AND targetId = :targetId AND model = :model
`.run

const toBlob = (vector: Float32Array) => new Uint8Array(vector.buffer)
const fromBlob = (blob: Uint8Array) =>
  new Float32Array(
    blob.buffer.slice(blob.byteOffset, blob.byteOffset + blob.byteLength),
  )

/** A short, stable fingerprint of a text: a vector is redone when it moves */
export const hashOf = (text: string) => {
  let hash = 0x811c9dc5
  for (let i = 0; i < text.length; i++) {
    hash = Math.imul(hash ^ text.charCodeAt(i), 0x01000193)
  }
  return `${text.length}:${(hash >>> 0).toString(16)}`
}

const store = (
  targetType: Target,
  targetId: number,
  text: string,
  vector: Float32Array,
) => {
  deleteVector({ targetType, targetId, model: EMBEDDING_MODEL })
  Embedding.insert({
    targetType,
    targetId,
    model: EMBEDDING_MODEL,
    vector: toBlob(vector),
    inputHash: hashOf(text),
    createdAt: now(),
  })
}

/*
 * The texts
 */

const getProfile = sql<
  { headline: string | null; bio: string | null; skills: unknown },
  number
>`
  SELECT headline, bio,
    (SELECT json_group_array(skill.name) FROM userSkill
      JOIN skill USING (skillId) WHERE userSkill.userId = profile.userId)
      AS skills
  FROM profile WHERE userId = ?
`.get

const listIntents = sql<{ intent: string }, number>`
  SELECT intent FROM userIntent WHERE userId = ?
`.all

/** What the vector of a profile reads: who they are and what they do */
export const profileText = (userId: number) => {
  const profile = getProfile(userId)
  if (!profile) return ''
  const skills = listOf(profile.skills).filter((s) => typeof s === 'string')
  const intents = listIntents(userId).map((row) => row.intent)
  return [
    profile.headline ?? '',
    profile.bio ?? '',
    skills.length ? `Skills : ${skills.join(', ')}` : '',
    intents.length ? `Veut : ${intents.join(', ')}` : '',
  ].filter(Boolean).join('\n').slice(0, TEXT_MAX)
}

/** What the vector of a help request reads */
export const requestText = (
  request: { title: string; description: string; skills: string[] },
) =>
  [
    request.title.trim(),
    request.description.trim(),
    request.skills.length ? `Skills : ${request.skills.join(', ')}` : '',
  ].filter(Boolean).join('\n').slice(0, TEXT_MAX)

// A request waits this long for its vector, no more: then the background
const WAIT_MS = 4000

/** The vector of a text, before its request exists; undefined without one */
export const embedOne = async (text: string) => {
  if (!text) return undefined
  let timer = 0
  const late = new Promise<undefined>((resolve) => {
    timer = setTimeout(resolve, WAIT_MS)
  })
  try {
    return await Promise.race([embed([text]).then((v) => v?.[0]), late])
  } finally {
    clearTimeout(timer)
  }
}

/** Stores the vector of a new request, computed before it was written */
export const keepRequestVector = (
  helpRequestId: number,
  text: string,
  vector: Float32Array | undefined,
) => vector && store('help_request', helpRequestId, text, vector)

/*
 * The proximity
 */

// Below this cosine, nothing in common; from FULL, the 10 points. Measured
// on Gemini with the demo profiles: a Go payments request gives the Go
// reviewer 0.83, a frontend or mobile profile 0.68 to 0.69; a Flutter
// request gives the Flutter developer 0.80, the others 0.69 to 0.72
const FLOOR = 0.70
const FULL = 0.82

/** Points of semantic proximity, 0 to 10, from a cosine */
export const proximityPoints = (similarity: number) =>
  Math.round(
    10 * Math.min(1, Math.max(0, (similarity - FLOOR) / (FULL - FLOOR))),
  )

/** The cosine of a request with each developer that has a vector */
export const similarities = (helpRequestId: number, userIds: number[]) => {
  const mine = getVector({
    targetType: 'help_request',
    targetId: helpRequestId,
    model: EMBEDDING_MODEL,
  })
  const result = new Map<number, number>()
  if (!mine || !userIds.length) return result
  const request = fromBlob(mine.vector)
  if (request.length !== DIMENSIONS) return result
  for (
    const row of listVectors({
      targetType: 'user',
      ids: JSON.stringify(userIds),
      model: EMBEDDING_MODEL,
    })
  ) {
    result.set(row.targetId, cosine(request, fromBlob(row.vector)))
  }
  return result
}

/*
 * The background task: profiles, and requests that went without
 */

// The developers seen lately first: they are the ones a request may reach
const listUsers = sql<{ userId: number }, undefined>`
  SELECT profile.userId FROM profile
  ORDER BY (SELECT max(id) FROM entry WHERE entry.userId = profile.userId)
    DESC NULLS LAST, profile.updatedAt DESC
`.all

type RequestRow = {
  helpRequestId: number
  title: string
  description: string
  skills: unknown
}

const listOpenRequests = sql<RequestRow, undefined>`
  SELECT helpRequestId, title, description,
    (SELECT json_group_array(skill.name) FROM json_each(helpRequest.skills)
      JOIN skill ON skill.skillId = json_each.value) AS skills
  FROM helpRequest
  WHERE status IN ('open', 'matched')
`.all

/** Embeds what is missing or changed. Returns how many: tests call it */
export const fillEmbeddings = async () => {
  const todo: { type: Target; id: number; text: string }[] = []
  const due = (type: Target, id: number, text: string) => {
    if (!text || todo.length >= PER_RUN) return
    const known = getVector({
      targetType: type,
      targetId: id,
      model: EMBEDDING_MODEL,
    })
    if (known?.inputHash !== hashOf(text)) todo.push({ type, id, text })
  }
  for (const row of listOpenRequests()) {
    due(
      'help_request',
      row.helpRequestId,
      requestText({
        ...row,
        skills: listOf(row.skills).filter((s) => typeof s === 'string'),
      }),
    )
  }
  for (const { userId } of listUsers()) due('user', userId, profileText(userId))
  let done = 0
  for (let i = 0; i < todo.length; i += BATCH) {
    const batch = todo.slice(i, i + BATCH)
    const vectors = await embed(batch.map((item) => item.text))
    // Gemini failed: the next run tries again
    if (!vectors) break
    batch.forEach((item, k) => store(item.type, item.id, item.text, vectors[k]))
    done += batch.length
  }
  return done
}

/** Started by the server: shortly after it starts, then every 5 minutes */
export const startEmbeddings = () =>
  every('embeddings-error', 5 * 60_000, fillEmbeddings, 30_000)
