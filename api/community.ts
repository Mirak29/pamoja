import { db, sql } from '@01edu/db'
import { now } from '@01edu/time'
import { respond } from '@01edu/api/response'
import { CommunityMember } from '/api/schema.ts'
import { refreshListeners } from '/api/events.ts'
import { type Window, within } from '/api/lib/rate.ts'

// Join or leave a community (§10.2). Membership feeds the SSE subscriptions
// the server computes (§13.2): a member then receives the community's posts
// in real time. Writes are rate limited like every write route (§16).

export const MEMBERSHIP_RATE = { count: 60, per: 3600 }

const badRequest = (message: string) => new respond.BadRequestError({ message })

const getCommunityId = sql<{ communityId: number }, string>`
  SELECT communityId FROM community WHERE slug = ?
`.get

const membership = sql<
  { communityMemberId: number },
  { me: number; communityId: number }
>`
  SELECT communityMemberId FROM communityMember
  WHERE userId = :me AND communityId = :communityId
`.get

const remove = sql<undefined, { communityMemberId: number }>`
  DELETE FROM communityMember WHERE communityMemberId = :communityMemberId
`.run

const countMembers = sql<{ n: number }, number>`
  SELECT count(*) AS n FROM communityMember WHERE communityId = ?
`.get

const countJoins = sql<Window, { me: number; since: number }>`
  SELECT count(*) AS n, min(joinedAt) AS oldest FROM communityMember
  WHERE userId = :me AND joinedAt > :since
`.get

/**
 * Sets membership of a community to the state the developer asked for. The
 * same request sent twice, from a retry or a second tab, gives the same
 * result: a click to join never leaves. Returns the state and the members.
 */
export const setMembership = (me: number, slug: string, join: boolean) => {
  const community = getCommunityId(slug)
  if (!community) throw badRequest('Unknown community')
  const communityId = community.communityId
  within(
    countJoins,
    MEMBERSHIP_RATE,
    me,
    'Too many community changes this hour',
  )
  db.transaction(() => {
    const row = membership({ me, communityId })
    if (row && !join) remove({ communityMemberId: row.communityMemberId })
    if (!row && join) {
      CommunityMember.insert({
        communityId,
        userId: me,
        role: 'member',
        joinedAt: now(),
      })
    }
  })()
  // The member's open connections now receive the community's posts, or stop
  // receiving them (§13.2)
  refreshListeners(me)
  return { joined: join, members: countMembers(communityId)?.n ?? 0 }
}
