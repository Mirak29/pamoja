import { sql } from '@01edu/db'
import { respond } from '@01edu/api/response'
import { after, readBatch, type Slice } from '/api/lib/cursor.ts'
import { readmeSummary } from '/api/lib/readme.ts'
import { galleryOf } from '/api/project-gallery.ts'
import { skillNamesOf } from '/api/skills.ts'

// The projects of the signed-in developer, as the web shows them until the
// project screens read the API themselves (PAM-401)

const parse = <T>(json: string | null, fallback: T): T =>
  json ? JSON.parse(json) as T : fallback

type ProjectRow = {
  projectId: number
  slug: string
  name: string
  description: string
  vision: string | null
  status: string
  skills: string | null
  demoVideoUrl: string | null
  createdAt: number
  ownerLogin: string
  repositoryId: number | null
  repoOwner: string | null
  repoName: string | null
  syncMode: string | null
  readme: string | null
  stats: string | null
  lastSyncedAt: number | null
}

const listMine = sql<ProjectRow, number>`
  SELECT project.projectId, slug, project.name, description, vision, status,
    project.skills, project.demoVideoUrl, project.createdAt, owner.githubUsername AS ownerLogin,
    repository.repositoryId, repository.owner AS repoOwner,
    repository.name AS repoName, syncMode,
    substr(readme, 1, 8000) AS readme, stats, lastSyncedAt
  FROM projectMember
  JOIN project ON project.projectId = projectMember.projectId
  JOIN user owner ON owner.userId = project.ownerId
  LEFT JOIN repository ON repository.projectId = project.projectId
  WHERE projectMember.userId = ?
  ORDER BY project.createdAt DESC
`.all

const listMembers = sql<{ login: string; role: string }, number>`
  SELECT githubUsername AS login, role FROM projectMember
  JOIN user ON user.userId = projectMember.userId
  WHERE projectId = ?
`.all

const listFollowers = sql<{ login: string }, number>`
  SELECT githubUsername AS login FROM follow
  JOIN user ON user.userId = follow.followerId
  WHERE targetType = 'project' AND targetId = ?
`.all

const listNeeds = sql<{ title: string }, number>`
  SELECT title FROM projectNeed WHERE projectId = ? AND status = 'open'
`.all

/*
 * Issues and PRs by batches of 20 (§12.7): the list of the projects carries
 * the first batch and the exact counts, the tabs of a project read the rest
 */

type Window = Slice & { repositoryId: number }

/** The label of the issues for a first contribution */
export const GOOD_FIRST_ISSUE = 'good first issue'

// The issue holds the label: its text is looked at before its JSON is read
export const isBeginner = `issue.labels LIKE '%${GOOD_FIRST_ISSUE}%'
  AND EXISTS (SELECT 1 FROM json_each(issue.labels)
    WHERE value = '${GOOD_FIRST_ISSUE}')`

type IssueRow = {
  number: number
  title: string
  state: string
  labels: string
  authorLogin: string | null
  comments: number | null
  createdAt: number
}

// The open issues, newest first, from the index (repositoryId, state, number);
// those for a first contribution apart, by batches of their own
const openIssues = (where: string) =>
  sql<IssueRow, { repositoryId: number; id: number; limit: number }>`
    SELECT number, title, state, labels, authorLogin, comments, createdAt
    FROM issue
    WHERE repositoryId = :repositoryId AND state = 'open' AND number < :id
      ${where}
    ORDER BY number DESC
    LIMIT :limit
  `.all
const listIssues = openIssues('')
const listBeginnerIssues = openIssues(`AND ${isBeginner}`)

type PullRow = {
  number: number
  title: string
  state: string
  authorLogin: string | null
  branch: string | null
  createdAt: number
  skills: string | null
  reviewed: number
  open: number
}

// The open PRs first, then the others, newest first: the order of the tab,
// read from the index on (repositoryId, state = 'open', number)
const listPulls = sql<PullRow, Window>`
  SELECT number, title, state, authorLogin, branch, createdAt, skills,
    EXISTS (
      SELECT 1 FROM review
      WHERE review.pullRequestId = pullRequest.pullRequestId
        AND review.state != 'dismissed'
    ) AS reviewed,
    (state = 'open') AS open
  FROM pullRequest
  WHERE repositoryId = :repositoryId
    AND ${after("(state = 'open')", 'number')}
  ORDER BY (state = 'open') DESC, number DESC
  LIMIT :limit
`.all

// Counted, never listed: the headers of the tabs and the cards. Every
// repository of the list at once, each count from its index
type Counts = {
  openIssues: number
  beginnerIssues: number
  openPullRequests: number
  waitingReview: number
}

const countBy = (from: string, where = '') =>
  sql<{ repositoryId: number; n: number }, string>`
    SELECT repositoryId, count(*) AS n FROM ${from}
    WHERE repositoryId IN (SELECT value FROM json_each(?))
      AND state = 'open' ${where}
    GROUP BY repositoryId
  `.all

const counters = {
  openIssues: countBy('issue'),
  beginnerIssues: countBy('issue', `AND ${isBeginner}`),
  openPullRequests: countBy('pullRequest'),
  waitingReview: countBy(
    'pullRequest',
    `AND NOT EXISTS (SELECT 1 FROM review
      WHERE review.pullRequestId = pullRequest.pullRequestId
        AND review.state != 'dismissed')`,
  ),
}

const countsOf = (repositoryIds: number[]) => {
  const ids = JSON.stringify(repositoryIds)
  const counts = new Map<number, Counts>(
    repositoryIds.map((id) => [id, {
      openIssues: 0,
      beginnerIssues: 0,
      openPullRequests: 0,
      waitingReview: 0,
    }]),
  )
  for (const [name, count] of Object.entries(counters)) {
    for (const { repositoryId, n } of count(ids)) {
      counts.get(repositoryId)![name as keyof Counts] = n
    }
  }
  return counts
}

