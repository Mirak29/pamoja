import { sql } from '@01edu/db'
import { now } from '@01edu/time'
import { Entry, maybe } from '/api/entries.ts'
import { seconds } from '/api/github.ts'
import { scheduleSkillsRead } from '/api/pull-skills.ts'
import { evaluateBadges, evaluateProject } from '/api/badges.ts'
import { markPullRequestDone } from '/api/board.ts'
import { RULES_VERSION } from '/api/reputation.ts'
import {
  type GithubReview,
  scheduleCommentCount,
  upsertReview,
  verifyReviews,
} from '/api/review-check.ts'
import {
  type GithubIssue,
  type GithubPull,
  upsertIssue,
  upsertPullRequest,
} from '/api/sync.ts'
import { recordInstallation, setSyncMode } from '/api/installation.ts'
import { userIdOfGithubId } from '/api/user.ts'
import { registerHandler } from '/api/webhooks.ts'

// What each GitHub event changes in Pamoja (§5.5, §6.8, §14.2): the tables
// first, then the entries #suivi shows. A handler runs in the transaction of
// its delivery: synchronous, no call to GitHub, idempotent (§5.5).

type Payload = Record<string, unknown>
type GithubUser = { id: number; login: string }

const source = 'github'

/*
 * Lookups
 */

type RepoRow = {
  repositoryId: number
  projectId: number
  fullName: string
  defaultBranch: string
  ownerId: number
  ownerGithubId: number
}

const getRepo = sql<RepoRow, number>`
  SELECT repositoryId, repository.projectId, fullName, defaultBranch,
    project.ownerId, owner.githubId AS ownerGithubId
  FROM repository
  JOIN project ON project.projectId = repository.projectId
  JOIN user owner ON owner.userId = project.ownerId
  WHERE repository.githubId = ?
`.get

/** The Pamoja repo of an event; an event of another repo is ignored */
const repoOf = (payload: Payload) => {
  const repository = payload.repository as { id?: number } | undefined
  return repository?.id ? getRepo(repository.id) : undefined
}

/** The developer of a GitHub account, when they are on Pamoja */
const userOf = (user: GithubUser | null | undefined) =>
  user ? userIdOfGithubId(user.id) : undefined

const getPullRequestId = sql<
  { pullRequestId: number },
  { repositoryId: number; number: number }
>`
  SELECT pullRequestId FROM pullRequest
  WHERE repositoryId = :repositoryId AND number = :number
`.get

const pullRequestOf = (repositoryId: number, number: number | undefined) =>
  number ? getPullRequestId({ repositoryId, number })?.pullRequestId : undefined

/*
 * Pull requests, reviews, issues, releases, pushes
 */

registerHandler('pull_request', (payload) => {
  const repo = repoOf(payload)
  if (!repo) return
  const action = payload.action as string
  const pull = payload.pull_request as GithubPull & {
    user: GithubUser
    html_url: string
  }
  upsertPullRequest(repo.repositoryId, pull)
  // Its files are read once the delivery is committed, never here (§5.5)
  scheduleSkillsRead()
  const pullRequestId = pullRequestOf(repo.repositoryId, pull.number)!
  const userId = maybe(userOf(pull.user))
  const relations = { userId, projectId: repo.projectId, pullRequestId, source }

  if (action === 'opened' || action === 'reopened') {
    Entry.insert.PR_OPENED(relations)
  } else if (action === 'closed' && pull.merged_at) {
    // A proof: Open Source when the author does not own the project,
    // Project Building on their own projects (§8.1); its fields are frozen
    Entry.insert.PR_MERGED({
      ...relations,
      repository: repo.fullName,
      prNumber: pull.number,
      url: pull.html_url,
      authorGithubId: pull.user.id,
      authorIsOwner: pull.user.id === repo.ownerGithubId ? 1 : 0,
      eligible: 1,
      exclusionReason: '',
      rulesVersion: RULES_VERSION,
    })
    // Its author's Open Source, the Builder of the project (§8.2)
    const author = userOf(pull.user)
    author && evaluateBadges(author)
    evaluateProject(repo.projectId)
    // A merged pull request moves its card to Done (§6.7)
    markPullRequestDone(pullRequestId, userId)
  } else if (action === 'closed') {
    Entry.insert.PR_CLOSED(relations)
  } else if (
    ['edited', 'ready_for_review', 'converted_to_draft'].includes(action)
  ) {
    Entry.insert.PR_UPDATED(relations)
  }
  // synchronize and the others: the table is up to date, #suivi shows pushes
})

