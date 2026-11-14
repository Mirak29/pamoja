import { assertEquals, assertStringIncludes } from 'jsr:@std/assert@^1.0.13'
import { db, makeRestorePoint } from '@01edu/db'
import { now } from '@01edu/time'
import { entries } from '/api/entry-types.ts'
import { resetModels } from '/api/llm.ts'
import { pulseOf } from '/api/pulse.ts'
import {
  resetSummaries,
  summarizeProjects,
  summarizeSoon,
} from '/api/pulse-summary.ts'
import { Project, PullRequest, Repository, User } from '/api/schema.ts'

// The AI summary of the Pulse (PAM-307, §6.4, §11)
const restore = makeRestorePoint()

const SUMMARY =
  'Le développement est actif : Moussa a fusionné le webhook Wave. Une PR attend encore sa review.'

// A fake Groq: what it answers, and what it was sent
let reply: () => Response
let sent: { messages: { content: string }[] }[] = []
const realFetch = globalThis.fetch
globalThis.fetch = (input: RequestInfo | URL, init?: RequestInit) => {
  const url = new URL(input instanceof Request ? input.url : String(input))
  if (url.hostname !== 'api.groq.com') return realFetch(input, init)
  sent.push(JSON.parse(String(init?.body)))
  return Promise.resolve(reply())
}
const says = (content: string) => () =>
  new Response(JSON.stringify({ choices: [{ message: { content } }] }))

const setup = ({ key = true } = {}) => {
  restore()
  resetModels()
  resetSummaries()
  sent = []
  reply = says(SUMMARY)
  for (const name of ['META_API_KEY', 'GEMINI_API_KEY']) Deno.env.delete(name)
  key
    ? Deno.env.set('GROQ_API_KEY', 'test-key')
    : Deno.env.delete('GROQ_API_KEY')
  const at = now()
  const ownerId = User.insert({
    githubId: 1,
    githubUsername: 'abdou',
    avatarUrl: '',
    source: 'demo',
    createdAt: at,
    updatedAt: at,
  })
  const projectId = Project.insert({
    ownerId,
    name: 'OpenPay Africa',
    slug: 'openpay-africa',
    description: '',
    visibility: 'public',
    status: 'beta',
    source: 'demo',
    createdAt: at,
    updatedAt: at,
  })
  const repositoryId = Repository.insert({
    projectId,
    githubId: 10,
    owner: 'abdou',
    name: 'openpay-africa',
    fullName: 'abdou/openpay-africa',
    defaultBranch: 'main',
    syncMode: 'poll',
    source: 'github',
  })
  let number = 0
  const merge = (title: string, mergedAt = at) =>
    PullRequest.insert({
      repositoryId,
      githubId: 100 + ++number,
      number,
      title,
      state: mergedAt ? 'merged' : 'open',
      authorGithubId: 2,
      authorLogin: 'moussa',
      additions: 1,
      deletions: 1,
      mergedAt,
      source: 'github',
      createdAt: at,
      updatedAt: at,
    })
  merge('Webhook Wave')
  return { at, projectId, merge }
}

const pulseReady = () =>
  (db.prepare('SELECT count(*) AS n FROM entry WHERE type = ?')
    .get(entries.PULSE_READY) as { n: number }).n

const stored = () =>
  (db.prepare('SELECT count(*) AS n FROM projectSummary').get() as {
    n: number
  }).n

Deno.test('pulse summary: written in the background, then shown with the Pulse', async () => {
  const { at } = setup()
  assertEquals(pulseOf('openpay-africa', null, at).summary, '')
  assertEquals(await summarizeProjects(at), 1)
  assertEquals(pulseOf('openpay-africa', null, at).summary, SUMMARY)
  assertEquals(pulseReady(), 1)
  // What GitHub wrote is a datum, framed apart from the instructions
  const data = sent[0].messages[1].content
  assertStringIncludes(data, '<donnees>')
  assertStringIncludes(data, 'Webhook Wave')
  assertStringIncludes(data, 'moussa')
})

Deno.test('pulse summary: again only when activity changed, 10 min apart', async () => {
  const { at, merge } = setup()
  await summarizeProjects(at)
  // Something new, but too soon: nothing asked
  merge('Retry des paiements')
  assertEquals(await summarizeProjects(at + 60), 0)
  assertEquals(sent.length, 1)
  // 10 min later, the new merge is told
  assertEquals(await summarizeProjects(at + 11 * 60), 1)
  assertEquals(sent.length, 2)
  // Later again, nothing new since: nothing asked
  assertEquals(await summarizeProjects(at + 22 * 60), 0)
  assertEquals(sent.length, 2)
  // Only the last summary is kept
  assertEquals(stored(), 1)
})

Deno.test('pulse summary: no key, a failure or an invalid answer write nothing', async () => {
  const { at } = setup({ key: false })
  assertEquals(await summarizeProjects(at), 0)
  assertEquals(sent.length, 0)

  setup()
  reply = () => new Response('{}', { status: 503 })
  assertEquals(await summarizeProjects(at), 0)

  setup()
  reply = says('Actif.')
  assertEquals(await summarizeProjects(at), 0)
  assertEquals([stored(), pulseReady()], [0, 0])
})

Deno.test('pulse summary: a project just imported gets it within seconds', async () => {
  const { projectId } = setup()
  summarizeSoon(projectId)
  // After the answer of the import, outside its work (later)
  await new Promise((resolve) => setTimeout(resolve, 50))
  assertEquals([stored(), pulseReady()], [1, 1])
})
