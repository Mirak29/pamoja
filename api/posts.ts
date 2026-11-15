import { db, sql } from '@01edu/db'
import { respond } from '@01edu/api/response'
import { now } from '@01edu/time'
import { memoryLimit, type Window, within } from '/api/lib/rate.ts'
import { LIMITS } from '/api/limits.ts'
import { Entry, maybe } from '/api/entries.ts'
import { attach, mediaOf } from '/api/media.ts'
import { Post } from '/api/schema.ts'
import { videoOf } from '/api/video-links.ts'
import { createNotification } from '/api/notifications.ts'
import { eligibilityOf, RULES_VERSION } from '/api/reputation.ts'
import { evaluateBadges } from '/api/badges.ts'

/** The reactions a post can get (§10.1): one since PAM-539, « J'aime » */
export const REACTION_KINDS = ['like']

// Posts saved on the server with their images and their video (PAM-427,
// §10.1, §17.3): written from the composers, read by the feed with their
// likes, bookmarks, replies and reposts (PAM-501).

/** The types of a post a member writes (§10.1) */
export const POST_TYPES = [
  'Discussion',
  'Question',
  'Mise à jour de projet',
  'Vitrine',
  'Ressource',
  'Opportunité',
  'Release',
]

export const POST_MEDIA_MAX = 4
export const POST_RATE = { count: 20, per: 3600 }

export type PostInput = {
  community: string
  type: string
  title: string
  body: string
  media?: number[] | null
  videoUrl?: string | null
}

const badRequest = (message: string) => new respond.BadRequestError({ message })

// Posts written by the developer: replies and reposts have their own limit
const countPosts = sql<Window, { me: number; since: number }>`
  SELECT count(*) AS n, min(createdAt) AS oldest FROM post
  WHERE authorId = :me AND createdAt > :since
    AND parentId IS NULL AND repostOfId IS NULL
`.get

const countReplies = sql<Window, { me: number; since: number }>`
  SELECT count(*) AS n, min(createdAt) AS oldest FROM post
  WHERE authorId = :me AND createdAt > :since AND parentId IS NOT NULL
`.get

// A social network: limits that stop a script, never a lively discussion
// (§16). A like, a repost or a bookmark taken back is never counted.
export const REPLY_RATE = { count: 300, per: 3600 }
export const LIKE_RATE = { count: 1000, per: 3600 }
export const REPOST_RATE = { count: 200, per: 3600 }
export const BOOKMARK_RATE = { count: 500, per: 3600 }
const liked = memoryLimit(LIKE_RATE, 'Too many likes this hour')
const reposted = memoryLimit(REPOST_RATE, 'Too many reposts this hour')
const bookmarked = memoryLimit(BOOKMARK_RATE, 'Too many bookmarks this hour')

const getCommunity = sql<{ communityId: number }, string>`
  SELECT communityId FROM community WHERE slug = ?
`.get

/** The id of a community by its slug, undefined when there is none */
export const communityIdOf = (slug: string) => getCommunity(slug)?.communityId

type PostRow = {
  postId: number
  author: string
  authorName: string
  community: string | null
  type: string
  title: string | null
  body: string
  videoUrl: string | null
  createdAt: number
}

const postSelect = `
  SELECT post.postId, user.githubUsername AS author,
    profile.displayName AS authorName, community.slug AS community,
    post.type, post.title, post.body, post.videoUrl, post.createdAt
  FROM post
  JOIN user ON user.userId = post.authorId
  JOIN profile ON profile.userId = post.authorId
  LEFT JOIN community ON community.communityId = post.communityId
`

// A post of the feed: neither a reply nor a repost, which is shown on the
// post it points at (§10.1)
const original = `post.parentId IS NULL AND post.repostOfId IS NULL
  AND post.hiddenAt IS NULL`

