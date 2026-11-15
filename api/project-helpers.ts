import { sql } from '@01edu/db'
import { now } from '@01edu/time'
import { respond } from '@01edu/api/response'
import { getProjectId } from '/api/board.ts'
import { getRole } from '/api/channels.ts'
import { createNotification } from '/api/notifications.ts'
import { rank } from '/api/matching.ts'
import { helpCategories } from '/api/vocabulary.ts'

// « Ils pourraient aider » (§6.6): for each open need of a project, the
// matching (§7.3) proposes the developers who fit it, members set aside.
// It respects what each developer chose: Off, their filters, their minimum
// score. A manager invites one; the invitation is a notification, sent once.

const badRequest = (m: string) => new respond.BadRequestError({ message: m })
const forbidden = (m: string) => new respond.ForbiddenError({ message: m })

// Per need: the best of the matching
export const HELPERS_PER_NEED = 3
// An invitation is sent once a month per developer and project
const INVITE_WINDOW = 30 * 24 * 3600

const getProject = sql<
  { projectId: number; ownerId: number; skills: string | null; name: string },
  number
>`
  SELECT projectId, ownerId, skills, name FROM project WHERE projectId = ?
`.get

const openNeeds = sql<
  { title: string; type: string; skills: string | null },
  number
>`
  SELECT title, type, skills FROM projectNeed
  WHERE projectId = ? AND status = 'open'
  ORDER BY createdAt, projectNeedId
`.all

const members = sql<{ userId: number }, number>`
  SELECT userId FROM projectMember WHERE projectId = ?
`.all

const people = sql<
  { userId: number; login: string; name: string; city: string | null },
  string
>`
  SELECT user.userId, user.githubUsername AS login,
    profile.displayName AS name, profile.city
  FROM user JOIN profile ON profile.userId = user.userId
  WHERE user.userId IN (SELECT value FROM json_each(?))
`.all

const invitations = sql<
  { userId: number },
  { slug: string; since: number }
>`
  SELECT userId FROM notification
  WHERE type = 'project_invite' AND createdAt > :since
    AND json_extract(payload, '$.projectSlug') = :slug
`.all

const leads = (projectId: number, userId: number) => {
  const role = getRole({ projectId, userId })?.role
  return role === 'owner' || role === 'maintainer'
}

// A need of type contribution asks for a contributor; the others are the
// help categories of the matching
const categoryOf = (type: string) =>
  Object.hasOwn(helpCategories, type) ? type : 'contributor_search'

const ids = (json: string | null) => {
  try {
    const list = JSON.parse(json ?? '[]')
    return Array.isArray(list) ? list.filter(Number.isInteger) : []
  } catch {
    return []
  }
}

/**
 * For each open need, the developers the matching proposes, best first,
 * with what fits and whether the managers already invited them
 */
export const listProjectHelpers = (me: number, slug: string) => {
  const visible = getProjectId({ slug, me })
  if (!visible) throw badRequest('Unknown project')
  const project = getProject(visible.projectId)!
  const exclude = new Set(members(project.projectId).map((m) => m.userId))
  exclude.add(me)
  const invited = new Set(
    invitations({ slug, since: now() - INVITE_WINDOW }).map((i) => i.userId),
  )
  const needs = openNeeds(project.projectId).map((need) => {
    const skills = ids(need.skills).length
      ? ids(need.skills)
      : ids(project.skills)
    const ranked = rank({
      authorId: project.ownerId,
      category: categoryOf(need.type),
      skills,
      projectId: project.projectId,
    }, exclude).slice(0, HELPERS_PER_NEED)
    return { title: need.title, ranked }
  })
  const found = new Map(
    people(JSON.stringify(needs.flatMap((n) => n.ranked.map((c) => c.userId))))
      .map((p) => [p.userId, p]),
  )
  return {
    canInvite: leads(project.projectId, me),
    needs: needs.map(({ title, ranked }) => ({
      title,
      helpers: ranked.flatMap((candidate) => {
        const person = found.get(candidate.userId)
        if (!person) return []
        const skills = candidate.reasons.find((r) => r.kind === 'skills')
        const confirmed = candidate.reasons.find((r) => r.kind === 'confirmed')
        return [{
          login: person.login,
          name: person.name,
          city: person.city ?? '',
          score: candidate.score,
          skills: skills && 'skills' in skills ? skills.skills : [],
          confirmed: confirmed && 'count' in confirmed ? confirmed.count : 0,
          invited: invited.has(candidate.userId),
        }]
      }),
    })),
  }
}

const userByLogin = sql<{ userId: number }, string>`
  SELECT userId FROM user WHERE githubUsername = ? COLLATE NOCASE
`.get

/**
 * A manager invites a developer to help on a need: a notification, sent
 * once a month per project, never to a member
 */
export const inviteHelper = (
  me: number,
  input: { slug: string; login: string; need: string },
) => {
  const visible = getProjectId({ slug: input.slug, me })
  if (!visible) throw badRequest('Unknown project')
  if (!leads(visible.projectId, me)) throw forbidden('Only managers invite')
  const target = userByLogin(input.login)
  if (!target || target.userId === me) throw badRequest('Unknown developer')
  if (getRole({ projectId: visible.projectId, userId: target.userId })) {
    throw badRequest('Already a member')
  }
  const need = openNeeds(visible.projectId).find((n) => n.title === input.need)
  if (!need) throw badRequest('Unknown need')
  const already = invitations({
    slug: input.slug,
    since: now() - INVITE_WINDOW,
  }).some((i) => i.userId === target.userId)
  if (!already) {
    const project = getProject(visible.projectId)!
    createNotification({
      userId: target.userId,
      type: 'project_invite',
      category: 'projects',
      actorId: me,
      payload: {
        projectSlug: input.slug,
        project: project.name,
        title: need.title,
      },
    })
  }
  return { invited: true }
}
