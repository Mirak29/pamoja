import { db, sql } from '@01edu/db'
import { now } from '@01edu/time'
import { respond } from '@01edu/api/response'
import { communityIdOf } from '/api/posts.ts'
import { refreshListeners } from '/api/events.ts'
import { type Window, within } from '/api/lib/rate.ts'
import { Community, CommunityMember } from '/api/schema.ts'
import { slugOf } from '/api/vocabulary.ts'
import { LIMITS } from '/api/limits.ts'
import { reindex } from '/api/search.ts'
import { MEILI_URL } from '/api/lib/env.ts'

// Join or leave a community, and create one (§10.2). Membership feeds the SSE
// subscriptions the server computes (§13.2): a member then receives the
// community's posts in real time. Writes are rate limited (§16).

export const MEMBERSHIP_RATE = { count: 60, per: 3600 }
export const CREATE_RATE = { count: 10, per: 3600 }

/** The types of a community, stored in English (§10.2) */
export const COMMUNITY_TYPES = ['technology', 'country', 'domain']

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
  // Only a join counts: leaving is never refused
  join && within(countJoins, MEMBERSHIP_RATE, me, 'Too many joins this hour')
  join ? add({ me, communityId, at: now() }) : remove({ me, communityId })
  // The member's open connections now receive the community's posts, or stop
  // receiving them (§13.2)
  refreshListeners(me)
  return { joined: join }
}

const slugTaken = sql<{ taken: number }, string>`
  SELECT 1 AS taken FROM community WHERE slug = ?
`.get

const listAll = sql<
  {
    slug: string
    name: string
    type: string
    description: string
    members: number
    joined: number
  },
  { me: number }
>`
  SELECT community.slug, community.name, community.type, community.description,
    (SELECT count(*) FROM communityMember
      WHERE communityMember.communityId = community.communityId) AS members,
    EXISTS (SELECT 1 FROM communityMember
      WHERE communityMember.communityId = community.communityId
        AND communityMember.userId = :me) AS joined
  FROM community
  ORDER BY community.createdAt
`.all

/**
 * Every community with its member count and whether the developer belongs to
 * it: the page starts from the server, so a community created on it is there
 * after a reload (§10.2)
 */
export const listCommunities = (me: number) =>
  listAll({ me }).map((row) => ({ ...row, joined: !!row.joined }))

const countCreated = sql<Window, { me: number; since: number }>`
  SELECT count(*) AS n, min(joinedAt) AS oldest FROM communityMember
  WHERE userId = :me AND role = 'moderator' AND joinedAt > :since
`.get

export type CommunityDraft = { name: string; type: string; description: string }

/**
 * Creates a community (§10.2): the developer is its first member, a
 * moderator. The slug comes from the name, with a suffix if it is taken.
 * The new community is reindexed in search right away (§10.4).
 */
export const createCommunity = (me: number, draft: CommunityDraft) => {
  const name = draft.name.trim()
  const description = draft.description.trim()
  if (!name) throw badRequest('A community needs a name')
  if (!COMMUNITY_TYPES.includes(draft.type)) throw badRequest('Unknown type')
  if (
    name.length > LIMITS.communityName ||
    description.length > LIMITS.communityDescription
  ) throw badRequest('Text too long')
  const base = slugOf(name)
  if (!base) throw badRequest('A community needs a name in letters')
  within(countCreated, CREATE_RATE, me, 'Too many communities this hour')

  const { communityId, slug } = db.transaction(() => {
    let slug = base
    for (let k = 2; slugTaken(slug); k++) slug = `${base}-${k}`
    const at = now()
    const communityId = Community.insert({
      slug,
      name,
      type: draft.type,
      description: description || 'Nouvelle communauté sur Pamoja.',
      source: 'platform',
      createdAt: at,
    })
    // Its creator moderates it and reads its posts in direct (§13.2)
    CommunityMember.insert({
      communityId,
      userId: me,
      role: 'moderator',
      joinedAt: at,
    })
    return { communityId, slug }
  })()
  refreshListeners(me)
  // Found at once: it is in SQLite; Meilisearch is caught up in the
  // background, and the nightly rebuild has it anyway (§10.4)
  if (MEILI_URL) void reindex('communities', [communityId]).catch(() => {})
  return { slug, name, type: draft.type, description }
}