// When a post last came into the feeds: published, or reposted since
const lastSeen = `
  SELECT postId, createdAt AS at FROM post
  WHERE parentId IS NULL AND repostOfId IS NULL AND hiddenAt IS NULL
  UNION ALL
  SELECT repostOfId, createdAt FROM post
  WHERE repostOfId IS NOT NULL AND hiddenAt IS NULL
`

// The latest posts, a repost bringing an older one back into them
const listRecent = sql<PostRow, number>`${postSelect}
  WHERE ${original} AND post.postId IN (
    SELECT postId FROM (${lastSeen})
    GROUP BY postId ORDER BY max(at) DESC LIMIT ?
  )
  ORDER BY post.createdAt DESC
`.all

// The page before a time: posts that last came into the feeds earlier, for
// a feed read further down (cursor, §12.7)
const listBefore = sql<PostRow, { before: number; limit: number }>`${postSelect}
  WHERE ${original} AND post.postId IN (
    SELECT postId FROM (${lastSeen})
    GROUP BY postId HAVING max(at) < :before
    ORDER BY max(at) DESC LIMIT :limit
  )
  ORDER BY post.createdAt DESC
`.all

// Those published or reposted since a time: what a feed open on the page
// lacks (§12.2)
const listSince = sql<PostRow, { after: number; limit: number }>`${postSelect}
  WHERE ${original} AND post.postId IN (
    SELECT postId FROM (${lastSeen}) WHERE at > :after
    GROUP BY postId ORDER BY max(at) DESC LIMIT :limit
  )
  ORDER BY post.createdAt DESC
`.all

// The posts of one developer, for the activity of their profile
const listByAuthor =
  sql<PostRow, { author: string; limit: number }>`${postSelect}
  WHERE ${original} AND user.githubUsername = :author COLLATE NOCASE
  ORDER BY post.createdAt DESC
  LIMIT :limit
`.all

// The replies of one developer, for the activity of their profile
const listRepliesByAuthor = sql<
  PostRow & { parentId: number; rootId: number },
  { author: string; limit: number }
>`
  SELECT post.postId, post.parentId, post.rootId, user.githubUsername AS author,
    profile.displayName AS authorName, community.slug AS community,
    post.type, post.title, post.body, post.videoUrl, post.createdAt
  FROM post
  JOIN user ON user.userId = post.authorId
  JOIN profile ON profile.userId = post.authorId
  LEFT JOIN community ON community.communityId = post.communityId
  WHERE post.parentId IS NOT NULL AND post.hiddenAt IS NULL
    AND user.githubUsername = :author COLLATE NOCASE
  ORDER BY post.createdAt DESC
  LIMIT :limit
`.all

const getOne = sql<PostRow, number>`${postSelect}
  WHERE post.postId = ?
`.get

// Reactions and bookmarks of a batch of posts (§10.1), read with the feed
const reactionRows = sql<
  { targetId: number; kind: string; n: number; mine: number },
  { me: number; ids: string }
>`
  SELECT targetId, kind, count(*) AS n, max(userId = :me) AS mine FROM reaction
  WHERE targetType = 'post' AND targetId IN (SELECT value FROM json_each(:ids))
  GROUP BY targetId, kind
`.all

// The replies of each post, those shown: a hidden one is not counted
const replyRows = sql<{ parentId: number; n: number }, string>`
  SELECT parentId, count(*) AS n FROM post
  WHERE parentId IN (SELECT value FROM json_each(?)) AND hiddenAt IS NULL
  GROUP BY parentId
`.all

// Who reposted each post, and when, oldest first
const repostRows = sql<
  { postId: number; by: string; name: string; at: number },
  string
>`
  SELECT post.repostOfId AS postId, user.githubUsername AS by,
    profile.displayName AS name, post.createdAt AS at
  FROM post JOIN user ON user.userId = post.authorId
  JOIN profile ON profile.userId = post.authorId
  WHERE post.repostOfId IN (SELECT value FROM json_each(?))
    AND post.hiddenAt IS NULL
  ORDER BY post.createdAt ASC
`.all

