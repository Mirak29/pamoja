import { assertEquals } from 'jsr:@std/assert@^1.0.13'
import { db, makeRestorePoint } from '@01edu/db'
import { now } from '@01edu/time'
import { entries, type EntryTypeName } from '/api/entries.ts'
import { Project, ProjectMember, Repository, User } from '/api/schema.ts'
import server from '/api/server.ts'
import { processDeliveries } from '/api/webhooks.ts'

// Real deliveries, signed with the secret of .env-test (§5.5), on a project
// owned by Abdou; Moussa is on Pamoja too
const SECRET = 'test-webhook-secret'
const restore = makeRestorePoint()

const ABDOU = { id: 100, login: 'abdou' }
const MOUSSA = { id: 200, login: 'moussa' }
const STRANGER = { id: 300, login: 'someone' }
const REPO = { id: 4242, full_name: 'abdou/openpay-africa' }

let ids: { abdou: number; moussa: number; repositoryId: number }

const setup = () => {
  restore()
  const at = now()
  const user = (github: typeof ABDOU) =>
    User.insert({
      githubId: github.id,
      githubUsername: github.login,
      avatarUrl: '',
      source: 'demo',
      createdAt: at,
      updatedAt: at,
    })
  const abdou = user(ABDOU)
  const moussa = user(MOUSSA)
  const projectId = Project.insert({
    ownerId: abdou,
    name: 'OpenPay Africa',
    slug: 'openpay-africa',
    description: 'Paiements',
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
  ids = { abdou, moussa, repositoryId }
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
        'X-GitHub-Delivery': `event-${++counter}`,
        'X-Hub-Signature-256': await sign(body),
      },
      body,
    }),
  )
  assertEquals(res.status, 202)
  processDeliveries()
}

const count = (type: EntryTypeName) =>
  (db.prepare('SELECT count(*) n FROM entry WHERE type = ?').get(
    entries[type],
  ) as { n: number }).n

const lastEntry = (type: EntryTypeName) =>
  db.prepare(
    `SELECT userId, pullRequestId, data FROM entry WHERE type = ?
    ORDER BY id DESC LIMIT 1`,
  ).get(entries[type]) as {
    userId: number | null
    pullRequestId: number | null
    data: string | null
  }

const failedDeliveries = () =>
  db.prepare(`SELECT count(*) n FROM webhookDelivery WHERE status != 'done'`)
    .get()

const pull = (number: number, extra: Record<string, unknown> = {}) => ({
  id: 8000 + number,
  number,
  title: `PR ${number}`,
  state: 'open',
  user: ABDOU,
  head: { ref: `feat/${number}`, sha: 'abc' },
  merged_at: null,
  html_url: `https://github.com/abdou/openpay-africa/pull/${number}`,
  additions: 120,
  deletions: 8,
  created_at: '2026-10-15T10:00:00Z',
  updated_at: '2026-10-15T10:00:00Z',
  ...extra,
})

Deno.test('events: a PR opened, merged, closed', async () => {
  setup()
  await deliver('pull_request', { action: 'opened', pull_request: pull(81) })
  assertEquals(count('PR_OPENED'), 1)
  assertEquals(
    db.prepare('SELECT state, additions, branch FROM pullRequest').get(),
    { state: 'open', additions: 120, branch: 'feat/81' },
  )

  await deliver('pull_request', {
    action: 'closed',
    pull_request: pull(81, {
      state: 'closed',
      merged_at: '2026-10-16T09:00:00Z',
    }),
  })
  assertEquals(count('PR_MERGED'), 1)
  assertEquals(
    db.prepare(`SELECT p.state, o.authorIsOwner, r.rulesVersion
      FROM pullRequest p, entryAuthorIsOwner o, entryRulesVersion r
      WHERE p.number = 81`).get(),
    { state: 'merged', authorIsOwner: 1, rulesVersion: 1 },
  )

  await deliver('pull_request', {
    action: 'closed',
    pull_request: pull(82, { state: 'closed', user: STRANGER }),
  })
  assertEquals(count('PR_CLOSED'), 1)
  // An author not on Pamoja: no developer on the entry
  assertEquals(lastEntry('PR_CLOSED').userId, null)
  assertEquals(failedDeliveries(), { n: 0 })
})

Deno.test('events: a review by a developer of Pamoja', async () => {
  setup()
  await deliver('pull_request_review', {
    action: 'submitted',
    pull_request: pull(81),
    review: {
      id: 555,
      user: MOUSSA,
      state: 'APPROVED',
      body: 'La transaction est bien isolée.',
      submitted_at: '2026-10-16T10:00:00Z',
    },
  })
  assertEquals(
    db.prepare(`SELECT githubReviewId, reviewerUserId, state, commentCount
      FROM review`).get(),
    {
      githubReviewId: 555,
      reviewerUserId: ids.moussa,
      state: 'approved',
      commentCount: 1,
    },
  )
  assertEquals(count('PR_REVIEWED'), 1)
  assertEquals(lastEntry('PR_REVIEWED').userId, ids.moussa)
})

Deno.test('events: issues opened and closed; comments counted', async () => {
  setup()
  const issue = (extra: Record<string, unknown> = {}) => ({
    id: 9044,
    number: 44,
    title: 'Verrou SQLite',
    state: 'open',
    labels: [{ name: 'bug' }],
    user: STRANGER,
    comments: 0,
    created_at: '2026-10-15T10:00:00Z',
    updated_at: '2026-10-15T10:00:00Z',
    ...extra,
  })
  await deliver('issues', { action: 'opened', issue: issue() })
  await deliver('issues', { action: 'labeled', issue: issue() })
  await deliver('issue_comment', {
    action: 'created',
    issue: issue({ comments: 3 }),
  })
  // A comment on a PR is not an issue
  await deliver('issue_comment', {
    action: 'created',
    issue: issue({ number: 81, pull_request: {} }),
  })
  await deliver('issues', {
    action: 'closed',
    issue: issue({ state: 'closed', comments: 3 }),
  })
  assertEquals(count('ISSUE_UPDATED'), 2)
  assertEquals(db.prepare('SELECT number, state, comments FROM issue').all(), [
    { number: 44, state: 'closed', comments: 3 },
  ])
})

