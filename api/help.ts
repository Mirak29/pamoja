import { db, sql } from '@01edu/db'
import { respond } from '@01edu/api/response'
import { now } from '@01edu/time'
import { Entry, maybe } from '/api/entries.ts'
import {
  DESCRIPTION_MAX,
  OPEN_FOR,
  SKILLS_MAX,
  TITLE_MAX,
  VIDEO_URL_MAX,
} from '/api/help-rules.ts'
import { sendWave } from '/api/matching.ts'
import { HelpRequest } from '/api/schema.ts'
import { skillIdsOf, skillNamesOf } from '/api/skills.ts'
import type { HelpCategory, HelpLevel } from '/api/vocabulary.ts'

// Help requests (§7.1): the creation, from the form or from a PR with
// « Demander une review », and the requests a developer is part of. The
// lifecycle (PAM-208) and the matching (PAM-209) build on them.

const badRequest = (message: string) => new respond.BadRequestError({ message })

type ProjectRow = { projectId: number; repositoryId: number | null }

const getMemberProject = sql<ProjectRow, { slug: string; userId: number }>`
  SELECT project.projectId, repository.repositoryId FROM project
  JOIN projectMember ON projectMember.projectId = project.projectId
    AND projectMember.userId = :userId
  LEFT JOIN repository ON repository.projectId = project.projectId
  WHERE slug = :slug
`.get

const getProjectId = sql<{ projectId: number }, string>`
  SELECT projectId FROM project WHERE slug = ?
`.get

/** The id of a project by its slug, null if none */
export const projectIdOf = (slug: string) =>
  slug ? getProjectId(slug)?.projectId ?? null : null

const getPullRequest = sql<
  { pullRequestId: number; state: string },
  { repositoryId: number; number: number }
>`
  SELECT pullRequestId, state FROM pullRequest
  WHERE repositoryId = :repositoryId AND number = :number
`.get

// A request in progress on a PR: a second one would split the reviewers
const getActiveOnPullRequest = sql<{ helpRequestId: number }, number>`
  SELECT helpRequestId FROM helpRequest
  WHERE pullRequestId = ?
    AND status IN ('open', 'accepted', 'review_submitted', 'delivered')
  LIMIT 1
`.get

/** An http(s) link only: never javascript: or data: in a page */
const isWebLink = (link: string) => {
  try {
    const { protocol } = new URL(link)
    return protocol === 'https:' || protocol === 'http:'
  } catch {
    return false
  }
}

export type HelpInput = {
  category: HelpCategory
  title: string
  description: string
  skills: string[]
  expectedLevel: HelpLevel
  estimatedMinutes: number
  project: string
  pullRequest: number
  videoUrl: string
}

/** The project and PR of a request: the requester must be a member (§7.1) */
const placeOf = (userId: number, input: HelpInput) => {
  if (!input.project) {
    if (input.pullRequest) throw badRequest('A PR needs its project')
    return { projectId: null, pullRequestId: null }
  }
  const project = getMemberProject({ slug: input.project, userId })
  if (!project) {
    throw getProjectId(input.project)
      ? new respond.ForbiddenError({
        message: 'Only a member asks for help on a project',
      })
      : new respond.NotFoundError({ message: 'Project not found' })
  }
  if (!input.pullRequest) {
    return { projectId: project.projectId, pullRequestId: null }
  }
  const pull = project.repositoryId
    ? getPullRequest({
      repositoryId: project.repositoryId,
      number: input.pullRequest,
    })
    : undefined
  if (!pull) throw new respond.NotFoundError({ message: 'PR not found' })
  if (pull.state !== 'open') throw badRequest('This PR is no longer open')
  return { projectId: project.projectId, pullRequestId: pull.pullRequestId }
}

/** The checks of the form, again on the server */
const checked = (input: HelpInput) => {
  const title = input.title.trim()
  const description = input.description.trim()
  const videoUrl = input.videoUrl.trim()
  if (!title) throw badRequest('A title is required')
  if (title.length > TITLE_MAX) throw badRequest('Title too long')
  if (description.length > DESCRIPTION_MAX) {
    throw badRequest('Description too long')
  }
  const skills = skillIdsOf(input.skills)
  if (!skills.length) throw badRequest('At least one skill is required')
  if (skills.length > SKILLS_MAX) throw badRequest('Too many skills')
  if (videoUrl && (videoUrl.length > VIDEO_URL_MAX || !isWebLink(videoUrl))) {
    throw badRequest('The video must be a web link')
  }
  if (!Number.isInteger(input.estimatedMinutes) || input.estimatedMinutes < 0) {
    throw badRequest('Invalid duration')
  }
  return { title, description, videoUrl, skills }
}