const bookmarkRows = sql<{ postId: number }, { me: number; ids: string }>`
  SELECT postId FROM bookmark
  WHERE userId = :me AND postId IN (SELECT value FROM json_each(:ids))
`.all

const shown = (me: number, rows: PostRow[]) => {
  const ids = rows.map((row) => row.postId)
  const media = mediaOf('post', ids)
  const reactions = new Map<
    number,
    { counts: Record<string, number>; mine: string[] }
  >()
  const bookmarked = new Set<number>()
  const replies = new Map<number, number>()
  const reposts = new Map<number, { by: string; name: string; at: number }[]>()
  if (ids.length) {
    const json = JSON.stringify(ids)
    for (const r of reactionRows({ me, ids: json })) {
      const entry = reactions.get(r.targetId) ?? { counts: {}, mine: [] }
      entry.counts[r.kind] = r.n
      if (r.mine) entry.mine.push(r.kind)
      reactions.set(r.targetId, entry)
    }
    for (const b of bookmarkRows({ me, ids: json })) bookmarked.add(b.postId)
    for (const r of replyRows(json)) replies.set(r.parentId, r.n)
    for (const r of repostRows(json)) {
      const list = reposts.get(r.postId) ?? []
      list.push({ by: r.by, name: r.name, at: r.at })
      reposts.set(r.postId, list)
    }
  }
  return rows.map((row) => {
    const r = reactions.get(row.postId)
    return {
      id: row.postId,
      author: row.author,
      authorName: row.authorName,
      community: row.community ?? '',
      type: row.type,
      title: row.title ?? '',
      body: row.body,
      media: media.get(row.postId) ?? [],
      videoUrl: row.videoUrl ?? '',
      reactions: { like: r?.counts.like ?? 0 },
      // The kinds the developer reacted with, and whether they saved it
      mine: r?.mine ?? [],
      bookmarked: bookmarked.has(row.postId),
      // Counted by the server: the page knows them before the thread is read
      replies: replies.get(row.postId) ?? 0,
      reposts: reposts.get(row.postId) ?? [],
      createdAt: row.createdAt,
    }
  })
}

/**
 * The latest posts, newest first; with `after` (seconds), only those
 * published or reposted since: a feed open on the page reads just what is
 * new. With `before`, the page before that time, for a feed read further
 * down. With `author`, those of one developer, for their profile.
 */
export const listPosts = (
  me: number,
  after = 0,
  author = '',
  before = 0,
) =>
  shown(
    me,
    author
      ? listByAuthor({ author, limit: FEED_PAGE })
      : after
      ? listSince({ after, limit: FEED_PAGE })
      : before
      ? listBefore({ before, limit: FEED_PAGE })
      : listRecent(FEED_PAGE),
  )

/** Posts read at once by the feed: fewer means it reached its start */
export const FEED_PAGE = 50

/** The replies of one developer, with where they go, for their profile */
export const listRepliesOf = (me: number, author: string) => {
  const rows = listRepliesByAuthor({ author, limit: 50 })
  const place = new Map(rows.map((row) => [row.postId, row]))
  return shown(me, rows).map((p) => ({
    ...p,
    parentId: place.get(p.id)!.parentId,
    rootId: place.get(p.id)!.rootId,
  }))
}

// Posts the developer saved, newest saved first (§10.1)
const listBookmarked = sql<PostRow, number>`${postSelect}
  JOIN bookmark ON bookmark.postId = post.postId AND bookmark.userId = ?
  WHERE ${original}
  ORDER BY bookmark.createdAt DESC
  LIMIT 50
`.all

/** The posts the developer bookmarked, for the « Enregistrés » page */
export const listSaved = (me: number) => shown(me, listBookmarked(me))

const postExists = sql<{ postId: number }, number>`
  SELECT postId FROM post WHERE postId = ? AND hiddenAt IS NULL
`.get

const getReaction = sql<
  { reactionId: number },
  { me: number; postId: number; kind: string }
