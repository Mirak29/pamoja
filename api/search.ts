import { sql } from '@01edu/db'
import { numbersOf, stringsOf } from '/api/lib/json.ts'
import { now } from '@01edu/time'
import { every, later } from '/api/lib/background.ts'
import { errorMessage, log } from '/api/lib/log.ts'
import { MEILI_MASTER_KEY, MEILI_URL } from '/api/lib/env.ts'
import { skillNamesOf } from '/api/skills.ts'

// The global search (§10.4). Meilisearch, in its own container, answers as
// one types and forgives typos (« postgress » finds PostgreSQL). It is only
// an index: SQLite stays the truth, and every document is built from it.
// The entries say what changed; the whole index is rebuilt as the server
// starts and every night. Without Meilisearch, or when it does not answer,
// the same search runs in SQL (LIKE): slower and without typos, but the
// page works. Everything goes through `search`.

export const KINDS = [
  'developers',
  'projects',
  'communities',
  'posts',
  'help_requests',
] as const
export type Kind = typeof KINDS[number]

/*
 * The documents, read from SQLite. Only what anyone signed in can see: no
 * unlisted project, no hidden post, no request addressed to one person, no
 * suspended developer, no message of a channel.
 */

type Filter = { ids: string | null; like: string | null }

const jsonIds = (ids?: number[]) => ids ? JSON.stringify(ids) : null
const like = (query: string) =>
  // `!` escapes the wildcards of LIKE: what is typed is text
  query.trim() ? `%${query.trim().replace(/[!%_]/g, '!$&')}%` : null

const developerRows = sql<
  {
    id: number
    login: string
    name: string
    headline: string
    city: string
    country: string
    available: number
    skills: string
  },
  Filter & { at: number }
>`
  SELECT user.userId AS id, user.githubUsername AS login,
    profile.displayName AS name, coalesce(profile.headline, '') AS headline,
    coalesce(profile.city, '') AS city, coalesce(profile.country, '') AS country,
    profile.availability = 'available' AS available,
    (SELECT json_group_array(DISTINCT skill.name) FROM userSkill
      JOIN skill ON skill.skillId = userSkill.skillId
      WHERE userSkill.userId = user.userId) AS skills
  FROM user JOIN profile ON profile.userId = user.userId
  WHERE (user.suspendedUntil IS NULL OR user.suspendedUntil < :at)
    AND (:ids IS NULL OR user.userId IN (SELECT value FROM json_each(:ids)))
    AND (:like IS NULL OR profile.displayName || ' ' || user.githubUsername
      || ' ' || coalesce(profile.headline, '') || ' ' || coalesce(profile.city, '')
      || ' ' || coalesce(profile.country, '') LIKE :like ESCAPE '!'
      OR EXISTS (SELECT 1 FROM userSkill JOIN skill ON skill.skillId = userSkill.skillId
        WHERE userSkill.userId = user.userId AND skill.name LIKE :like ESCAPE '!'))
  ORDER BY user.userId
`.all

const projectRows = sql<
  {
    id: number
    slug: string
    name: string
    description: string
    vision: string
    skills: string | null
  },
  Filter
>`
  SELECT projectId AS id, slug, name, description,
    coalesce(vision, '') AS vision, skills
  FROM project
  WHERE visibility = 'public'
    AND (:ids IS NULL OR projectId IN (SELECT value FROM json_each(:ids)))
    AND (:like IS NULL OR name || ' ' || description || ' ' || coalesce(vision, '')
      LIKE :like ESCAPE '!')
  ORDER BY projectId
`.all

const communityRows = sql<
  {
    id: number
    slug: string
    name: string
    type: string
    description: string
    members: number
  },
  Filter
>`
  SELECT community.communityId AS id, slug, name, type, description,
    (SELECT count(*) FROM communityMember
      WHERE communityMember.communityId = community.communityId) AS members
  FROM community
  WHERE (:ids IS NULL OR communityId IN (SELECT value FROM json_each(:ids)))
    AND (:like IS NULL OR name || ' ' || description LIKE :like ESCAPE '!')
  ORDER BY communityId
`.all

