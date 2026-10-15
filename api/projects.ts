import { sql } from '@01edu/db'
import { skillNamesOf } from '/api/skills.ts'

// The projects of the signed-in developer, as the web shows them until the
// project screens read the API themselves (PAM-401)

type ProjectRow = {
  projectId: number
  slug: string
  name: string
  description: string
  vision: string | null
  status: string
  skills: string | null
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
    project.skills, project.createdAt, owner.githubUsername AS ownerLogin,
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

const listIssues = sql<
  {
    number: number
    title: string
    state: string
    labels: string
    authorLogin: string | null
    comments: number | null
    createdAt: number
  },
  number
>`
  SELECT number, title, state, labels, authorLogin, comments, createdAt
  FROM issue WHERE repositoryId = ? ORDER BY number DESC
`.all

const listPulls = sql<
  {
    number: number
    title: string
    state: string
    authorLogin: string | null
    branch: string | null
    createdAt: number
  },
  number
>`
  SELECT number, title, state, authorLogin, branch, createdAt
  FROM pullRequest WHERE repositoryId = ? ORDER BY number DESC
`.all

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

const parse = <T>(json: string | null, fallback: T): T =>
  json ? JSON.parse(json) as T : fallback

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
      repository: repositoryId
        ? {
          owner: row.repoOwner!,
          name: row.repoName!,
          syncMode: row.syncMode!,
          readme: row.readme ?? '',
          stars: stats.stars ?? 0,
          topics: stats.topics ?? [],
          languages: (stats.languages ?? [])
            .map(([name, share]) => ({ name, share })),
          contributors: stats.contributors ?? 0,
          release: stats.release?.tag ?? '',
          releasedAt: stats.release?.at ?? 0,
          lastSyncedAt: row.lastSyncedAt ?? 0,
          issues: listIssues(repositoryId).map((issue) => ({
            ...issue,
            labels: parse<string[]>(issue.labels, []),
            authorLogin: issue.authorLogin ?? '',
            comments: issue.comments ?? 0,
          })),
          pullRequests: listPulls(repositoryId).map((pull) => ({
            ...pull,
            authorLogin: pull.authorLogin ?? '',
            branch: pull.branch ?? '',
          })),
        }
        : undefined,
    }
  })
