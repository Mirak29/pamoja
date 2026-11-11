import { assertEquals } from 'jsr:@std/assert@^1.0.13'
import { makeRestorePoint } from '@01edu/db'
import { now } from '@01edu/time'
import { Entry, maybe } from '/api/entries.ts'
import {
  Follow,
  Issue,
  Profile,
  Project,
  ProjectMember,
  PullRequest,
  Repository,
  Review,
  User,
} from '/api/schema.ts'
import { createSession } from '/api/session.ts'
import { request } from '/api/testing.ts'
import { flagStaleReviews } from '/api/tracking.ts'

// #suivi: the alerts GitHub produced, their threads, the stale PRs (PAM-411)
const restore = makeRestorePoint()
const DAY = 24 * 3600

let lastGithubId = 0
const dev = async (login: string) => {
  const at = now()
  const userId = User.insert({
    githubId: ++lastGithubId,
    githubUsername: login,
    avatarUrl: '',
    source: 'github',
    createdAt: at,
    updatedAt: at,
  })
  Profile.insert({
    userId,
    displayName: login,
    theme: 'minimal',
    accent: 'indigo',
    availability: 'available',
    matchingMode: 'instant',
    createdAt: at,
    updatedAt: at,
  })
  const cookie = `session=${await createSession(userId, 'demo')}`
  const call = async (path: string, body?: unknown) => {
    const res = await request(path, { body, cookie })
    return { status: res.status, json: await res.json().catch(() => null) }
  }
  return { userId, call }
}

// Abdou owns the project, Fatou contributes, Awa follows, Yao is a stranger
const setup = async () => {
  const [abdou, fatou, awa, yao] = await Promise.all(
    ['abdou', 'fatou', 'awa', 'yao'].map(dev),
  )
  const at = now()
  const projectId = Project.insert({
    ownerId: abdou.userId,
    name: 'OpenPay Africa',
    slug: 'openpay-africa',
    description: '',
    visibility: 'public',
    status: 'beta',
    source: 'demo',
    createdAt: at,
    updatedAt: at,
  })
  for (
    const [who, role] of [[abdou, 'owner'], [fatou, 'contributor']] as const
  ) {
    ProjectMember.insert({ projectId, userId: who.userId, role, joinedAt: at })
  }
  Follow.insert({
    followerId: awa.userId,
    targetType: 'project',
    targetId: projectId,
    createdAt: at,
  })
  const repositoryId = Repository.insert({
    projectId,
    githubId: 10,
    owner: 'abdou',
    name: 'openpay-africa',
    fullName: 'abdou/openpay-africa',
    defaultBranch: 'main',
    syncMode: 'live',
    source: 'github',
  })
  return { abdou, fatou, awa, yao, at, projectId, repositoryId }
}

let number = 80
const pull = (repositoryId: number, created: number) =>
  PullRequest.insert({
    repositoryId,
    githubId: 100 + ++number,
    number,
    title: 'Payment transaction handling',
    state: 'open',
    authorGithubId: 1,
    authorLogin: 'abdou',
    additions: 1,
    deletions: 1,
    source: 'github',
    createdAt: created,
    updatedAt: created,
  })

const project = 'openpay-africa'

