import { db, sql } from '@01edu/db'
import { now } from '@01edu/time'
import { respond } from '@01edu/api/response'
import { JoinRequest, ProjectMember } from '/api/schema.ts'
import { Entry } from '/api/entries.ts'
import { createNotification } from '/api/notifications.ts'
import { refreshListeners } from '/api/events.ts'
import { type Window, within } from '/api/lib/rate.ts'
import { LIMITS } from '/api/limits.ts'
import { joinAreas, joinAvailabilities } from '/api/vocabulary.ts'

// Join a project (§6.6): a candidature the owner and the maintainers accept
// or refuse, from their notification or the Team tab. Accepting adds the
// developer to the team (role contributor), never touching GitHub (§6.6).

export const JOIN_RATE = { count: 20, per: 3600 }

// Each refusal says why with a stable `reason`: the page tells the
// developer what happened, never « the server could not be reached »
type Reason = 'unknown' | 'invalid' | 'member' | 'pending' | 'decided'
const badRequest = (message: string, reason: Reason) =>
  new respond.BadRequestError({ message, reason })
const forbidden = (message: string) => new respond.ForbiddenError({ message })
const conflict = (message: string, reason: Reason) =>
  new respond.ConflictError({ message, reason })

const getProject = sql<{ projectId: number; name: string }, string>`
  SELECT projectId, name FROM project WHERE slug = ? AND visibility = 'public'
`.get

const getRole = sql<
  { role: string },
  { projectId: number; userId: number }
>`
  SELECT role FROM projectMember WHERE projectId = :projectId AND userId = :userId
`.get

const listManagers = sql<{ userId: number }, number>`
  SELECT userId FROM projectMember
  WHERE projectId = ? AND role IN ('owner', 'maintainer')
`.all

const pendingRequest = sql<
  { joinRequestId: number },
  { projectId: number; userId: number }
>`
  SELECT joinRequestId FROM joinRequest
  WHERE projectId = :projectId AND userId = :userId AND status = 'pending'
`.get

const countRequests = sql<Window, { me: number; since: number }>`
  SELECT count(*) AS n, min(createdAt) AS oldest FROM joinRequest
  WHERE userId = :me AND createdAt > :since
`.get

type JoinRow = {
  joinRequestId: number
  projectId: number
  userId: number
  status: string
  slug: string
  name: string
}
const getRequest = sql<JoinRow, number>`
  SELECT joinRequestId, joinRequest.projectId, joinRequest.userId,
    joinRequest.status, project.slug, project.name
  FROM joinRequest
  JOIN project ON project.projectId = joinRequest.projectId
  WHERE joinRequestId = ?
`.get

// The sentence the manager reads about a candidature, built from its areas
// and availability (controlled values, §6.6)
const summaryOf = (areas: string[], availability: string, message: string) => {
  const head = [areas.join(', '), availability].filter(Boolean).join(' · ')
  return message ? `${head} : « ${message} »` : head
}

/** Apply to join a project; its owner and maintainers are notified (§6.6) */
export const applyToProject = (
  me: number,
  slug: string,
  areas: string[],
  availability: string,
  message: string,
) => {
  // The answers of the dialog, from its lists; a message no longer than
  // the page lets one write (§16)
  const known = (list: readonly string[], value: string) => list.includes(value)
  if (
    !areas.length || areas.length > joinAreas.length ||
    !areas.every((area) => known(joinAreas, area)) ||
    !known(joinAvailabilities, availability)
  ) throw badRequest('Unknown areas or availability', 'invalid')
  if (message.length > LIMITS.note) {
    throw badRequest(`message: ${LIMITS.note} characters at most`, 'invalid')
  }
  const project = getProject(slug)
  if (!project) throw badRequest('Unknown project', 'unknown')
  if (getRole({ projectId: project.projectId, userId: me })) {
    throw conflict('You already belong to this project', 'member')
  }
  if (pendingRequest({ projectId: project.projectId, userId: me })) {
    throw conflict('A request is already pending', 'pending')
  }
  within(countRequests, JOIN_RATE, me, 'Too many requests this hour')
  const summary = summaryOf(areas, availability, message.trim())
  db.transaction(() => {
    const joinRequestId = JoinRequest.insert({
      projectId: project.projectId,
      userId: me,
      areas: [...new Set(areas)],
      availability,
      message: message.trim(),
      status: 'pending',
      createdAt: now(),
    })
    for (const { userId } of listManagers(project.projectId)) {
      createNotification({
        userId,
        type: 'application',
        category: 'projects',
        actorId: me,
        payload: {
          joinRequestId,
          project: project.name,
          projectSlug: slug,
          excerpt: summary,
        },
      })
    }
  })()
  return { applied: true }
}

/** Accept or refuse a candidature; only an owner or a maintainer may (§6.6) */
export const decideJoinRequest = (
  me: number,
  joinRequestId: number,
  accept: boolean,
) => {
  const request = getRequest(joinRequestId)
  if (!request) throw badRequest('Unknown request', 'unknown')
  const role = getRole({ projectId: request.projectId, userId: me })?.role
  if (role !== 'owner' && role !== 'maintainer') {
    throw forbidden('Only the owner and the maintainers decide')
  }
  if (request.status !== 'pending') {
    throw conflict('Already decided', 'decided')
  }
  db.transaction(() => {
    db.prepare(`UPDATE joinRequest SET status = ? WHERE joinRequestId = ?`)
      .run(accept ? 'accepted' : 'refused', joinRequestId)
    if (accept) {
      const member = getRole({
        projectId: request.projectId,
        userId: request.userId,
      })
      if (!member) {
        ProjectMember.insert({
          projectId: request.projectId,
          userId: request.userId,
          role: 'contributor',
          joinedAt: now(),
        })
        // The feeds of the project's audience read the team again (§13.3)
        Entry.insert.PROJECT_MEMBER_JOINED({
          userId: request.userId,
          projectId: request.projectId,
          source: 'platform',
        })
      }
    }
    createNotification({
      userId: request.userId,
      type: 'application',
      category: 'projects',
      actorId: me,
      payload: {
        project: request.name,
        projectSlug: request.slug,
        accepted: accept ? 1 : 0,
      },
    })
  })()
  // The new member's open connections now receive the project (§13.2)
  if (accept) refreshListeners(request.userId)
  return { status: accept ? 'accepted' : 'refused' }
}
