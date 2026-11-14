import { db, sql } from '@01edu/db'
import { now } from '@01edu/time'
import { respond } from '@01edu/api/response'
import { Follow } from '/api/schema.ts'
import { refreshListeners } from '/api/events.ts'
import { userIdOfLogin } from '/api/user.ts'
import { type Window, within } from '/api/lib/rate.ts'

// Follow or unfollow a developer, a project or a community (§14.1). A follow
// feeds the SSE subscriptions computed by the server (§13.2): the follower
// then receives in real time what the target publishes. Writes are rate
// limited like every write route (§16).

export type FollowTarget = 'user' | 'project' | 'community'

export const FOLLOW_TARGETS: FollowTarget[] = ['user', 'project', 'community']

export const FOLLOW_RATE = { count: 60, per: 3600 }

const badRequest = (message: string) => new respond.BadRequestError({ message })

const getProjectId = sql<{ projectId: number }, string>`
  SELECT projectId FROM project WHERE slug = ? AND visibility = 'public'
`.get
const getCommunityId = sql<{ communityId: number }, string>`
  SELECT communityId FROM community WHERE slug = ?
`.get

// The public handle a client sends (a login or a slug) to the id the follow
// stores; undefined when nothing public matches
const targetIdOf = (targetType: FollowTarget, target: string) => {
  switch (targetType) {
    case 'user':
      return userIdOfLogin(target)
    case 'project':
      return getProjectId(target)?.projectId
    case 'community':
      return getCommunityId(target)?.communityId
  }
}

const existing = sql<
  { followId: number },
  { me: number; targetType: string; targetId: number }
>`
  SELECT followId FROM follow
  WHERE followerId = :me AND targetType = :targetType AND targetId = :targetId
`.get

const remove = sql<undefined, { followId: number }>`
  DELETE FROM follow WHERE followId = :followId
`.run

const countFollowers = sql<
  { n: number },
  { targetType: string; targetId: number }
>`
  SELECT count(*) AS n FROM follow
  WHERE targetType = :targetType AND targetId = :targetId
`.get

const countFollows = sql<Window, { me: number; since: number }>`
  SELECT count(*) AS n, min(createdAt) AS oldest FROM follow
  WHERE followerId = :me AND createdAt > :since
`.get

/**
 * Sets a follow to the state the developer asked for. The same request sent
 * twice, from a retry or a second tab, gives the same result: never a follow
 * undone by a click meant to follow. Returns the state and the followers.
 */
export const setFollow = (
  me: number,
  targetType: FollowTarget,
  target: string,
  follow: boolean,
) => {
  const targetId = targetIdOf(targetType, target)
  if (!targetId) throw badRequest('Unknown target')
  if (targetType === 'user' && targetId === me) {
    throw badRequest('One does not follow oneself')
  }
  within(countFollows, FOLLOW_RATE, me, 'Too many follows this hour')
  db.transaction(() => {
    const row = existing({ me, targetType, targetId })
    if (row && !follow) remove({ followId: row.followId })
    if (!row && follow) {
      Follow.insert({ followerId: me, targetType, targetId, createdAt: now() })
    }
  })()
  // Every open connection of the follower now receives what the target
  // publishes, or stops receiving it (§13.2)
  refreshListeners(me)
  return {
    following: follow,
    followers: countFollowers({ targetType, targetId })?.n ?? 0,
  }
}

const followedUsers = sql<{ login: string }, number>`
  SELECT user.githubUsername AS login FROM follow
  JOIN user ON user.userId = follow.targetId
  WHERE follow.followerId = ? AND follow.targetType = 'user'
`.all
const followedProjects = sql<{ slug: string }, number>`
  SELECT project.slug FROM follow
  JOIN project ON project.projectId = follow.targetId
  WHERE follow.followerId = ? AND follow.targetType = 'project'
`.all
const followedCommunities = sql<{ slug: string }, number>`
  SELECT community.slug FROM follow
  JOIN community ON community.communityId = follow.targetId
  WHERE follow.followerId = ? AND follow.targetType = 'community'
`.all

/** What a developer follows: the page starts from it at every load */
export const followsOf = (me: number) => ({
  users: followedUsers(me).map((row) => row.login),
  projects: followedProjects(me).map((row) => row.slug),
  communities: followedCommunities(me).map((row) => row.slug),
})