>`
  SELECT reactionId FROM reaction
  WHERE userId = :me AND targetType = 'post' AND targetId = :postId
    AND kind = :kind
`.get
const deleteReaction = sql<undefined, number>`
  DELETE FROM reaction WHERE reactionId = ?
`.run
// Two requests at the same time: the second finds the row written
const addReaction = sql<
  undefined,
  { me: number; postId: number; kind: string }
>`
  INSERT INTO reaction (userId, targetType, targetId, kind)
  VALUES (:me, 'post', :postId, :kind)
  ON CONFLICT DO NOTHING
`.run

const getBookmark = sql<
  { bookmarkId: number },
  { me: number; postId: number }
>`
  SELECT bookmarkId FROM bookmark WHERE userId = :me AND postId = :postId
`.get
const deleteBookmark = sql<undefined, number>`
  DELETE FROM bookmark WHERE bookmarkId = ?
`.run
const addBookmark = sql<undefined, { me: number; postId: number; at: number }>`
  INSERT INTO bookmark (userId, postId, createdAt) VALUES (:me, :postId, :at)
  ON CONFLICT DO NOTHING
`.run

/**
 * Puts a reaction on a post, or takes it back (§10.1). The request says the
 * state wanted, never a toggle: replayed, or sent from a tab that missed a
 * change, it gives the same result (§15)
 */
export const setReaction = (
  me: number,
  postId: number,
  kind: string,
  on: boolean,
) => {
  if (!REACTION_KINDS.includes(kind)) throw badRequest('Unknown reaction')
  if (!postExists(postId)) throw badRequest('Unknown post')
  const row = getReaction({ me, postId, kind })
  if (on && !row) {
    liked(me)
    addReaction({ me, postId, kind })
  }
  if (!on && row) deleteReaction(row.reactionId)
  return { reacted: on }
}

/** Saves a post or removes it from the saved ones, as wanted (§10.1, §15) */
export const setBookmark = (me: number, postId: number, on: boolean) => {
  if (!postExists(postId)) throw badRequest('Unknown post')
  const row = getBookmark({ me, postId })
  if (on && !row) {
    bookmarked(me)
    addBookmark({ me, postId, at: now() })
  }
  if (!on && row) deleteBookmark(row.bookmarkId)
  return { bookmarked: on }
}

const getRepost = sql<
  { postId: number; hiddenAt: number | null },
  { me: number; postId: number }
>`
  SELECT postId, hiddenAt FROM post WHERE authorId = :me AND repostOfId = :postId
`.get
// A repost taken back stays in the table, where its entries point, hidden
const withdrawRepost =
  sql<undefined, { me: number; postId: number; at: number }>`
  UPDATE post SET hiddenAt = :at, updatedAt = :at
  WHERE authorId = :me AND repostOfId = :postId AND hiddenAt IS NULL
`.run
const renewRepost = sql<undefined, { repostId: number; at: number }>`
  UPDATE post SET hiddenAt = NULL, createdAt = :at, updatedAt = :at
  WHERE postId = :repostId
`.run

/**
 * Reposts a post, or takes the repost back, as wanted (§10.1, §15). A
 * repost is a post that points at its original: it brings it into the feed
 * of the followers, and its author is told the first time
 */
export const setRepost = (me: number, postId: number, on: boolean) => {
  const target = getFull(postId)
  if (!target || target.parentId || target.repostOfId) {
    throw badRequest('Unknown post')
  }
  const row = getRepost({ me, postId })
  if (!on) {
    withdrawRepost({ me, postId, at: now() })
    return { reposted: false }
  }
  if (row && row.hiddenAt === null) return { reposted: true }
  reposted(me)
  db.transaction(() => {
    const at = now()
    const repostId = row?.postId ?? Post.insert({
      authorId: me,
      communityId: target.communityId,
      type: 'Repost',
      title: null,
      body: '',
      repostOfId: postId,
      source: 'platform',
      createdAt: at,
      updatedAt: at,
    })
    if (row) renewRepost({ repostId, at })
    // The followers and the community read it in direct (§12.2)
    Entry.insert.POST_REPOSTED({
      userId: me,
      communityId: maybe(target.communityId),
      postId: repostId,
      source: 'platform',
    })
    if (!row && target.authorId !== me) {
      createNotification({
        userId: target.authorId,
        type: 'repost',
        category: 'communities',
        actorId: me,
        payload: { postId, excerpt: excerpt(target) },
      })
    }
  })()
  return { reposted: true }
}