registerHandler('pull_request_review', (payload) => {
  const repo = repoOf(payload)
  if (!repo) return
  const pull = payload.pull_request as GithubPull
  const review = payload.review as GithubReview
  upsertPullRequest(repo.repositoryId, pull)
  const pullRequestId = pullRequestOf(repo.repositoryId, pull.number)!
  const reviewerUserId = upsertReview(pullRequestId, review)
  // A bot read it (§7.5): the PR still waits for a developer
  if (reviewerUserId === false) return
  if (payload.action === 'submitted') {
    Entry.insert.PR_REVIEWED({
      userId: maybe(reviewerUserId),
      projectId: repo.projectId,
      pullRequestId,
      data: { githubReviewId: review.id, state: review.state.toLowerCase() },
      source,
    })
  }
  // Does it validate a help request on this PR? (§7.5) A « commented »
  // review without a body gets its inline comments counted after the
  // transaction, then is checked again
  verifyReviews(pullRequestId)
  scheduleCommentCount(pullRequestId)
})

registerHandler('issues', (payload) => {
  const repo = repoOf(payload)
  if (!repo) return
  const issue = payload.issue as GithubIssue & { user: GithubUser }
  upsertIssue(repo.repositoryId, issue)
  // #suivi shows an issue opened or closed (§6.8)
  if (!['opened', 'closed', 'reopened'].includes(payload.action as string)) {
    return
  }
  const issueId = getIssueId({
    repositoryId: repo.repositoryId,
    number: issue.number,
  })!.issueId
  Entry.insert.ISSUE_UPDATED({
    userId: maybe(userOf(issue.user)),
    projectId: repo.projectId,
    issueId,
    data: { action: payload.action },
    source,
  })
})

const getIssueId = sql<
  { issueId: number },
  { repositoryId: number; number: number }
>`
  SELECT issueId FROM issue
  WHERE repositoryId = :repositoryId AND number = :number
`.get

// A comment changes the count shown; the comments of a PR are not issues
registerHandler('issue_comment', (payload) => {
  const repo = repoOf(payload)
  const issue = payload.issue as GithubIssue
  if (!repo || issue.pull_request) return
  upsertIssue(repo.repositoryId, issue)
})

const writeRelease = sql<undefined, Record<string, string | number | null>>`
  UPDATE repository
  SET stats = json_set(coalesce(stats, '{}'), '$.release',
    json_object('tag', :tag, 'at', :at))
  WHERE repositoryId = :repositoryId
`.run

registerHandler('release', (payload) => {
  const repo = repoOf(payload)
  if (!repo || payload.action !== 'published') return
  const release = payload.release as {
    tag_name: string
    html_url: string
    published_at: string | null
  }
  writeRelease({
    repositoryId: repo.repositoryId,
    tag: release.tag_name,
    at: seconds(release.published_at) ?? now(),
  })
  // A proof of Project Building for the owner of the project (§8.1)
  Entry.insert.RELEASE_PUBLISHED({
    userId: repo.ownerId,
    projectId: repo.projectId,
    repository: repo.fullName,
    url: release.html_url,
    tag: release.tag_name,
    eligible: 1,
    exclusionReason: '',
    rulesVersion: RULES_VERSION,
    source,
  })
  evaluateProject(repo.projectId)
})

registerHandler('push', (payload) => {
  const repo = repoOf(payload)
  const commits = (payload.commits ?? []) as { message: string }[]
  // A deleted branch pushes no commit
  if (!repo || !commits.length) return
  const branch = (payload.ref as string).replace('refs/heads/', '')
  // Grouped in one alert: « 3 commits sur main » (§6.8)
  Entry.insert.COMMITS_PUSHED({
    userId: maybe(userOf(payload.sender as GithubUser)),
    projectId: repo.projectId,
    pullRequestId: maybe(pullRequestOnBranch(repo.repositoryId, branch)),
    data: {
      branch,
      count: commits.length,
      messages: commits.slice(-3).map((c) => c.message.split('\n')[0]),
    },
    source,
  })
  // An active month for the Maintainer badge (§8.2)
  evaluateProject(repo.projectId)
})

