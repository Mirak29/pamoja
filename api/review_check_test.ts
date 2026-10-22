import { assertEquals } from 'jsr:@std/assert@^1.0.13'
import { db, makeRestorePoint } from '@01edu/db'
import { now } from '@01edu/time'
import { entries } from '/api/entry-types.ts'
import { countReviewComments } from '/api/review-check.ts'
import {
  HelpRequest,
  Project,
  ProjectMember,
  Repository,
  User,
} from '/api/schema.ts'
import server from '/api/server.ts'
import { refreshRepository } from '/api/sync.ts'
import { processDeliveries } from '/api/webhooks.ts'

// The five conditions of §7.5, with real signed deliveries and a fake GitHub
// for what the webhook does not carry
const SECRET = 'test-webhook-secret'
const restore = makeRestorePoint()

const ABDOU = { id: 100, login: 'abdou' }
const MOUSSA = { id: 200, login: 'moussa' }
const FATOU = { id: 300, login: 'fatou' }
const REPO = { id: 4242, full_name: 'abdou/openpay-africa' }

let github: Record<string, unknown> = {}
const realFetch = globalThis.fetch
globalThis.fetch = (input: RequestInfo | URL, init?: RequestInit) => {
  const url = new URL(input instanceof Request ? input.url : String(input))
  if (url.hostname !== 'api.github.com') return realFetch(input, init)
  const body = github[url.pathname + url.search]
  return Promise.resolve(
    body === undefined
      ? new Response('{}', { status: 404 })
      : new Response(JSON.stringify(body), {
        headers: { 'content-type': 'application/json' },
      }),
  )
}

const sign = async (body: string) => {
  const key = await crypto.subtle.importKey(
    'raw',
    new TextEncoder().encode(SECRET),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign'],
  )
  const mac = await crypto.subtle.sign(
    'HMAC',
    key,
    new TextEncoder().encode(body),
  )
  return `sha256=${new Uint8Array(mac).toHex()}`
}

let counter = 0
const deliver = async (event: string, payload: Record<string, unknown>) => {
  const body = JSON.stringify({ repository: REPO, ...payload })
  const res = await server.fetch(
    new Request('http://localhost/api/github/webhook', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-GitHub-Event': event,
        'X-GitHub-Delivery': `review-${++counter}`,
        'X-Hub-Signature-256': await sign(body),
      },
      body,
    }),
  )
  assertEquals(res.status, 202)
  processDeliveries()
}

const iso = (seconds: number) => new Date(seconds * 1000).toISOString()

const pull = (author = ABDOU) => ({
  id: 8081,
  number: 81,
  title: 'Payment transaction handling',
  state: 'open',
  user: author,
  head: { ref: 'feat/payment-tx', sha: 'abc' },
  merged_at: null,
  html_url: 'https://github.com/abdou/openpay-africa/pull/81',
  created_at: iso(now() - 3600),
  updated_at: iso(now() - 3600),
})

const review = (
  id: number,
  user: typeof ABDOU,
  state: string,
  body: string,
  at: number,
) => ({ id, user, state, body, submitted_at: iso(at) })

/** Abdou asks Moussa for a review of PR #81; Moussa accepted 10 min ago */
const setup = async (prAuthor = ABDOU) => {
  restore()
  github = {}
  const at = now()
  const user = (g: typeof ABDOU) =>
    User.insert({
      githubId: g.id,
      githubUsername: g.login,
      avatarUrl: '',
      source: 'demo',
      createdAt: at,
      updatedAt: at,
    })
  const abdou = user(ABDOU)
  const moussa = user(MOUSSA)
  user(FATOU)
  const projectId = Project.insert({
    ownerId: abdou,
    name: 'OpenPay Africa',
    slug: 'openpay-africa',
    description: '',
    visibility: 'public',
    status: 'beta',
    source: 'demo',
    createdAt: at,
    updatedAt: at,
  })
  ProjectMember.insert({
    projectId,
    userId: abdou,
    role: 'owner',
    joinedAt: at,
  })
  const repositoryId = Repository.insert({
    projectId,
    githubId: REPO.id,
    owner: 'abdou',
    name: 'openpay-africa',
    fullName: REPO.full_name,
    defaultBranch: 'main',
    syncMode: 'poll',
    source: 'github',
  })
  await deliver('pull_request', {
    action: 'opened',
    pull_request: pull(prAuthor),
  })
  const pullRequestId = (db.prepare('SELECT pullRequestId FROM pullRequest')
    .get() as { pullRequestId: number }).pullRequestId
  const acceptedAt = at - 600
  const id = HelpRequest.insert({
    authorId: abdou,
    projectId,
    pullRequestId,
    category: 'code_review',
    title: 'Relire la PR #81',
    description: '',
    skills: [],
    status: 'accepted',
    acceptedBy: moussa,
    acceptedAt,
    expiresAt: at + 7 * 86_400,
    source: 'platform',
    createdAt: at - 3600,
    updatedAt: at,
  })
  return { id, abdou, moussa, repositoryId, acceptedAt }
}

