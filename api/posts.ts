import { db, sql } from '@01edu/db'
import { respond } from '@01edu/api/response'
import { now } from '@01edu/time'
import { type Window, within } from '/api/lib/rate.ts'
import { LIMITS } from '/api/limits.ts'
import { Entry, maybe } from '/api/entries.ts'
import { attach, mediaOf } from '/api/media.ts'
import { Post } from '/api/schema.ts'
import { videoOf } from '/api/video-links.ts'

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

const getOne = sql<PostRow, number>`${postSelect}
  WHERE post.postId = ?
`.get

const shown = (rows: PostRow[]) => {
  const media = mediaOf('post', rows.map((row) => row.postId))
  return rows.map((row) => ({
    id: row.postId,
    author: row.author,
    authorName: row.authorName,
    community: row.community ?? '',
    type: row.type,
    title: row.title ?? '',
    body: row.body,
    media: media.get(row.postId) ?? [],
    videoUrl: row.videoUrl ?? '',
    createdAt: row.createdAt,
  }))
}

/** The latest posts, newest first: what the feed reads */
/**
 * The latest posts; with `after` (seconds), only those published since: a
 * feed open on the page reads just what is new
 */
export const listPosts = (after = 0) =>
  shown(after ? listSince({ after, limit: 50 }) : listRecent(50))

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
  return shown([getOne(postId)!])[0]
}
