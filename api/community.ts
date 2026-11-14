import { sql } from '@01edu/db'
import { now } from '@01edu/time'
import { respond } from '@01edu/api/response'
import { communityIdOf } from '/api/posts.ts'
import { refreshListeners } from '/api/events.ts'
import { type Window, within } from '/api/lib/rate.ts'

// Join or leave a community (§10.2). Membership feeds the SSE subscriptions
// the server computes (§13.2): a member then receives the community's posts
// in real time. Writes are rate limited like every write route (§16).

export const MEMBERSHIP_RATE = { count: 60, per: 3600 }

const badRequest = (message: string) => new respond.BadRequestError({ message })

type Member = { me: number; communityId: number }

// The unique index community_member keeps one row per developer and
// community: a membership already there is left as it is
const add = sql<undefined, Member & { at: number }>`
  INSERT OR IGNORE INTO communityMember (communityId, userId, role, joinedAt)
  VALUES (:communityId, :me, 'member', :at)
`.run
const remove = sql<undefined, Member>`
  DELETE FROM communityMember WHERE userId = :me AND communityId = :communityId
`.run

const countJoins = sql<Window, { me: number; since: number }>`
  SELECT count(*) AS n, min(joinedAt) AS oldest FROM communityMember
  WHERE userId = :me AND joinedAt > :since
`.get

/**
 * Sets membership of a community to the state the developer asked for. The
 * same request sent twice, from a retry or a second tab, gives the same
 * result: a click to join never leaves.
 */
export const setMembership = (me: number, slug: string, join: boolean) => {
  const communityId = communityIdOf(slug)
  if (!communityId) throw badRequest('Unknown community')
  within(
    countJoins,
    MEMBERSHIP_RATE,
    me,
    'Too many community changes this hour',
  )
  join ? add({ me, communityId, at: now() }) : remove({ me, communityId })
  // The member's open connections now receive the community's posts, or stop
  // receiving them (§13.2)
  refreshListeners(me)
  return { joined: join }
}