const postRows = sql<
  {
    id: number
    title: string
    body: string
    type: string
    author: string
    community: string
  },
  Filter
>`
  SELECT post.postId AS id, coalesce(post.title, '') AS title,
    substr(post.body, 1, 2000) AS body, post.type,
    profile.displayName AS author, coalesce(community.name, '') AS community
  FROM post
  JOIN profile ON profile.userId = post.authorId
  LEFT JOIN community ON community.communityId = post.communityId
  WHERE post.parentId IS NULL AND post.hiddenAt IS NULL
    AND post.repostOfId IS NULL
    AND (:ids IS NULL OR post.postId IN (SELECT value FROM json_each(:ids)))
    AND (:like IS NULL OR coalesce(post.title, '') || ' ' || post.body
      LIKE :like ESCAPE '!')
  ORDER BY post.postId
`.all

const helpRows = sql<
  {
    id: number
    title: string
    description: string
    category: string
    status: string
    skills: string
    project: string
  },
  Filter
>`
  SELECT helpRequest.helpRequestId AS id, helpRequest.title,
    substr(helpRequest.description, 1, 2000) AS description,
    helpRequest.category, helpRequest.status, helpRequest.skills,
    coalesce(project.name, '') AS project
  FROM helpRequest
  LEFT JOIN project ON project.projectId = helpRequest.projectId
  WHERE helpRequest.targetUserId IS NULL
    AND (:ids IS NULL OR helpRequest.helpRequestId IN (SELECT value FROM json_each(:ids)))
    AND (:like IS NULL OR helpRequest.title || ' ' || helpRequest.description
      LIKE :like ESCAPE '!')
  ORDER BY helpRequest.helpRequestId
`.all

const skillsOf = (value: unknown) => skillNamesOf(numbersOf(value))

// Each kind, its documents from its rows
const builders = {
  developers: (filter: Filter) =>
    developerRows({ ...filter, at: now() }).map((row) => ({
      ...row,
      available: !!row.available,
      skills: stringsOf(row.skills),
    })),
  projects: (filter: Filter) =>
    projectRows(filter).map((row) => ({
      ...row,
      skills: skillsOf(row.skills),
    })),
  communities: (filter: Filter) => communityRows(filter),
  posts: (filter: Filter) => postRows(filter),
  help_requests: (filter: Filter) =>
    helpRows(filter).map((row) => ({ ...row, skills: skillsOf(row.skills) })),
}

type Documents = { [K in Kind]: ReturnType<typeof builders[K]> }

/** The documents of a kind: all of them, some ids, or those like a text */
export const documentsOf = <K extends Kind>(
  kind: K,
  { ids, query = '' }: { ids?: number[]; query?: string } = {},
): Documents[K] =>
  builders[kind]({ ids: jsonIds(ids), like: like(query) }) as Documents[K]

/*
 * Meilisearch, over HTTP: its key never leaves the server, and its port is
 * reached from the app only (docker-compose.yml).
 */

const SETTINGS: Record<Kind, { searchable: string[]; filterable: string[] }> = {
  developers: {
    searchable: ['name', 'login', 'skills', 'headline', 'city', 'country'],
    filterable: ['country', 'skills', 'available'],
  },
  projects: {
    searchable: ['name', 'skills', 'description', 'vision'],
    filterable: ['skills'],
  },
  communities: {
    searchable: ['name', 'type', 'description'],
    filterable: ['type'],
  },
  posts: {
    searchable: ['title', 'body', 'community', 'author', 'type'],
    filterable: ['type'],
  },
  help_requests: {
    searchable: ['title', 'skills', 'category', 'description', 'project'],
    filterable: ['status', 'skills', 'category'],
  },
}

// A search waits this long at most before the SQL takes over
const ANSWER_MS = 1500
// After a failure, Meilisearch is not asked again for a while
const REST_MS = 30_000
let downUntil = 0