const getOpenPullOnBranch = sql<
  { pullRequestId: number },
  { repositoryId: number; branch: string }
>`
  SELECT pullRequestId FROM pullRequest
  WHERE repositoryId = :repositoryId AND branch = :branch AND state = 'open'
  ORDER BY number DESC LIMIT 1
`.get

const pullRequestOnBranch = (repositoryId: number, branch: string) =>
  getOpenPullOnBranch({ repositoryId, branch })?.pullRequestId

/*
 * CI: GitHub Actions (workflow_run), other tools (check_run, status)
 */

type CiRunInput = {
  githubId: number
  source: 'actions' | 'checks' | 'status'
  name: string
  headSha: string
  branch: string
  prNumber?: number
  conclusion: string | null
  url: string
  completedAt: number | null
}

const writeCiRun = sql<undefined, Record<string, string | number | null>>`
  INSERT INTO ciRun (repositoryId, githubId, source, name, headSha, branch,
    pullRequestId, conclusion, url, completedAt)
  VALUES (:repositoryId, :githubId, :source, :name, :headSha, :branch,
    :pullRequestId, :conclusion, :url, :completedAt)
  ON CONFLICT (repositoryId, source, githubId) DO UPDATE SET
    conclusion = excluded.conclusion,
    completedAt = excluded.completedAt,
    pullRequestId = coalesce(excluded.pullRequestId, pullRequestId)
`.run

const getCiRunId = sql<
  { ciRunId: number },
  { repositoryId: number; source: string; githubId: number }
>`
  SELECT ciRunId FROM ciRun
  WHERE repositoryId = :repositoryId AND source = :source
    AND githubId = :githubId
`.get

// The last completed run of the same job on the same branch, before this one
const getPreviousConclusion = sql<
  { conclusion: string | null },
  Record<string, string | number>
>`
  SELECT conclusion FROM ciRun
  WHERE repositoryId = :repositoryId AND source = :source AND name = :name
    AND branch = :branch AND githubId != :githubId
    AND completedAt IS NOT NULL
  ORDER BY completedAt DESC LIMIT 1
`.get

const failures = ['failure', 'timed_out', 'error', 'startup_failure']

/**
 * Keeps a CI run; a completed one may alert #suivi: CI_FAILED, and CI_FIXED
 * when the same job passes again on the same branch (§6.8). Only on the
 * main branch and on the branches of open PRs: other branches are noise.
 */
const recordCiRun = (repo: RepoRow, run: CiRunInput) => {
  const pullRequestId = pullRequestOf(repo.repositoryId, run.prNumber) ??
    pullRequestOnBranch(repo.repositoryId, run.branch)
  const key = {
    repositoryId: repo.repositoryId,
    source: run.source,
    name: run.name,
    branch: run.branch,
    githubId: run.githubId,
  }
  const previous = getPreviousConclusion(key)?.conclusion
  writeCiRun({
    repositoryId: repo.repositoryId,
    githubId: run.githubId,
    source: run.source,
    name: run.name,
    headSha: run.headSha,
    branch: run.branch,
    pullRequestId: pullRequestId ?? null,
    conclusion: run.conclusion,
    url: run.url,
    completedAt: run.completedAt,
  })
  if (!run.conclusion) return
  if (run.branch !== repo.defaultBranch && !pullRequestId) return

  const failed = failures.includes(run.conclusion)
  const fixed = run.conclusion === 'success' &&
    !!previous && failures.includes(previous)
  if (!failed && !fixed) return
  const ciRunId = getCiRunId({
    repositoryId: repo.repositoryId,
    source: run.source,
    githubId: run.githubId,
  })!.ciRunId
  const relations = {
    userId: maybe(null),
    projectId: repo.projectId,
    pullRequestId: maybe(pullRequestId),
    data: { ciRunId, name: run.name, branch: run.branch, url: run.url },
    source,
  }
  failed ? Entry.insert.CI_FAILED(relations) : Entry.insert.CI_FIXED(relations)
}

