import { sql } from '@01edu/db'
import { now } from '@01edu/time'
import { Entry, maybe } from '/api/entries.ts'
import { github, seconds } from '/api/github.ts'
import { log } from '/api/lib/log.ts'
import { Repository } from '/api/schema.ts'

// The refresh of the poll mode (§5.4): every 15 minutes, conditional reads of
// each repo, its issues and its PRs. A 304 does not count in the quota and
// changes nothing; the live mode (webhooks, PAM-204) skips this.

export type GithubRepo = {
  id: number
  name: string
  full_name: string
  description: string | null
  fork: boolean
  private: boolean
  owner: { login: string; type: 'User' | 'Organization' }
  default_branch: string
  language: string | null
  stargazers_count: number
  forks_count: number
  open_issues_count: number
  topics?: string[]
  pushed_at: string | null
}

export type GithubIssue = {
  id: number
  number: number
  title: string
  state: 'open' | 'closed'
  labels: ({ name: string } | string)[]
  user: { id: number; login: string } | null
  comments: number
  created_at: string
  updated_at: string
  pull_request?: unknown
}

export type GithubPull = {
  id: number
  number: number
  title: string
  state: 'open' | 'closed'
  user: { id: number; login: string } | null
  head: { ref: string }
  merged_at: string | null
  created_at: string
  updated_at: string
}

const writeIssue = sql<undefined, Record<string, string | number | null>>`
  INSERT INTO issue (repositoryId, githubId, number, title, state, labels,
    authorGithubId, authorLogin, comments, source, createdAt, updatedAt)
  VALUES (:repositoryId, :githubId, :number, :title, :state, :labels,
    :authorGithubId, :authorLogin, :comments, 'github', :createdAt, :updatedAt)
  ON CONFLICT (repositoryId, number) DO UPDATE SET
    title = excluded.title,
    state = excluded.state,
    labels = excluded.labels,
    comments = excluded.comments,
    updatedAt = excluded.updatedAt
`.run

export const upsertIssue = (repositoryId: number, issue: GithubIssue) =>
  writeIssue({
    repositoryId,
    githubId: issue.id,
    number: issue.number,
    title: issue.title,
    state: issue.state,
    labels: JSON.stringify(
      issue.labels.map((label) =>
        typeof label === 'string' ? label : label.name
      ),
    ),
    authorGithubId: issue.user?.id ?? 0,
    authorLogin: issue.user?.login ?? null,
    comments: issue.comments,
    createdAt: seconds(issue.created_at),
    updatedAt: seconds(issue.updated_at),
  })

const writePull = sql<undefined, Record<string, string | number | null>>`
  INSERT INTO pullRequest (repositoryId, githubId, number, title, state,
    authorGithubId, authorLogin, branch, additions, deletions, mergedAt,
    source, createdAt, updatedAt)
  VALUES (:repositoryId, :githubId, :number, :title, :state, :authorGithubId,
    :authorLogin, :branch, 0, 0, :mergedAt, 'github', :createdAt, :updatedAt)
  ON CONFLICT (repositoryId, number) DO UPDATE SET
    title = excluded.title,
    state = excluded.state,
    branch = excluded.branch,
    mergedAt = excluded.mergedAt,
    updatedAt = excluded.updatedAt
`.run

/** A merged PR is `merged`, not `closed`: GitHub says it with merged_at */
export const upsertPullRequest = (repositoryId: number, pull: GithubPull) =>
  writePull({
    repositoryId,
    githubId: pull.id,
    number: pull.number,
    title: pull.title,
    state: pull.merged_at ? 'merged' : pull.state,
    authorGithubId: pull.user?.id ?? 0,
    authorLogin: pull.user?.login ?? null,
    branch: pull.head.ref,
    mergedAt: seconds(pull.merged_at),
    createdAt: seconds(pull.created_at),
    updatedAt: seconds(pull.updated_at),
  })

const writeRepository = sql<undefined, Record<string, string | number | null>>`
  UPDATE repository SET
    etag = :etag,
    stats = coalesce(:stats, stats),
    lastSyncedAt = :lastSyncedAt
  WHERE repositoryId = :repositoryId
`.run

type Stats = Record<string, unknown>

// A JSON column comes back as its text: decode it
const json = <T>(value: unknown, fallback: T): T =>
  typeof value === 'string' ? JSON.parse(value) as T : (value as T) ?? fallback

/**
 * One conditional pass over a repo. Returns true when GitHub had news: the
 * project then gets a PROJECT_UPDATED entry, so open pages refetch (§13).
 */
export const refreshRepository = async (repositoryId: number) => {
  const repository = Repository.get(repositoryId)
  if (!repository) return false
  const etags = json<Record<string, string>>(repository.etag, {})
  const path = `/repos/${repository.fullName}`
  const issuesPath = `${path}/issues?state=all&sort=updated&per_page=100`
  const pullsPath = `${path}/pulls?state=all&sort=updated&per_page=100`

  const [repo, issues, pulls] = await Promise.all([
    github<GithubRepo>(path, { etag: etags[path] }),
    github<GithubIssue[]>(issuesPath, { etag: etags[issuesPath] }),
    github<GithubPull[]>(pullsPath, { etag: etags[pullsPath] }),
  ])

  let stats: Stats | null = null
  if (repo.status === 200) {
    etags[path] = repo.etag ?? ''
    stats = {
      ...json<Stats>(repository.stats, {}),
      stars: repo.data.stargazers_count,
      forks: repo.data.forks_count,
      topics: repo.data.topics ?? [],
      pushedAt: seconds(repo.data.pushed_at),
    }
  }
  if (issues.status === 200) {
    etags[issuesPath] = issues.etag ?? ''
    for (const issue of issues.data) {
      issue.pull_request || upsertIssue(repositoryId, issue)
    }
  }
  if (pulls.status === 200) {
    etags[pullsPath] = pulls.etag ?? ''
    for (const pull of pulls.data) upsertPullRequest(repositoryId, pull)
  }
  writeRepository({
    repositoryId,
    etag: JSON.stringify(etags),
    stats: stats && JSON.stringify(stats),
    lastSyncedAt: now(),
  })

  const changed = [repo, issues, pulls].some((answer) => answer.status === 200)
  if (changed) {
    // GitHub changed it, not a developer of Pamoja
    Entry.insert.PROJECT_UPDATED({
      projectId: repository.projectId,
      userId: maybe(null),
      source: 'github',
    })
  }
  return changed
}

const listPolled = sql<{ repositoryId: number }, undefined>`
  SELECT repositoryId FROM repository WHERE syncMode = 'poll'
`.all

export const REFRESH_EVERY = 15 * 60 * 1000

/** Refreshes every polled repo, one after the other, never failing the loop */
export const refreshAll = async () => {
  for (const { repositoryId } of listPolled()) {
    try {
      await refreshRepository(repositoryId)
    } catch (err) {
      log.warn('github-refresh-error', {
        repositoryId,
        message: err instanceof Error ? err.message : String(err),
      })
    }
  }
}

/** Started by the server, every 15 minutes (§5.4) */
export const startRefresh = () => setInterval(refreshAll, REFRESH_EVERY)
