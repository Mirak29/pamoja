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
 * Toggles a follow: adds it when it is missing, removes it when it is there.
 * Returns the new state and how many followers the target now has.
 */
export const toggleFollow = (
  me: number,
  targetType: FollowTarget,
  target: string,
) => {
  const targetId = targetIdOf(targetType, target)
  if (!targetId) throw badRequest('Unknown target')
  if (targetType === 'user' && targetId === me) {
    throw badRequest('One does not follow oneself')
  }
  within(countFollows, FOLLOW_RATE, me, 'Too many follows this hour')
  const following = db.transaction(() => {
    const row = existing({ me, targetType, targetId })
    if (row) {
      remove({ followId: row.followId })
      return false
    }
    Follow.insert({ followerId: me, targetType, targetId, createdAt: now() })
    return true
  })()
  // Every open connection of the follower now receives what the target
  // publishes, or stops receiving it (§13.2)
  refreshListeners(me)
  return {
    following,
    followers: countFollowers({ targetType, targetId })?.n ?? 0,
  }
}
