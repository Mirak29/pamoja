import { db, sql } from '@01edu/db'
import { keepRequestVector } from '/api/embeddings.ts'
import { respond } from '@01edu/api/response'
import { now } from '@01edu/time'
import { Entry, maybe } from '/api/entries.ts'
import { after, readBatch, readCursor, type Slice } from '/api/lib/cursor.ts'
import { type Window, within } from '/api/lib/rate.ts'
import {
  DESCRIPTION_MAX,
  OPEN_FOR,
  SKILLS_MAX,
  TITLE_MAX,
  VIDEO_URL_MAX,
} from '/api/help-rules.ts'
import { sendWave } from '/api/matching.ts'
import { attach, mediaOf, type shownMedia } from '/api/media.ts'
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
  /** Uploads shown with the request: screenshots of an error (§17.3) */
  media?: number[] | null
}

/** Images of a help request (§17.3) */
export const HELP_MEDIA_MAX = 4

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

// Requests a developer may publish in a day (§16): each one notifies up to
// five developers a wave. Counted in the database, so a restart keeps it
export const HELP_RATE = { count: 10, per: 24 * 3600 }

const countRequests = sql<Window, { me: number; since: number }>`
  SELECT count(*) AS n, min(createdAt) AS oldest FROM helpRequest
  WHERE authorId = :me AND createdAt > :since
`.get

/**
 * Publishes a request, open for 7 days (§7.2). On a PR, one request at a
 * time: the check and the insert are one transaction.
 */
/**
 * What a request must pass before anything is spent on it: its fields and
 * the daily limit of its author (§16)
 */
export const assertCanCreate = (userId: number, input: HelpInput) => {
  checked(input)
  if ((input.media ?? []).length > HELP_MEDIA_MAX) {
    throw new respond.BadRequestError({
      message: `${HELP_MEDIA_MAX} images at most`,
    })
  }
  within(countRequests, HELP_RATE, userId, 'Too many help requests today')
}

export const createHelpRequest = (
  userId: number,
  input: HelpInput,
  // Its embedding, computed before (PAM-311); the background fills it if not
  prepared?: { text: string; vector?: Float32Array },
) => {
  const { title, description, videoUrl, skills } = checked(input)
  const media = input.media ?? []
  if (media.length > HELP_MEDIA_MAX) {
    throw new respond.BadRequestError({
      message: `${HELP_MEDIA_MAX} images at most`,
    })
  }
  within(countRequests, HELP_RATE, userId, 'Too many help requests today')
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
    attach(userId, media, 'help_request', helpRequestId)
    // Read by the search reindexing, sent to nobody (§13.3)
    Entry.insert.HELP_REQUEST_CREATED({
      userId,
      projectId: maybe(projectId),
      helpRequestId,
      source: 'platform',
    })
    return helpRequestId
  })()
  prepared && keepRequestVector(helpRequestId, prepared.text, prepared.vector)
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
  repository: string | null
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
    pullRequest.branch, repository.fullName AS repository, category,
    helpRequest.title, helpRequest.description,
    helpRequest.skills, expectedLevel, estimatedMinutes, videoUrl,
    helpRequest.status, helper.githubUsername AS helper,
    helpRequest.acceptedAt, helpRequest.source, helpRequest.createdAt
  FROM helpRequest
  JOIN user author ON author.userId = helpRequest.authorId
  LEFT JOIN user helper ON helper.userId = helpRequest.acceptedBy
  LEFT JOIN project ON project.projectId = helpRequest.projectId
  LEFT JOIN pullRequest
    ON pullRequest.pullRequestId = helpRequest.pullRequestId
  LEFT JOIN repository ON repository.repositoryId = pullRequest.repositoryId
`

// The requests a developer sees on the help page, by tab: those they wrote,
// accepted, or of their projects; all of them together for the other pages.
// Each way of being concerned reads its own index, newest first, at most a
// batch: never the whole table as an OR would, nor every request of their
// projects sorted afterwards as an IN would (§12.7)

type Key = { helpRequestId: number; createdAt: number }

const newestBy = <P extends Record<string, number>>(
  column: string,
  where = '',
) =>
  sql<Key, Slice & { key: number } & P>`
    SELECT helpRequestId, createdAt FROM helpRequest
    WHERE ${column} = :key ${where}
      AND ${after('createdAt', 'helpRequestId')}
    ORDER BY createdAt DESC, helpRequestId DESC
    LIMIT :limit
  `.all

const byAuthor = newestBy('authorId')
const byHelper = newestBy('acceptedBy')
const byTarget = newestBy('targetUserId')
const byProject = newestBy('projectId')
// Of their projects, not their own
const byProjectOthers = newestBy<{ userId: number }>(
  'projectId',
  'AND authorId != :userId',
)

const projectsOf = sql<{ projectId: number }, number>`
  SELECT projectId FROM projectMember WHERE userId = ?