registerHandler('workflow_run', (payload) => {
  const repo = repoOf(payload)
  if (!repo || payload.action !== 'completed') return
  const run = payload.workflow_run as {
    id: number
    name: string
    head_sha: string
    head_branch: string
    conclusion: string | null
    html_url: string
    updated_at: string
    pull_requests: { number: number }[]
  }
  recordCiRun(repo, {
    githubId: run.id,
    source: 'actions',
    name: run.name,
    headSha: run.head_sha,
    branch: run.head_branch,
    prNumber: run.pull_requests[0]?.number,
    conclusion: run.conclusion,
    url: run.html_url,
    completedAt: seconds(run.updated_at),
  })
})

registerHandler('check_run', (payload) => {
  const repo = repoOf(payload)
  if (!repo || payload.action !== 'completed') return
  const check = payload.check_run as {
    id: number
    name: string
    head_sha: string
    conclusion: string | null
    html_url: string
    completed_at: string | null
    app?: { slug?: string }
    check_suite?: { head_branch?: string | null }
    pull_requests: { number: number }[]
  }
  // GitHub Actions also report check runs: workflow_run covers them
  if (check.app?.slug === 'github-actions') return
  recordCiRun(repo, {
    githubId: check.id,
    source: 'checks',
    name: check.name,
    headSha: check.head_sha,
    branch: check.check_suite?.head_branch ?? '',
    prNumber: check.pull_requests[0]?.number,
    conclusion: check.conclusion,
    url: check.html_url,
    completedAt: seconds(check.completed_at),
  })
})

registerHandler('status', (payload) => {
  const repo = repoOf(payload)
  if (!repo) return
  const state = payload.state as string
  // pending: not done yet
  if (state === 'pending') return
  recordCiRun(repo, {
    githubId: payload.id as number,
    source: 'status',
    name: payload.context as string,
    headSha: payload.sha as string,
    branch: (payload.branches as { name: string }[])[0]?.name ?? '',
    conclusion: state,
    url: (payload.target_url as string | null) ?? '',
    completedAt: seconds(payload.updated_at as string) ?? now(),
  })
})

/*
 * Installations (§5.4)
 */

type Installation = {
  id: number
  account: { id: number; login: string; type: 'User' | 'Organization' }
}

const listByInstallation = sql<
  { repositoryId: number; projectId: number },
  number
>`
  SELECT repositoryId, projectId FROM repository
  WHERE installationId = (
    SELECT installationId FROM githubInstallation WHERE githubInstallationId = ?
  )
`.all

const updated = (projectId: number) =>
  Entry.insert.PROJECT_UPDATED({ userId: maybe(null), projectId, source })

/**
 * Repos the app now covers. A personal repo goes live at once when its
 * owner also owns the project; any other repo still needs the three checks
 * of the installation flow (§5.4).
 */
const covered = (installation: Installation, repos: { id: number }[]) => {
  const installationId = recordInstallation({
    githubInstallationId: installation.id,
    accountLogin: installation.account.login,
    accountType: installation.account.type,
    installedByUserId: null,
  })
  if (installation.account.type !== 'User') return
  for (const { id } of repos) {
    const repo = getRepo(id)
    if (!repo || repo.ownerGithubId !== installation.account.id) continue
    setSyncMode({
      repositoryId: repo.repositoryId,
      syncMode: 'live',
      installationId,
    })
    updated(repo.projectId)
  }
}

/** Repos the app no longer covers go back to the 15 min refresh */
const uncovered = (repos: { repositoryId: number; projectId: number }[]) => {
  for (const repo of repos) {
    setSyncMode({
      repositoryId: repo.repositoryId,
      syncMode: 'poll',
      installationId: null,
    })
    updated(repo.projectId)
  }
}

registerHandler('installation', (payload) => {
  const installation = payload.installation as Installation
  const action = payload.action as string
  // unsuspend lists the repos it covers again, like created
  if (action === 'created' || action === 'unsuspend') {
    covered(installation, (payload.repositories ?? []) as { id: number }[])
  } else if (action === 'deleted' || action === 'suspend') {
    uncovered(listByInstallation(installation.id))
  }
})

registerHandler('installation_repositories', (payload) => {
  const installation = payload.installation as Installation
  covered(
    installation,
    (payload.repositories_added ?? []) as { id: number }[],
  )
  const removed = new Set(
    ((payload.repositories_removed ?? []) as { id: number }[]).map((r) => r.id),
  )
  uncovered(
    [...removed].map(getRepo).filter((repo): repo is RepoRow => !!repo),
  )
})