const shownIssue = (issue: IssueRow) => ({
  ...issue,
  labels: parse<string[]>(issue.labels, []),
  authorLogin: issue.authorLogin ?? '',
  comments: issue.comments ?? 0,
})

const shownPull = ({ open: _open, ...pull }: PullRow) => ({
  ...pull,
  authorLogin: pull.authorLogin ?? '',
  branch: pull.branch ?? '',
  skills: skillNamesOf(parse<number[]>(pull.skills, [])),
  reviewed: pull.reviewed === 1,
})

const issuesOf = (repositoryId: number, before = '', beginners = false) => {
  const page = readBatch(
    before,
    ({ id, limit }) =>
      (beginners ? listBeginnerIssues : listIssues)({
        repositoryId,
        id,
        limit,
      }),
    (row) => ({ value: 0, id: row.number }),
  )
  return { items: page.items.map(shownIssue), next: page.next }
}

const pullsOf = (repositoryId: number, before = '') => {
  const page = readBatch(
    before,
    (slice) => listPulls({ ...slice, repositoryId }),
    (row) => ({ value: row.open, id: row.number }),
  )
  return { items: page.items.map(shownPull), next: page.next }
}

type Stats = {
  stars?: number
  forks?: number
  topics?: string[]
  languages?: [string, number][]
  contributors?: number
  openIssues?: number
  openPullRequests?: number
  release?: { tag: string; at: number | null } | null
}

// One project as the web shows it, from its row and the open issue / PR
// counts of every repository in the batch
const shownProject = (row: ProjectRow, counts: Map<number, Counts>) => {
  const stats = parse<Stats>(row.stats, {})
  const repositoryId = row.repositoryId
  return {
    slug: row.slug,
    name: row.name,
    description: row.description,
    vision: row.vision ?? '',
    status: row.status,
    skills: skillNamesOf(parse<number[]>(row.skills, [])),
    createdAt: row.createdAt,
    owner: row.ownerLogin,
    members: listMembers(row.projectId),
    followers: listFollowers(row.projectId).map((f) => f.login),
    needs: listNeeds(row.projectId).map((n) => n.title),
    gallery: galleryOf(row.projectId),
    demoVideoUrl: row.demoVideoUrl ?? '',
    repository: repositoryId
      ? {
        owner: row.repoOwner!,
        name: row.repoName!,
        syncMode: row.syncMode!,
        about: row.readme ? readmeSummary(row.readme) : '',
        stars: stats.stars ?? 0,
        topics: stats.topics ?? [],
        languages: (stats.languages ?? [])
          .map(([name, share]) => ({ name, share })),
        contributors: stats.contributors ?? 0,
        release: stats.release?.tag ?? '',
        releasedAt: stats.release?.at ?? 0,
        lastSyncedAt: row.lastSyncedAt ?? 0,
        ...counts.get(repositoryId)!,
        issues: issuesOf(repositoryId),
        pullRequests: pullsOf(repositoryId),
      }
      : undefined,
  }
}

export const listMyProjects = (userId: number) => {
  const rows = listMine(userId)
  const counts = countsOf(rows.flatMap((row) => row.repositoryId ?? []))
  return rows.map((row) => shownProject(row, counts))
}

// A public project, or one the developer is a member of, by its slug
const getBySlug = sql<ProjectRow, { slug: string; userId: number }>`
  SELECT project.projectId, slug, project.name, description, vision, status,
    project.skills, project.demoVideoUrl, project.createdAt,
    owner.githubUsername AS ownerLogin,
    repository.repositoryId, repository.owner AS repoOwner,
    repository.name AS repoName, syncMode,
    substr(readme, 1, 8000) AS readme, stats, lastSyncedAt
  FROM project
  JOIN user owner ON owner.userId = project.ownerId
  LEFT JOIN repository ON repository.projectId = project.projectId
  WHERE project.slug = :slug AND (project.visibility = 'public'
    OR EXISTS (SELECT 1 FROM projectMember
      WHERE projectMember.projectId = project.projectId
        AND projectMember.userId = :userId))
`.get

/**
 * One project by its slug, for its public page (§6): any developer sees a
 * public project, a member sees a private one too. Unknown or private: 404
 */
export const getProject = (userId: number, slug: string) => {
  const row = getBySlug({ slug, userId })
  if (!row) throw new respond.NotFoundError({ message: 'Project not found' })
  const counts = countsOf(row.repositoryId ? [row.repositoryId] : [])
  return shownProject(row, counts)
}

const getRepository = sql<
  { repositoryId: number },
  { slug: string; userId: number }
>`
  SELECT repository.repositoryId FROM project
  JOIN repository ON repository.projectId = project.projectId
  WHERE project.slug = :slug AND (project.visibility = 'public'
    OR EXISTS (SELECT 1 FROM projectMember
      WHERE projectMember.projectId = project.projectId
        AND projectMember.userId = :userId))
`.get

const repositoryOf = (userId: number, slug: string) => {
  const row = getRepository({ slug, userId })
  if (!row) throw new respond.NotFoundError({ message: 'Project not found' })
  return row.repositoryId
}

/**
 * A batch of the open issues of a project, from a cursor; only those for a
 * first contribution with `beginners`
 */
export const listProjectIssues = (
  userId: number,
  slug: string,
  before = '',
  beginners = false,
) => issuesOf(repositoryOf(userId, slug), before, beginners)

/** A batch of the PRs of a project, the open ones first, from a cursor */
export const listProjectPulls = (userId: number, slug: string, before = '') =>
  pullsOf(repositoryOf(userId, slug), before)