`.all

// The newest of several lists, each request once
const newestOf = (lists: Key[][], limit: number) => {
  const seen = new Set<number>()
  return lists.flat()
    .sort((a, b) =>
      b.createdAt - a.createdAt || b.helpRequestId - a.helpRequestId
    )
    .filter(({ helpRequestId }) =>
      !seen.has(helpRequestId) && seen.add(helpRequestId)
    )
    .slice(0, limit)
}

const listByIds = sql<HelpRow, string>`${helpSelect}
  WHERE helpRequest.helpRequestId IN (SELECT value FROM json_each(?))
`.all

// The rows of the requests, in the order of their keys
const rowsOf = (keys: { helpRequestId: number }[]) => {
  const rows = new Map(
    listByIds(JSON.stringify(keys.map((key) => key.helpRequestId)))
      .map((row) => [row.helpRequestId, row]),
  )
  return keys.flatMap((key) => rows.get(key.helpRequestId) ?? [])
}

type TabSlice = Slice & { userId: number }

const ofMe = ({ userId, ...slice }: TabSlice) => ({ ...slice, key: userId })

const listTab: Record<
  '' | 'mine' | 'accepted' | 'projects',
  (
    slice: TabSlice,
  ) => HelpRow[]
> = {
  '': (slice) =>
    rowsOf(newestOf([
      byAuthor(ofMe(slice)),
      byHelper(ofMe(slice)),
      byTarget(ofMe(slice)),
      ...projectsOf(slice.userId).map(({ projectId }) =>
        byProject({ ...ofMe(slice), key: projectId })
      ),
    ], slice.limit)),
  mine: (slice) => rowsOf(byAuthor(ofMe(slice))),
  accepted: (slice) => rowsOf(byHelper(ofMe(slice))),
  projects: (slice) =>
    rowsOf(newestOf(
      projectsOf(slice.userId).map(({ projectId }) =>
        byProjectOthers({
          ...ofMe(slice),
          key: projectId,
          userId: slice.userId,
        })
      ),
      slice.limit,
    )),
}
export type HelpTab = keyof typeof listTab
export const HELP_TABS = Object.keys(listTab) as HelpTab[]

const getOne = sql<HelpRow, number>`${helpSelect}
  WHERE helpRequest.helpRequestId = ?
`.get

const shown = (row: HelpRow, media: ShownMedia[] = []) => ({
  id: row.helpRequestId,
  author: row.author,
  project: row.project ?? '',
  pullRequest: row.pullRequest ?? 0,
  branch: row.branch ?? '',
  repository: row.repository ?? '',
  category: row.category,
  title: row.title,
  description: row.description,
  skills: skillNamesOf(JSON.parse(row.skills) as number[]),
  expectedLevel: row.expectedLevel ?? '',
  estimatedMinutes: row.estimatedMinutes ?? 0,
  videoUrl: row.videoUrl ?? '',
  media,
  status: row.status,
  helper: row.helper ?? '',
  acceptedAt: row.acceptedAt ?? 0,
  createdAt: row.createdAt,
  demo: row.source === 'demo',
})

type ShownMedia = ReturnType<typeof shownMedia>

// The requests with their images, read in one query for the list
const withMedia = (rows: HelpRow[]) => {
  const media = mediaOf('help_request', rows.map((r) => r.helpRequestId))
  return rows.map((row) => shown(row, media.get(row.helpRequestId)))
}

/** A batch of the requests of a tab, from a cursor, with their images */
export const listHelpRequests = (
  userId: number,
  tab: HelpTab = '',
  before = '',
) => {
  const { items, next } = readBatch(
    before,
    (slice) => listTab[tab]({ ...slice, userId }),
    (row) => ({ value: row.createdAt, id: row.helpRequestId }),
  )
  return { items: withMedia(items), next }
}

// The latest requests a developer wrote or accepted: the Activity of their
// profile (§9.1), from the two indexes
export const listHelpActivity = (userId: number) => {
  const slice = { ...readCursor(''), limit: 10, key: userId }
  return withMedia(
    rowsOf(newestOf([byAuthor(slice), byHelper(slice)], slice.limit)),
  )
}

/** Requests by their ids, with their images, read together */
export const getHelpRequests = (ids: number[]) => {
  const rows = withMedia(
    rowsOf(ids.map((helpRequestId) => ({ helpRequestId }))),
  )
  return new Map(rows.map((request) => [request.id, request]))
}

export const getHelpRequest = (helpRequestId: number) => {
  const row = getOne(helpRequestId)
  return row && withMedia([row])[0]
}
