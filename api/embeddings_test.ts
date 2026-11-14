import { assert, assertEquals } from 'jsr:@std/assert@^1.0.13'
import { db, makeRestorePoint } from '@01edu/db'
import { now } from '@01edu/time'
import {
  fillEmbeddings,
  keepRequestVector,
  proximityPoints,
  requestText,
} from '/api/embeddings.ts'
import { DIMENSIONS, resetModels } from '/api/llm.ts'
import { rank } from '/api/matching.ts'
import { HelpRequest, Profile, User } from '/api/schema.ts'
import { setDeclaredSkills, skillIdsOf } from '/api/skills.ts'

// The semantic proximity of the matching (PAM-311, §7.3, §11)
const restore = makeRestorePoint()

// A fake Gemini: a text on payments points one way, any other the other
const axis = (k: number) =>
  Array.from({ length: DIMENSIONS }, (_, i) => i === k ? 1 : 0)
const vectorOf = (text: string) => /paiement/i.test(text) ? axis(0) : axis(1)
let embedded: string[] = []
let down = false
const realFetch = globalThis.fetch
globalThis.fetch = (input: RequestInfo | URL, init?: RequestInit) => {
  const url = new URL(input instanceof Request ? input.url : String(input))
  if (url.hostname !== 'generativelanguage.googleapis.com') {
    return realFetch(input, init)
  }
  if (down) return Promise.resolve(new Response('{}', { status: 503 }))
  const { input: texts } = JSON.parse(String(init?.body)) as {
    input: string[]
  }
  embedded.push(...texts)
  return Promise.resolve(
    new Response(JSON.stringify({
      data: texts.map((text) => ({ embedding: vectorOf(text) })),
    })),
  )
}

let githubId = 0
const dev = (login: string, headline: string) => {
  const at = now()
  const userId = User.insert({
    githubId: ++githubId,
    githubUsername: login,
    avatarUrl: '',
    source: 'demo',
    createdAt: at,
    updatedAt: at,
  })
  Profile.insert({
    userId,
    displayName: login,
    headline,
    theme: 'minimal',
    accent: 'indigo',
    availability: 'available',
    matchingMode: 'instant',
    // Every score kept: only the proximity is looked at
    matchingFilters: { minScore: 0 },
    createdAt: at,
    updatedAt: at,
  })
  setDeclaredSkills(userId, { skills: ['Go'], domains: [] })
  return userId
}

const setup = () => {
  restore()
  resetModels()
  embedded = []
  down = false
  Deno.env.set('GEMINI_API_KEY', 'test-key')
  const author = dev('awa', 'Fondatrice')
  const moussa = dev('moussa', 'Backend Go, paiements mobiles')
  const kofi = dev('kofi', 'Designer produit')
  const at = now()
  const ask = {
    title: 'Webhook de paiement Wave',
    description: '',
    skills: ['Go'],
  }
  const helpRequestId = HelpRequest.insert({
    authorId: author,
    category: 'debugging',
    ...ask,
    skills: skillIdsOf(ask.skills),
    status: 'open',
    expiresAt: at + 3600,
    source: 'platform',
    createdAt: at,
    updatedAt: at,
  })
  const need = {
    helpRequestId,
    authorId: author,
    category: 'debugging',
    skills: skillIdsOf(['Go']),
    projectId: null,
  }
  return { ask, helpRequestId, need, moussa, kofi }
}

const semanticOf = (ranked: ReturnType<typeof rank>, userId: number) =>
  ranked.find((c) => c.userId === userId)?.reasons
    .find((r) => r.kind === 'semantic')?.points ?? 0

Deno.test('embeddings: 0 to 10 points, from nothing in common to close', () => {
  assertEquals(
    [0.3, 0.7, 0.76, 0.82, 0.99].map(proximityPoints),
    [0, 0, 5, 10, 10],
  )
})

Deno.test('embeddings: a profile close to the request gets the points', async () => {
  const { need, moussa, kofi } = setup()
  // Nothing yet: the criterion counts 0
  assertEquals(semanticOf(rank(need), moussa), 0)
  // The background reads the request and every profile
  assertEquals(await fillEmbeddings(), 4)
  const ranked = rank(need)
  assertEquals(semanticOf(ranked, moussa), 10)
  assertEquals(semanticOf(ranked, kofi), 0)
  assert(
    ranked.findIndex((c) => c.userId === moussa) <
      ranked.findIndex((c) => c.userId === kofi),
  )
  // Nothing changed: nothing embedded again
  embedded = []
  assertEquals(await fillEmbeddings(), 0)
  // A profile edited is read again
  db.prepare('UPDATE profile SET headline = ? WHERE userId = ?')
    .run('Paiements et design', kofi)
  assertEquals(await fillEmbeddings(), 1)
  assertEquals(semanticOf(rank(need), kofi), 10)
})

Deno.test('embeddings: a vector kept at creation, none when Gemini is down', async () => {
  const { ask, helpRequestId, need, moussa } = setup()
  keepRequestVector(helpRequestId, requestText(ask), new Float32Array(axis(0)))
  down = true
  assertEquals(await fillEmbeddings(), 0)
  // Without the profile's vector, still 0
  assertEquals(semanticOf(rank(need), moussa), 0)
})