const statusOf = (id: number) =>
  (db.prepare('SELECT status FROM helpRequest WHERE helpRequestId = ?')
    .get(id) as { status: string }).status

const reviewOf = (id: number) =>
  db.prepare(
    'SELECT githubReviewId, helpRequestId FROM review WHERE githubReviewId = ?',
  )
    .get(id) as { githubReviewId: number; helpRequestId: number | null }

const submitted = () =>
  db.prepare(
    'SELECT userId, helpRequestId, pullRequestId FROM entry WHERE type = ?',
  )
    .all(entries.REVIEW_SUBMITTED)

const reviewed = (deliver: typeof review) => ({
  action: 'submitted',
  pull_request: pull(),
  review: deliver,
})

Deno.test('review check: the helper approves after accepting: review submitted', async () => {
  const s = await setup()
  await deliver('pull_request_review', {
    action: 'submitted',
    pull_request: pull(),
    review: review(1, MOUSSA, 'approved', '', now()),
  })
  assertEquals(statusOf(s.id), 'review_submitted')
  assertEquals(reviewOf(1).helpRequestId, s.id)
  assertEquals(submitted(), [{
    userId: s.moussa,
    helpRequestId: s.id,
    pullRequestId: 1,
  }])
  // The requester is told (§7.4)
  assertEquals(
    db.prepare('SELECT userId, type FROM notification').all(),
    [{ userId: s.abdou, type: 'help_reviewed' }],
  )
})

Deno.test('review check: another reviewer, or a review before the acceptance, does not count', async () => {
  const s = await setup()
  // Condition 2: Fatou is not the helper
  await deliver(
    'pull_request_review',
    reviewed(review(2, FATOU, 'approved', 'LGTM', now())),
  )
  // Condition 4: Moussa reviewed before he accepted
  await deliver(
    'pull_request_review',
    reviewed(review(3, MOUSSA, 'changes_requested', 'Non', s.acceptedAt - 60)),
  )
  assertEquals(statusOf(s.id), 'accepted')
  assertEquals(submitted(), [])
})

Deno.test('review check: the author of the PR cannot be its reviewer', async () => {
  // Condition 3: Moussa wrote the PR he would review
  const s = await setup(MOUSSA)
  await deliver(
    'pull_request_review',
    reviewed(review(4, MOUSSA, 'approved', '', now())),
  )
  assertEquals(statusOf(s.id), 'accepted')
})

Deno.test('review check: a « commented » review needs a comment', async () => {
  const s = await setup()
  // Commented without a body: no comment known yet
  await deliver(
    'pull_request_review',
    reviewed(review(5, MOUSSA, 'commented', '', now())),
  )
  assertEquals(statusOf(s.id), 'accepted')
  // Without a body, the inline comments are read on GitHub after the webhook
  github[
    '/repos/abdou/openpay-africa/pulls/81/reviews/5/comments?per_page=100'
  ] = [
    { id: 1 },
    { id: 2 },
  ]
  await countReviewComments(1)
  assertEquals(statusOf(s.id), 'review_submitted')
  assertEquals(
    (db.prepare('SELECT commentCount FROM review WHERE githubReviewId = 5')
      .get() as {
        commentCount: number
      }).commentCount,
    2,
  )
})

Deno.test('review check: a commented review with a body is enough', async () => {
  const s = await setup()
  await deliver(
    'pull_request_review',
    reviewed(review(6, MOUSSA, 'commented', 'Le rollback manque', now())),
  )
  assertEquals(statusOf(s.id), 'review_submitted')
})

Deno.test('review check: the resync finds a review whose webhook was lost', async () => {
  const s = await setup()
  github['/repos/abdou/openpay-africa/pulls/81/reviews?per_page=100'] = [
    review(7, MOUSSA, 'approved', '', now()),
  ]
  await refreshRepository(s.repositoryId)
  assertEquals(statusOf(s.id), 'review_submitted')
  assertEquals(reviewOf(7).helpRequestId, s.id)
})
