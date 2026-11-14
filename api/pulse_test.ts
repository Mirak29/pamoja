import { assertEquals } from 'jsr:@std/assert@^1.0.13'
import { makeRestorePoint } from '@01edu/db'
import { now } from '@01edu/time'
import { Entry } from '/api/entries.ts'
import { pulseOf } from '/api/pulse.ts'
import {
  HelpRequest,
  Issue,
  Profile,
  Project,
  PullRequest,
  Repository,
  Review,
  User,
} from '/api/schema.ts'
import { createSession } from '/api/session.ts'
import { request } from '/api/testing.ts'

// The deterministic Pulse (PAM-306, §6.4)
const restore = makeRestorePoint()
const DAY = 24 * 3600

const project = () => {
  const at = now()
  const ownerId = User.insert({
    githubId: 1,
    githubUsername: 'abdou',
    avatarUrl: '',
    source: 'demo',
    createdAt: at,
    updatedAt: at,
  })
  Profile.insert({
    userId: ownerId,
    displayName: 'Abdou',
    theme: 'minimal',
    accent: 'indigo',
    availability: 'available',
    matchingMode: 'instant',
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
    // The latest release, read by the refresh 2 days ago
    stats: { release: { tag: 'v0.4', at: at - 2 * DAY } },
  })
  return { at, ownerId, projectId, repositoryId }
}

let number = 0
const pull = (
  repositoryId: number,
  state: string,
  updated: number,
  mergedAt: number | null = null,
) =>
  PullRequest.insert({
    repositoryId,
    githubId: 100 + ++number,
    number,
    title: `PR ${number}`,
    state,
    authorGithubId: 2,
    additions: 1,
    deletions: 1,
    mergedAt,
    source: 'github',
    createdAt: updated - DAY,
    updatedAt: updated,
  })

const issue = (repositoryId: number, state: string, updated: number) =>
  Issue.insert({
    repositoryId,
    githubId: 200 + ++number,
    number,
    title: `Issue ${number}`,
    state,
    labels: [],
    authorGithubId: 2,
    source: 'github',
    createdAt: updated - DAY,
    updatedAt: updated,
  })

Deno.test('pulse: the last 7 days, counted on GitHub and on Pamoja', () => {
  restore()
  const { at, ownerId, projectId, repositoryId } = project()
  // Merged this week, merged a month ago
  pull(repositoryId, 'closed', at - DAY, at - DAY)
  pull(repositoryId, 'closed', at - 2 * DAY, at - 2 * DAY)
  pull(repositoryId, 'closed', at - 30 * DAY, at - 30 * DAY)
  // Open: one waits for a review, one has one, one only a dismissed one
  pull(repositoryId, 'open', at)
  const reviewed = pull(repositoryId, 'open', at)
  const dismissed = pull(repositoryId, 'open', at)
  for (
    const [pullRequestId, state] of [[reviewed, 'approved'], [
      dismissed,
      'dismissed',
    ]] as const
  ) {
    Review.insert({
      pullRequestId,
      githubReviewId: 300 + pullRequestId,
      reviewerGithubId: 3,
      state,
      commentCount: 0,
      submittedAt: at,
      source: 'github',
    })
  }
  issue(repositoryId, 'closed', at - 3 * DAY)
  issue(repositoryId, 'closed', at - 20 * DAY)
  issue(repositoryId, 'open', at)
  Entry.insert.PROJECT_MEMBER_JOINED({
    userId: ownerId,
    projectId,
    source: 'demo',
  })
  for (const category of ['code_review', 'code_review', 'debugging']) {
    HelpRequest.insert({
      authorId: ownerId,
      projectId,
      category,
      title: 'Relire',
      description: '',
      skills: [],
      status: 'open',
      expiresAt: at + 7 * DAY,
      source: 'demo',
      createdAt: at,
      updatedAt: at,
    })
  }
  const pulse = pulseOf('openpay-africa', null, at)
  assertEquals(pulse, {
    since: at - 7 * DAY,
    merged: 2,
    issuesClosed: 1,
    newContributors: 1,
    reviewsAsked: 2,
    waitingReview: 2,
    releases: 1,
    summary: '',
    summaryAt: 0,
  })
  // Since a visit a day ago: what is older drops, waiting PRs stay
  const visit = pulseOf('openpay-africa', at - 1.5 * DAY, at)
  assertEquals(
    [visit.merged, visit.issuesClosed, visit.waitingReview, visit.releases],
    [1, 0, 2, 0],
  )
})

Deno.test('pulse: the period is kept in range, an unknown project is a 404', async () => {
  restore()
  const { at, ownerId } = project()
  assertEquals(pulseOf('openpay-africa', 0, at).since, at - 90 * DAY)
  assertEquals(pulseOf('openpay-africa', at + DAY, at).since, at)
  const cookie = `session=${await createSession(ownerId, 'demo')}`
  const read = await request('/api/project/pulse?project=openpay-africa', {
    cookie,
  })
  assertEquals(read.status, 200)
  assertEquals((await read.json()).releases, 1)
  const visit = await request(
    `/api/project/pulse?project=openpay-africa&since=${at - DAY}`,
    { cookie },
  )
  assertEquals((await visit.json()).since, at - DAY)
  const unknown = await request('/api/project/pulse?project=nope', { cookie })
  assertEquals(unknown.status, 404)
  await unknown.body?.cancel()
})