Deno.test('events: a release, a proof for the owner', async () => {
  setup()
  await deliver('release', {
    action: 'published',
    release: {
      tag_name: 'v0.4',
      html_url: 'https://github.com/abdou/openpay-africa/releases/v0.4',
      published_at: '2026-10-16T08:00:00Z',
    },
  })
  assertEquals(count('RELEASE_PUBLISHED'), 1)
  assertEquals(lastEntry('RELEASE_PUBLISHED').userId, ids.abdou)
  assertEquals(
    db.prepare(`SELECT json_extract(stats, '$.release.tag') tag
      FROM repository`).get(),
    { tag: 'v0.4' },
  )
})

Deno.test('events: pushes grouped, a deleted branch ignored', async () => {
  setup()
  await deliver('push', {
    ref: 'refs/heads/main',
    sender: ABDOU,
    commits: ['Un', 'Deux', 'Trois\n\ndétails'].map((message) => ({ message })),
  })
  await deliver('push', { ref: 'refs/heads/old', sender: ABDOU, commits: [] })
  assertEquals(count('COMMITS_PUSHED'), 1)
  const data = JSON.parse(lastEntry('COMMITS_PUSHED').data!)
  assertEquals(data, {
    branch: 'main',
    count: 3,
    messages: ['Un', 'Deux', 'Trois'],
  })
})

Deno.test('events: CI failed, then fixed, on the main branch', async () => {
  setup()
  let run = 0
  const workflow = (conclusion: string, branch = 'main') => ({
    action: 'completed',
    workflow_run: {
      id: ++run,
      name: 'test',
      head_sha: `sha${run}`,
      head_branch: branch,
      conclusion,
      html_url: `https://github.com/abdou/openpay-africa/actions/runs/${run}`,
      updated_at: `2026-10-16T10:0${run}:00Z`,
      pull_requests: [],
    },
  })
  await deliver('workflow_run', workflow('failure'))
  await deliver('workflow_run', workflow('success'))
  await deliver('workflow_run', workflow('success'))
  // A branch without an open PR is noise
  await deliver('workflow_run', workflow('failure', 'experiment'))
  assertEquals([count('CI_FAILED'), count('CI_FIXED')], [1, 1])
  assertEquals(db.prepare('SELECT count(*) n FROM ciRun').get(), { n: 4 })

  // GitHub Actions also report check runs: counted once, by workflow_run
  await deliver('check_run', {
    action: 'completed',
    check_run: {
      id: 77,
      name: 'test',
      head_sha: 'sha9',
      conclusion: 'failure',
      html_url: '',
      completed_at: '2026-10-16T11:00:00Z',
      app: { slug: 'github-actions' },
      check_suite: { head_branch: 'main' },
      pull_requests: [],
    },
  })
  // Another tool, through the statuses
  await deliver('status', {
    id: 66,
    sha: 'sha10',
    state: 'failure',
    context: 'ci/circleci',
    target_url: 'https://circleci.com/x',
    branches: [{ name: 'main' }],
    updated_at: '2026-10-16T11:30:00Z',
  })
  assertEquals(count('CI_FAILED'), 2)
})

Deno.test('events: CI on the branch of an open PR', async () => {
  setup()
  await deliver('pull_request', { action: 'opened', pull_request: pull(81) })
  await deliver('workflow_run', {
    action: 'completed',
    workflow_run: {
      id: 1,
      name: 'test',
      head_sha: 'abc',
      head_branch: 'feat/81',
      conclusion: 'failure',
      html_url: '',
      updated_at: '2026-10-16T10:00:00Z',
      pull_requests: [{ number: 81 }],
    },
  })
  assertEquals(count('CI_FAILED'), 1)
  assertEquals(lastEntry('CI_FAILED').pullRequestId !== null, true)
})

Deno.test('events: installations turn repos live, and back', async () => {
  setup()
  const syncMode = () =>
    (db.prepare('SELECT syncMode FROM repository').get() as {
      syncMode: string
    }).syncMode
  const installation = {
    id: 99,
    account: { id: ABDOU.id, login: 'abdou', type: 'User' },
  }
  await deliver('installation_repositories', {
    action: 'added',
    installation,
    repositories_added: [{ id: REPO.id }],
    repositories_removed: [],
  })
  assertEquals(syncMode(), 'live')
  await deliver('installation', { action: 'deleted', installation })
  assertEquals(syncMode(), 'poll')

  // Someone else's account covering the repo proves nothing (§5.4)
  await deliver('installation', {
    action: 'created',
    installation: { ...installation, account: { ...STRANGER, type: 'User' } },
    repositories: [{ id: REPO.id }],
  })
  assertEquals(syncMode(), 'poll')
})

Deno.test('events: a repo not on Pamoja is ignored', async () => {
  setup()
  const body = { action: 'opened', pull_request: pull(1) }
  await deliver('pull_request', {
    ...body,
    repository: { id: 1, full_name: 'x/y' },
  })
  assertEquals(db.prepare('SELECT count(*) n FROM pullRequest').get(), { n: 0 })
  assertEquals(failedDeliveries(), { n: 0 })
})
