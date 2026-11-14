import { db, sql } from '@01edu/db'
import { respond } from '@01edu/api/response'
import { now } from '@01edu/time'
import { type Window, within } from '/api/lib/rate.ts'
import { LIMITS } from '/api/limits.ts'
import { Entry, maybe } from '/api/entries.ts'
import { attach, mediaOf } from '/api/media.ts'
import { Bookmark, Post, Reaction } from '/api/schema.ts'
import { videoOf } from '/api/video-links.ts'

/** The reactions a post can get (§10.1): one since PAM-539, « J'aime » */
export const REACTION_KINDS = ['like']

// Posts saved on the server with their images and their video (PAM-427,
// §10.1, §17.3): written from the composers, read by the feed. Replies,
// reactions and the full feed come with PAM-501.

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

const countPosts = sql<Window, { me: number; since: number }>`
  SELECT count(*) AS n, min(createdAt) AS oldest FROM post
  WHERE authorId = :me AND createdAt > :since
`.get

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

const listRecent = sql<PostRow, number>`${postSelect}
  WHERE post.parentId IS NULL AND post.hiddenAt IS NULL
  ORDER BY post.createdAt DESC
  LIMIT ?
`.all

// Those published since a time: what a feed open on the page lacks (§12.2)
const listSince = sql<PostRow, { after: number; limit: number }>`${postSelect}
  WHERE post.parentId IS NULL AND post.hiddenAt IS NULL
    AND post.createdAt > :after
  ORDER BY post.createdAt DESC
  LIMIT :limit
`.all

// The posts of one developer, for the activity of their profile
const listByAuthor =
  sql<PostRow, { author: string; limit: number }>`${postSelect}
  WHERE post.parentId IS NULL AND post.hiddenAt IS NULL
    AND user.githubUsername = :author
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
  if (ids.length) {
    const json = JSON.stringify(ids)
    for (const r of reactionRows({ me, ids: json })) {
      const entry = reactions.get(r.targetId) ?? { counts: {}, mine: [] }
      entry.counts[r.kind] = r.n
      if (r.mine) entry.mine.push(r.kind)
      reactions.set(r.targetId, entry)
    }
    for (const b of bookmarkRows({ me, ids: json })) bookmarked.add(b.postId)
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
      createdAt: row.createdAt,
    }
  })
}

/**
 * The latest posts, newest first; with `after` (seconds), only those
 * published since: a feed open on the page reads just what is new. With
 * `author`, those of one developer, for their profile.
 */
export const listPosts = (me: number, after = 0, author = '') =>
  shown(
    me,
    author
      ? listByAuthor({ author, limit: 50 })
      : after
      ? listSince({ after, limit: 50 })
      : listRecent(50),
  )

// Posts the developer saved, newest saved first (§10.1)
const listBookmarked = sql<PostRow, number>`${postSelect}
  JOIN bookmark ON bookmark.postId = post.postId AND bookmark.userId = ?
  WHERE post.parentId IS NULL AND post.hiddenAt IS NULL
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

const getBookmark = sql<
  { bookmarkId: number },
  { me: number; postId: number }
>`
  SELECT bookmarkId FROM bookmark WHERE userId = :me AND postId = :postId
`.get
const deleteBookmark = sql<undefined, number>`
  DELETE FROM bookmark WHERE bookmarkId = ?
`.run

/** React to a post with a kind, or take the reaction back (§10.1) */
export const toggleReaction = (me: number, postId: number, kind: string) => {
  if (!REACTION_KINDS.includes(kind)) throw badRequest('Unknown reaction')
  if (!postExists(postId)) throw badRequest('Unknown post')
  const row = getReaction({ me, postId, kind })
  if (row) deleteReaction(row.reactionId)
  else {Reaction.insert({
      userId: me,
      targetType: 'post',
      targetId: postId,
      kind,
    })}
  return { reacted: !row }
}

/** Save a post or remove it from the saved ones (§10.1) */
export const toggleBookmark = (me: number, postId: number) => {
  if (!postExists(postId)) throw badRequest('Unknown post')
  const row = getBookmark({ me, postId })
  if (row) deleteBookmark(row.bookmarkId)
  else Bookmark.insert({ userId: me, postId, createdAt: now() })
  return { bookmarked: !row }
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
