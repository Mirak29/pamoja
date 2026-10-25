import { sql } from '@01edu/db'
import { respond } from '@01edu/api/response'
import { batch, readCursor } from '/api/lib/cursor.ts'
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
    repository.name AS repoName, syncMode, readme, stats, lastSyncedAt
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

const BATCH = 20

type Window = { repositoryId: number; value: number; id: number; limit: number }

type IssueRow = {
  number: number
  title: string
  state: string
  labels: string
  authorLogin: string | null
  comments: number | null
  createdAt: number
}

// The open issues, newest first, from the index (repositoryId, state, number)
const listIssues = sql<
  IssueRow,
  { repositoryId: number; id: number; limit: number }
>`
  SELECT number, title, state, labels, authorLogin, comments, createdAt
  FROM issue
  WHERE repositoryId = :repositoryId AND state = 'open' AND number < :id
  ORDER BY number DESC
  LIMIT :limit
`.all

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
    AND ((state = 'open') < :value
      OR ((state = 'open') = :value AND number < :id))
  ORDER BY (state = 'open') DESC, number DESC
  LIMIT :limit
`.all

// Counted, never listed: the headers of the tabs and the cards
const getCounts = sql<
  {
    openIssues: number
    beginnerIssues: number
    openPullRequests: number
    waitingReview: number
  },
  number
>`
  SELECT
    (SELECT count(*) FROM issue WHERE repositoryId = :id AND state = 'open')
      AS openIssues,
    (SELECT count(*) FROM issue WHERE repositoryId = :id AND state = 'open'
      AND EXISTS (SELECT 1 FROM json_each(issue.labels)
        WHERE value = 'good first issue')) AS beginnerIssues,
    (SELECT count(*) FROM pullRequest
      WHERE repositoryId = :id AND state = 'open') AS openPullRequests,
    (SELECT count(*) FROM pullRequest
      WHERE repositoryId = :id AND state = 'open'
        AND NOT EXISTS (SELECT 1 FROM review
          WHERE review.pullRequestId = pullRequest.pullRequestId
            AND review.state != 'dismissed')) AS waitingReview
`.get

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

const issuesOf = (repositoryId: number, before = '') => {
  const { id } = readCursor(before)
  const page = batch(
    listIssues({ repositoryId, id, limit: BATCH + 1 }),
    BATCH,
    (row) => ({ value: 0, id: row.number }),
  )
  return { items: page.items.map(shownIssue), next: page.next }
}

const pullsOf = (repositoryId: number, before = '') => {
  const { value, id } = readCursor(before)
  const page = batch(
    listPulls({ repositoryId, value, id, limit: BATCH + 1 }),
    BATCH,
    (row) => ({ value: row.open, id: row.number }),
  )
  return { items: page.items.map(shownPull), next: page.next }
}

// The first paragraphs of a README, without its headings, badges or code:
// the page shows no more, so the whole README never travels
const readmeSummary = (readme: string) =>
  readme.replace(/```[\s\S]*?```/g, '').split(/\n\s*\n/)
    .map((block) => block.trim())
    .filter((block) =>
      block && !block.startsWith('#') && !block.startsWith('![') &&
      !block.startsWith('[![') && !block.startsWith('<')
    )
    .join('\n\n').slice(0, 600)

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

export const listMyProjects = (userId: number) =>
  listMine(userId).map((row) => {
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
          ...getCounts(repositoryId)!,
          issues: issuesOf(repositoryId),
          pullRequests: pullsOf(repositoryId),
        }
        : undefined,
    }
  })

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

/** A batch of the open issues of a project, from a cursor */
export const listProjectIssues = (userId: number, slug: string, before = '') =>
  issuesOf(repositoryOf(userId, slug), before)

/** A batch of the PRs of a project, the open ones first, from a cursor */
export const listProjectPulls = (userId: number, slug: string, before = '') =>
  pullsOf(repositoryOf(userId, slug), before)