/** Publishes a post with its images and its video, checked first */
export const createPost = (me: number, input: PostInput) => {
  const title = input.title.trim()
  const body = input.body.trim()
  const videoUrl = input.videoUrl?.trim() ?? ''
  const media = input.media ?? []
  if (!POST_TYPES.includes(input.type)) throw badRequest('Unknown post type')
  if (!body) throw badRequest('A post needs a body')
  if (title.length > LIMITS.postTitle || body.length > LIMITS.post) {
    throw badRequest('Text too long')
  }
  if (media.length > POST_MEDIA_MAX) {
    throw badRequest(`${POST_MEDIA_MAX} images at most`)
  }
  if (videoUrl && !videoOf(videoUrl)) {
    throw badRequest('A YouTube, Loom or Vimeo link')
  }
  const community = input.community ? getCommunity(input.community) : null
  if (input.community && !community) throw badRequest('Unknown community')
  within(countPosts, POST_RATE, me, 'Too many posts this hour')
  const postId = db.transaction(() => {
    const at = now()
    const postId = Post.insert({
      authorId: me,
      communityId: community?.communityId ?? null,
      type: input.type,
      title: title || null,
      body,
      source: 'platform',
      createdAt: at,
      updatedAt: at,
      videoUrl: videoUrl || null,
    })
    attach(me, media, 'post', postId)
    // The feeds of its audience read it at once (§12.2)
    Entry.insert.POST_CREATED({
      userId: me,
      communityId: maybe(community?.communityId),
      postId,
      source: 'platform',
    })
    return postId
  })()
  return shown(me, [getOne(postId)!])[0]
}

// A reply, an accepted answer and a thread read (PAM-512, §10.1, §12.7).
// A reply is a post with a parent; accepting an answer makes it count as
// Community Help for its author (§8).

type Full = {
  postId: number
  authorId: number
  communityId: number | null
  type: string
  title: string | null
  body: string
  parentId: number | null
  rootId: number | null
  repostOfId: number | null
  acceptedReplyId: number | null
}

const getFull = sql<Full, number>`
  SELECT postId, authorId, communityId, type, title, body,
    parentId, rootId, repostOfId, acceptedReplyId
  FROM post WHERE postId = ? AND hiddenAt IS NULL
`.get

// The whole thread, the root and its replies, oldest first; the page nests
// it by parent. The root itself has no rootId, so it is matched by its id.
const listThread = sql<
  PostRow & { parentId: number | null },
  { root: number }
>`
  SELECT post.postId, post.parentId, user.githubUsername AS author,
    profile.displayName AS authorName, community.slug AS community,
    post.type, post.title, post.body, post.videoUrl, post.createdAt
  FROM post
  JOIN user ON user.userId = post.authorId
  JOIN profile ON profile.userId = post.authorId
  LEFT JOIN community ON community.communityId = post.communityId
  WHERE (post.postId = :root OR post.rootId = :root) AND post.hiddenAt IS NULL
  ORDER BY post.createdAt ASC
  LIMIT 200
`.all

const setAccepted = sql<
  undefined,
  { postId: number; replyId: number; at: number }
>`
  UPDATE post SET acceptedReplyId = :replyId, updatedAt = :at
  WHERE postId = :postId
`.run

const excerpt = (post: Full) => (post.title || post.body).slice(0, 90)