const meili = async (method: string, path: string, body?: unknown) => {
  const response = await fetch(`${MEILI_URL}${path}`, {
    method,
    headers: {
      'Authorization': `Bearer ${MEILI_MASTER_KEY}`,
      'Content-Type': 'application/json',
    },
    body: body === undefined ? undefined : JSON.stringify(body),
    signal: AbortSignal.timeout(ANSWER_MS * 10),
  })
  if (!response.ok && response.status !== 404) {
    throw Error(`Meilisearch ${method} ${path}: ${response.status}`)
  }
  return response.status === 404 ? undefined : await response.json()
}

// Meilisearch answers a write with a task: the next step waits for it. A
// failure it expects (an index already there, or already gone) is no error.
const done = async (
  task: { taskUid: number } | undefined,
  expected?: 'index_already_exists' | 'index_not_found',
) => {
  if (!task) return
  for (let tries = 0; tries < 600; tries++) {
    const state = await meili('GET', `/tasks/${task.taskUid}`)
    if (state?.status === 'succeeded') return
    if (state?.status === 'failed' && state.error?.code === expected) return
    if (state?.status === 'failed' || state?.status === 'canceled') {
      throw Error(`Meilisearch task ${task.taskUid}: ${state.error?.message}`)
    }
    await new Promise((resolve) => setTimeout(resolve, 100))
  }
  throw Error(`Meilisearch task ${task.taskUid}: still running`)
}

const drop = async (uid: string) =>
  await done(await meili('DELETE', `/indexes/${uid}`), 'index_not_found')

const configure = async (uid: string, kind: Kind) => {
  await done(
    await meili('POST', '/indexes', { uid, primaryKey: 'id' }),
    'index_already_exists',
  )
  await done(
    await meili('PATCH', `/indexes/${uid}/settings`, {
      searchableAttributes: SETTINGS[kind].searchable,
      filterableAttributes: SETTINGS[kind].filterable,
    }),
  )
}

/**
 * The whole index of a kind, built again aside then swapped in: searches
 * never see it half filled
 */
const rebuild = async (kind: Kind) => {
  const fresh = `${kind}_next`
  await drop(fresh)
  await configure(fresh, kind)
  await configure(kind, kind)
  const documents = documentsOf(kind)
  for (let i = 0; i < documents.length; i += 1000) {
    await done(
      await meili(
        'POST',
        `/indexes/${fresh}/documents`,
        documents.slice(i, i + 1000),
      ),
    )
  }
  await done(await meili('POST', '/swap-indexes', [{ indexes: [kind, fresh] }]))
  await drop(fresh)
  return documents.length
}

/** Every index, from SQLite */
export const reindexAll = async () => {
  const counts: Record<string, number> = {}
  for (const kind of KINDS) counts[kind] = await rebuild(kind)
  downUntil = 0
  log.info('search-reindexed', counts)
  return counts
}

/** Some documents again: those that changed, or that are gone */
export const reindex = async (kind: Kind, ids: number[]) => {
  if (!ids.length) return
  const documents = documentsOf(kind, { ids })
  const kept = new Set(documents.map((doc) => doc.id))
  const gone = ids.filter((id) => !kept.has(id))
  documents.length &&
    await done(await meili('POST', `/indexes/${kind}/documents`, documents))
  gone.length &&
    await done(
      await meili('POST', `/indexes/${kind}/documents/delete-batch`, gone),
    )
}

/*
 * What the entries change (§13): read every few seconds after the last one
 * seen, by lots. A type that touches nothing searchable is passed over.
 */

const WATCHED: Record<string, { kind: Kind; column: string }> = {
  USER_LOGIN: { kind: 'developers', column: 'userId' },
  PROFILE_UPDATED: { kind: 'developers', column: 'userId' },
  PROJECT_CREATED: { kind: 'projects', column: 'projectId' },
  PROJECT_UPDATED: { kind: 'projects', column: 'projectId' },
  POST_CREATED: { kind: 'posts', column: 'postId' },
  POST_UPDATED: { kind: 'posts', column: 'postId' },
  MODERATION_ACTION: { kind: 'posts', column: 'postId' },
}
// A moderation may also suspend a developer: the profile is read again