/**
 * Publishes a request, open for 7 days (§7.2). On a PR, one request at a
 * time: the check and the insert are one transaction.
 */
export const createHelpRequest = (userId: number, input: HelpInput) => {
  const { title, description, videoUrl, skills } = checked(input)
  const helpRequestId = db.transaction(() => {
    const { projectId, pullRequestId } = placeOf(userId, input)
    if (pullRequestId && getActiveOnPullRequest(pullRequestId)) {
      throw new respond.ConflictError({
        message: 'A help request is already in progress on this PR',
      })
    }
    const at = now()
    const helpRequestId = HelpRequest.insert({
      authorId: userId,
      projectId,
      pullRequestId,
      category: input.category,
      title,
      description,
      skills,
      expectedLevel: input.expectedLevel,
      estimatedMinutes: input.estimatedMinutes || null,
      status: 'open',
      expiresAt: at + OPEN_FOR,
      source: 'platform',
      createdAt: at,
      updatedAt: at,
      videoUrl: videoUrl || null,
    })
    // Read by the search reindexing, sent to nobody (§13.3)
    Entry.insert.HELP_REQUEST_CREATED({
      userId,
      projectId: maybe(projectId),
      helpRequestId,
      source: 'platform',
    })
    return helpRequestId
  })()
  // The first wave goes out at once (§7.3)
  sendWave(helpRequestId)
  return helpRequestId
}

type HelpRow = {
  helpRequestId: number
  author: string
  project: string | null
  pullRequest: number | null
  branch: string | null
  category: string
  title: string
  description: string
  skills: string
  expectedLevel: string | null
  estimatedMinutes: number | null
  videoUrl: string | null
  status: string
  helper: string | null
  acceptedAt: number | null
  source: string
  createdAt: number
}

// Interpolated in the two queries below: a constant, never a value
const helpSelect = `
  SELECT helpRequest.helpRequestId, author.githubUsername AS author,
    project.slug AS project, pullRequest.number AS pullRequest,
    pullRequest.branch, category, helpRequest.title, helpRequest.description,
    helpRequest.skills, expectedLevel, estimatedMinutes, videoUrl,
    helpRequest.status, helper.githubUsername AS helper,
    helpRequest.acceptedAt, helpRequest.source, helpRequest.createdAt
  FROM helpRequest
  JOIN user author ON author.userId = helpRequest.authorId
  LEFT JOIN user helper ON helper.userId = helpRequest.acceptedBy
  LEFT JOIN project ON project.projectId = helpRequest.projectId
  LEFT JOIN pullRequest
    ON pullRequest.pullRequestId = helpRequest.pullRequestId
`

// Until the matching (PAM-209): the requests a developer wrote, accepted,
// or that concern one of their projects
const listVisible = sql<HelpRow, { userId: number }>`${helpSelect}
  WHERE helpRequest.authorId = :userId
    OR helpRequest.acceptedBy = :userId
    OR helpRequest.targetUserId = :userId
    OR helpRequest.projectId IN (
      SELECT projectId FROM projectMember WHERE userId = :userId
    )
  ORDER BY helpRequest.createdAt DESC
  LIMIT 200
`.all

// The latest requests a developer wrote or accepted: the Activity of their
// profile (§9.1)
const listActivity = sql<HelpRow, { userId: number }>`${helpSelect}
  WHERE helpRequest.authorId = :userId OR helpRequest.acceptedBy = :userId
  ORDER BY helpRequest.createdAt DESC
  LIMIT 10
`.all

const getOne = sql<HelpRow, number>`${helpSelect}
  WHERE helpRequest.helpRequestId = ?
`.get

const shown = (row: HelpRow) => ({
  id: row.helpRequestId,
  author: row.author,
  project: row.project ?? '',
  pullRequest: row.pullRequest ?? 0,
  branch: row.branch ?? '',
  category: row.category,
  title: row.title,
  description: row.description,
  skills: skillNamesOf(JSON.parse(row.skills) as number[]),
  expectedLevel: row.expectedLevel ?? '',
  estimatedMinutes: row.estimatedMinutes ?? 0,
  videoUrl: row.videoUrl ?? '',
  status: row.status,
  helper: row.helper ?? '',
  acceptedAt: row.acceptedAt ?? 0,
  createdAt: row.createdAt,
  demo: row.source === 'demo',
})

export const listHelpRequests = (userId: number) =>
  listVisible({ userId }).map(shown)

export const listHelpActivity = (userId: number) =>
  listActivity({ userId }).map(shown)

export const getHelpRequest = (helpRequestId: number) => {
  const row = getOne(helpRequestId)
  return row && shown(row)
}
