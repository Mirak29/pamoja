import { sql } from '@01edu/db'
import { listHelpForMe } from '/api/help-lifecycle.ts'
import { sourceWeight } from '/api/matching.ts'
import { GOOD_FIRST_ISSUE } from '/api/projects.ts'
import { skillNamesOf } from '/api/skills.ts'

// « What can I work on? » (§10.3): concrete things to do, from what the
// developer knows, best match first. Computed by the server from the base,
// without AI: the assistant (§11) phrases it, it never replaces it.
//
// The match of a need or an issue is how much of its skills the developer
// holds, each weighted by what backs it, as in the matching (§7.3): proven
// on Pamoja, read from GitHub, or declared.

/** How many things of each kind */
const SHOWN = 10
// Projects whose good first issues are read, the best match first
const PROJECTS_READ = 10
const ISSUES_PER_PROJECT = 3

const listMySkills = sql<{ skillId: number; source: string }, number>`
  SELECT skillId, source FROM userSkill WHERE userId = ?
`.all

// Public projects the developer is not part of, that share a skill with them
const others = `project.visibility = 'public'
  AND project.projectId NOT IN (
    SELECT projectId FROM projectMember WHERE userId = :userId
  )`

const shares = (skills: string) =>
  `EXISTS (SELECT 1 FROM json_each(${skills})
    WHERE value IN (SELECT skillId FROM userSkill WHERE userId = :userId))`

type NeedRow = {
  projectNeedId: number
  type: string
  title: string
  skills: string
  slug: string
  name: string
}

// A need without skills of its own asks for those of its project
const needSkills = `coalesce(nullif(projectNeed.skills, '[]'), project.skills)`

const listNeeds = sql<NeedRow, { userId: number }>`
  SELECT projectNeedId, projectNeed.type, projectNeed.title,
    ${needSkills} AS skills, project.slug, project.name
  FROM projectNeed
  JOIN project ON project.projectId = projectNeed.projectId
  WHERE projectNeed.status = 'open' AND ${others} AND ${shares(needSkills)}
  LIMIT 200
`.all

type ProjectRow = {
  projectId: number
  slug: string
  name: string
  skills: string
  repositoryId: number
  repoOwner: string
  repoName: string
}

const listProjects = sql<ProjectRow, { userId: number }>`
  SELECT project.projectId, slug, project.name, project.skills,
    repositoryId, repository.owner AS repoOwner, repository.name AS repoName
  FROM project
  JOIN repository ON repository.projectId = project.projectId
  WHERE ${others} AND project.skills IS NOT NULL
    AND ${shares('project.skills')}
  LIMIT 200
`.all

// Issues to begin with: good first issues, and the documentation, the
// second way of contributing (State of Dev Sénégal 2026, §10.3). The text
// of the labels is looked at before their JSON is read
const DOCUMENTATION = ['documentation', 'docs']
const firstIssue = `(issue.labels LIKE '%${GOOD_FIRST_ISSUE}%'
    OR issue.labels LIKE '%doc%')
  AND EXISTS (SELECT 1 FROM json_each(issue.labels)
    WHERE value IN ('${GOOD_FIRST_ISSUE}', ${
  DOCUMENTATION.map((label) => `'${label}'`).join(', ')
}))`

type IssueRow = {
  number: number
  title: string
  labels: string
  comments: number | null
}

export const listBeginners =
  sql<IssueRow, { repositoryId: number; limit: number }>`
  SELECT number, title, labels, comments FROM issue
  WHERE repositoryId = :repositoryId AND state = 'open' AND ${firstIssue}
  ORDER BY number DESC
  LIMIT :limit
`.all

// A PR of theirs merged somewhere: they have contributed already
const getContributed = sql<{ contributed: number }, number>`
  SELECT EXISTS (
    SELECT 1 FROM pullRequest
    WHERE authorGithubId = (SELECT githubId FROM user WHERE userId = ?)
      AND mergedAt IS NOT NULL
  ) AS contributed
`.get

/** The best source of each skill of the developer, in percent */
export const weightsOf = (userId: number) => {
  const weights = new Map<number, number>()
  for (const { skillId, source } of listMySkills(userId)) {
    weights.set(
      skillId,
      Math.max(weights.get(skillId) ?? 0, sourceWeight[source] ?? 0),
    )
  }
  return weights
}

/** How well skills asked fit the developer, out of 100, and those held */
export const fitOf = (asked: number[], weights: Map<number, number>) => {
  const held = asked.filter((id) => weights.has(id))
  const sum = held.reduce((total, id) => total + weights.get(id)!, 0)
  return {
    score: asked.length ? Math.round(sum / asked.length) : 0,
    skills: skillNamesOf(held),
  }
}

const best = <T extends { score: number }>(items: T[]) =>
  items.sort((a, b) => b.score - a.score).slice(0, SHOWN)

/**
 * The one thing to begin with, for who has never contributed (§10.3): the
 * issue that fits best, the least crowded one when they fit as well; else
 * a need for documentation
 */
const firstStepOf = (
  issues: (WorkItem & { comments: number })[],
  needs: WorkItem[],
): WorkItem | undefined => {
  const [issue] = [...issues].sort((a, b) =>
    b.score - a.score || a.comments - b.comments
  )
  if (issue) {
    const { comments: _comments, ...item } = issue
    return item
  }
  return needs.find((need) => /doc/i.test(need.title))
}

export type WorkItem = {
  id: string
  title: string
  project: string
  // Its page on Pamoja; empty without a project
  projectSlug: string
  type: string
  score: number
  skills: string[]
  href: string
}

/**
 * What a developer can work on: help that matches them, needs of projects
 * and issues to begin with, each list best match first; and for who has
 * never contributed, the first step
 */
export const listWork = (userId: number) => {
  const weights = weightsOf(userId)
  const help = listHelpForMe(userId).items.slice(0, SHOWN).map((request) => ({
    id: String(request.id),
    title: request.title,
    project: request.project,
    projectSlug: request.project,
    type: request.category,
    score: request.score,
    skills: request.skills,
    href: `help/${request.id}`,
  }))
  const needs = best(
    listNeeds({ userId }).map((need) => ({
      id: String(need.projectNeedId),
      title: need.title,
      project: need.name,
      projectSlug: need.slug,
      type: need.type,
      ...fitOf(JSON.parse(need.skills) as number[], weights),
      href: `project/${need.slug}/team`,
    })),
  )
  const projects = best(
    listProjects({ userId }).map((project) => ({
      ...project,
      ...fitOf(JSON.parse(project.skills) as number[], weights),
    })),
  ).slice(0, PROJECTS_READ)
  const candidates = projects.flatMap((project) =>
    listBeginners({
      repositoryId: project.repositoryId,
      limit: ISSUES_PER_PROJECT,
    }).map((issue) => ({
      id: `${project.slug}#${issue.number}`,
      title: `#${issue.number} ${issue.title}`,
      project: project.name,
      projectSlug: project.slug,
      type: (JSON.parse(issue.labels) as string[]).includes(GOOD_FIRST_ISSUE)
        ? GOOD_FIRST_ISSUE
        : 'documentation',
      score: project.score,
      skills: project.skills,
      comments: issue.comments ?? 0,
      href:
        `https://github.com/${project.repoOwner}/${project.repoName}/issues/${issue.number}`,
    }))
  )
  const newcomer = !getContributed(userId)?.contributed
  const issues = best(
    candidates.map(({ comments: _comments, ...item }) => item),
  )
  return {
    help,
    needs,
    issues,
    newcomer,
    firstStep: newcomer
      ? firstStepOf(candidates, needs) ?? undefined
      : undefined,
  }
}