Deno.test('suivi: the alerts of GitHub, newest first, with their facts', async () => {
  restore()
  const { abdou, fatou, awa, yao, at, projectId, repositoryId } = await setup()
  const pullRequestId = pull(repositoryId, at)
  const issueId = Issue.insert({
    repositoryId,
    githubId: 500,
    number: 44,
    title: 'Verrou SQLite',
    state: 'closed',
    labels: [],
    authorGithubId: 1,
    source: 'github',
    createdAt: at,
    updatedAt: at,
  })
  const source = 'github'
  Entry.insert.PR_OPENED({
    userId: abdou.userId,
    projectId,
    pullRequestId,
    source,
  })
  Entry.insert.PR_REVIEWED({
    userId: fatou.userId,
    projectId,
    pullRequestId,
    data: { githubReviewId: 1, state: 'changes_requested' },
    source,
  })
  Entry.insert.CI_FAILED({
    userId: maybe(null),
    projectId,
    pullRequestId,
    data: { ciRunId: 1, name: 'test (go 1.22)', branch: 'feat/pay', url: '' },
    source,
  })
  Entry.insert.COMMITS_PUSHED({
    userId: abdou.userId,
    projectId,
    pullRequestId: maybe(null),
    data: { branch: 'main', count: 3, messages: ['a', 'b', 'c'] },
    source,
  })
  // A label changed: not an alert
  for (const action of ['labeled', 'closed']) {
    Entry.insert.ISSUE_UPDATED({
      userId: maybe(null),
      projectId,
      issueId,
      data: { action },
      source,
    })
  }
  const { status, json } = await fatou.call(
    `/api/project/tracking?project=${project}`,
  )
  assertEquals(status, 200)
  assertEquals(
    json.map((
      a: Record<string, unknown>,
    ) => [a.kind, a.pullRequest || a.issue]),
    [
      ['ISSUE_UPDATED', 44],
      ['COMMITS_PUSHED', 0],
      ['CI_FAILED', 81],
      ['PR_REVIEWED', 81],
      ['PR_OPENED', 81],
    ],
  )
  const [issue, push, ci, review, opened] = json
  assertEquals([issue.state, issue.title], ['closed', 'Verrou SQLite'])
  assertEquals([push.branch, push.count, push.commits.length], ['main', 3, 3])
  assertEquals([ci.name, ci.branch], ['test (go 1.22)', 'feat/pay'])
  assertEquals([review.state, review.actor], ['changes_requested', 'fatou'])
  assertEquals([opened.author, opened.title], [
    'abdou',
    'Payment transaction handling',
  ])
  // Followers read #suivi; a stranger does not
  assertEquals(
    (await awa.call(`/api/project/tracking?project=${project}`)).status,
    200,
  )
  assertEquals(
    (await yao.call(`/api/project/tracking?project=${project}`)).status,
    403,
  )
})

Deno.test('suivi: members answer an alert in its thread', async () => {
  restore()
  const { abdou, fatou, awa, at, projectId, repositoryId } = await setup()
  const pullRequestId = pull(repositoryId, at)
  const alert = Entry.insert.PR_OPENED({
    userId: abdou.userId,
    projectId,
    pullRequestId,
    source: 'github',
  })
  const answer = (who: typeof abdou, body: Record<string, unknown>) =>
    who.call('/api/project/message/create', {
      project,
      channel: 'tracking',
      body: 'Je regarde le rollback ce soir.',
      ...body,
    })
  const sent = await answer(fatou, { alert })
  assertEquals(sent.status, 200)
  assertEquals(sent.json.alert, alert)
  // A follower reads, never writes; #suivi itself is never written
  assertEquals((await answer(awa, { alert })).status, 403)
  assertEquals((await answer(fatou, {})).status, 400)
  // Only an alert of this project
  const other = Entry.insert.PROJECT_MEMBER_JOINED({
    userId: fatou.userId,
    projectId,
    source: 'demo',
  })
  assertEquals((await answer(fatou, { alert: other })).status, 403)
  const [shown] = (await abdou.call(`/api/project/tracking?project=${project}`))
    .json
  assertEquals(shown.replies.map((r: { author: string }) => r.author), [
    'fatou',
  ])
  // The answer stays in its thread, out of the channels
  assertEquals(
    (await abdou.call(`/api/project/messages?project=${project}`)).json,
    [],
  )
})

Deno.test('suivi: a PR without a review for 2 days, said once', async () => {
  restore()
  const { at, repositoryId } = await setup()
  pull(repositoryId, at - 3 * DAY)
  const reviewed = pull(repositoryId, at - 3 * DAY)
  Review.insert({
    pullRequestId: reviewed,
    githubReviewId: 9,
    reviewerGithubId: 2,
    state: 'approved',
    commentCount: 0,
    submittedAt: at - DAY,
    source: 'github',
  })
  pull(repositoryId, at - DAY)
  assertEquals(flagStaleReviews(at), 1)
  assertEquals(flagStaleReviews(at), 0)
})