const lastEntry =
  sql<{ id: number | null }, undefined>`SELECT max(id) AS id FROM entry`
    .get
const entriesAfter = sql<
  {
    id: number
    type: string
    userId: number | null
    projectId: number | null
    postId: number | null
    helpRequestId: number | null
  },
  number
>`
  SELECT entry.id, type.typeName AS type, entry.userId, entry.projectId,
    entry.postId, entry.helpRequestId
  FROM entry JOIN type ON type.typeId = entry.type
  WHERE entry.id > ? ORDER BY entry.id LIMIT 500
`.all

let cursor = 0

/** The documents the entries after the cursor changed, sent by kind */
export const syncEntries = async () => {
  const rows = entriesAfter(cursor)
  if (!rows.length) return 0
  const changed = new Map<Kind, Set<number>>()
  const touch = (kind: Kind, id: number | null) => {
    if (!id) return
    changed.has(kind) || changed.set(kind, new Set())
    changed.get(kind)!.add(id)
  }
  for (const row of rows) {
    // Every step of a request for help changes its status
    if (row.type.startsWith('HELP_REQUEST_')) {
      touch('help_requests', row.helpRequestId)
    }
    const watched = WATCHED[row.type]
    watched &&
      touch(watched.kind, row[watched.column as keyof typeof row] as number)
    row.type === 'MODERATION_ACTION' && touch('developers', row.userId)
  }
  for (const [kind, ids] of changed) await reindex(kind, [...ids])
  cursor = rows.at(-1)!.id
  return rows.length
}

// While Meilisearch is down, the entries wait in SQLite: the cursor only
// moves once they are sent, and a failure is said once a pause, not every
// few seconds
const syncWhileUp = async () => {
  if (Date.now() < downUntil) return
  try {
    await syncEntries()
  } catch (err) {
    downUntil = Date.now() + REST_MS
    throw err
  }
}

const NIGHT_MS = 24 * 3600_000
const SYNC_MS = 3_000

/**
 * Started with the server when Meilisearch is set: the whole index first,
 * from the last entry known, then the entries as they come, then every
 * night. Nothing is lost while it rebuilds: the entries wait in SQLite.
 */
export const startSearchSync = () => {
  if (!MEILI_URL) return
  cursor = lastEntry()?.id ?? 0
  later('search-reindex-error', reindexAll)
  every('search-sync-error', SYNC_MS, syncWhileUp, SYNC_MS)
  every('search-reindex-error', NIGHT_MS, reindexAll, NIGHT_MS)
}

/*
 * The search itself
 */

type Found = Documents & { engine: 'meilisearch' | 'sql' }

const fromSql = (query: string, limit: number): Found => {
  const found = { engine: 'sql' } as Found
  for (const kind of KINDS) {
    found[kind] = documentsOf(kind, { query }).slice(0, limit) as never
  }
  return found
}

const fromMeili = async (query: string, limit: number): Promise<Found> => {
  const response = await fetch(`${MEILI_URL}/multi-search`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${MEILI_MASTER_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      queries: KINDS.map((kind) => ({ indexUid: kind, q: query, limit })),
    }),
    signal: AbortSignal.timeout(ANSWER_MS),
  })
  if (!response.ok) throw Error(`Meilisearch search: ${response.status}`)
  const { results } = await response.json() as {
    results: { indexUid: Kind; hits: unknown[] }[]
  }
  const found = { engine: 'meilisearch' } as Found
  for (const kind of KINDS) {
    found[kind] = (results.find((r) => r.indexUid === kind)?.hits ??
      []) as never
  }
  return found
}

/**
 * Developers, projects, communities, posts and requests for help that match
 * a text, `limit` of each: from Meilisearch, or from SQL when it is not set
 * or does not answer
 */
export const search = async (query: string, limit = 5): Promise<Found> => {
  if (!MEILI_URL || Date.now() < downUntil) return fromSql(query, limit)
  try {
    return await fromMeili(query, limit)
  } catch (err) {
    downUntil = Date.now() + REST_MS
    log.warn('search-fallback', { message: errorMessage(err) })
    return fromSql(query, limit)
  }
}