/** Publishes a reply to a post; its author is told (§10.1) */
export const createReply = (me: number, parentId: number, text: string) => {
  const body = text.trim()
  if (!body) throw badRequest('A reply needs a body')
  if (body.length > LIMITS.reply) throw badRequest('Text too long')
  const parent = getFull(parentId)
  if (!parent) throw badRequest('Unknown post')
  within(countReplies, REPLY_RATE, me, 'Too many replies this hour')
  const rootId = parent.rootId ?? parent.postId
  const replyId = db.transaction(() => {
    const at = now()
    const replyId = Post.insert({
      authorId: me,
      communityId: parent.communityId,
      type: 'Réponse',
      title: null,
      body,
      parentId,
      rootId,
      source: 'platform',
      createdAt: at,
      updatedAt: at,
    })
    // The feeds of the community read it in direct (§12.2)
    Entry.insert.POST_REPLIED({
      userId: me,
      communityId: maybe(parent.communityId),
      postId: replyId,
      source: 'platform',
    })
    // The author of the post replied to learns of it, never for their own
    if (parent.authorId !== me) {
      createNotification({
        userId: parent.authorId,
        type: 'reply',
        category: 'communities',
        actorId: me,
        payload: {
          postId: parent.postId,
          onReply: parent.parentId ? 1 : 0,
          excerpt: body.slice(0, 90),
        },
      })
    }
    return replyId
  })()
  return shown(me, [getOne(replyId)!])[0]
}

/**
 * Accepts a reply as the answer: only the author of the question may, once,
 * and the answer then counts as Community Help for its author (§8, §10.1)
 */
export const acceptAnswer = (
  me: number,
  questionId: number,
  replyId: number,
) => {
  const question = getFull(questionId)
  if (!question) throw badRequest('Unknown post')
  if (question.authorId !== me) {
    throw new respond.ForbiddenError({ message: 'Only the author accepts' })
  }
  if (question.type !== 'Question') throw badRequest('Not a question')
  if (question.acceptedReplyId) throw badRequest('Already answered')
  const reply = getFull(replyId)
  const root = reply && (reply.rootId ?? reply.postId)
  if (!reply || root !== questionId) throw badRequest('Not a reply of it')
  if (reply.authorId === me) throw badRequest('Not your own answer')
  db.transaction(() => {
    const at = now()
    setAccepted({ postId: questionId, replyId, at })
    const decision = eligibilityOf(reply.authorId, me, at)
    // A proof of Community Help, frozen so it never changes (§8.3)
    Entry.insert.ANSWER_ACCEPTED({
      userId: reply.authorId,
      communityId: maybe(question.communityId),
      postId: replyId,
      askerId: me,
      rulesVersion: RULES_VERSION,
      source: 'platform',
      ...decision,
    })
    // The proof counts at once: the badges of the answer's author (§8.2)
    evaluateBadges(reply.authorId, at)
    createNotification({
      userId: reply.authorId,
      type: 'answer_accepted',
      category: 'communities',
      actorId: me,
      payload: {
        postId: questionId,
        eligible: decision.eligible,
        excerpt: excerpt(question),
      },
    })
  })()
  return { accepted: true }
}

/** A post with its whole thread, for the shared link and a reload (§12.7) */
export const readThread = (me: number, postId: number) => {
  const post = getFull(postId)
  if (!post) throw badRequest('Unknown post')
  const rootId = post.rootId ?? post.postId
  // Oldest first, so a parent comes before its replies: a reply whose parent
  // was hidden leaves with it (§10.5)
  const kept = new Set<number>()
  const rows = listThread({ root: rootId }).filter((row) => {
    const visible = row.postId === rootId ||
      (row.parentId !== null && kept.has(row.parentId))
    visible && kept.add(row.postId)
    return visible
  })
  const parents = new Map(rows.map((row) => [row.postId, row.parentId]))
  const roots = getFull(rootId)
  return {
    // Every post of the thread, shown with its reactions and bookmark
    posts: shown(me, rows).map((p) => ({
      ...p,
      parentId: parents.get(p.id) ?? 0,
    })),
    rootId,
    acceptedReplyId: roots?.acceptedReplyId ?? 0,
  }
}
