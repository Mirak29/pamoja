import { me } from '/web/fixtures/people.ts'
import {
  adoptPosts,
  adoptReplies,
  isKnownPost,
  type PostDraft,
  publishPost,
  savedId,
} from '/web/fixtures/posts.ts'
import { api, type ApiOutput } from '/web/lib/api.ts'
import { FEED_PAGE } from '/api/limits.ts'
import { signal } from '@preact/signals'

// Posts saved on the server with their images and their video (PAM-427),
// read with their likes, reposts and replies (PAM-501)

type Saved = ApiOutput['GET/api/posts']

const page = (author = '', before = 0) =>
  api['GET/api/posts'].fetch({
    author,
    before: before ? String(before) : '',
  })

// Where the feed is read to: the oldest moment a post it read came into the
// feeds (published, or reposted since). Only what the feed itself read:
// the posts of a profile or of « Enregistrés » never move it
let cursor = 0
const reach = (list: Saved) => {
  for (const post of list) {
    const seen = Math.max(post.createdAt, ...post.reposts.map((r) => r.at))
    cursor = cursor ? Math.min(cursor, seen) : seen
  }
}

/** Whether the feed holds the oldest post: nothing more to read below */
export const feedStart = signal(false)

/** The latest posts, into the feed */
export const loadPosts = () => {
  const readAt = Date.now()
  return page().then((list) => {
    adoptPosts(list, readAt)
    reach(list)
    feedStart.value = list.length < FEED_PAGE
    // Read with the others: none waits any more
    newPosts.value = []
  }, () => {})
}

/** The page of the feed below what it read (cursor, §12.7) */
export const loadOlderPosts = async () => {
  if (!cursor) return
  const readAt = Date.now()
  const list = await page('', cursor).catch(() => undefined)
  if (!list) return
  adoptPosts(list, readAt)
  reach(list)
  if (list.length < FEED_PAGE) feedStart.value = true
}

/** The posts and the replies of one developer, for their profile */
export const loadPostsOf = (login: string) => {
  const readAt = Date.now()
  return Promise.all([
    page(login).then((list) => adoptPosts(list, readAt)),
    api['GET/api/replies'].fetch({ author: login }).then((list) =>
      adoptReplies(list, readAt)
    ),
  ]).catch(() => {})
}

/**
 * Posts published while the feed is open (§12.2): held here, not in the
 * feed, until the reader is at its top or asks for them. What one reads
 * does not jump, and only posts count as news.
 */
export const newPosts = signal<Saved>([])

/**
 * Reads the feed again: a post already shown takes its likes, reposts and
 * replies as the server counts them, and a post not shown yet (new, or
 * brought back by a repost) is held behind « nouveaux posts »
 */
export const loadNewPosts = () => {
  const readAt = Date.now()
  return page().then((list) => {
    const known = list.filter((post) => isKnownPost(post.id))
    adoptPosts(known, readAt)
    const unknown = list.filter((post) => !isKnownPost(post.id))
    if (!unknown.length && !newPosts.peek().length) return
    // The held ones take what was read; the new ones come first
    const read = new Map(unknown.map((post) => [post.id, post]))
    const held = newPosts.peek().map((post) => read.get(post.id) ?? post)
    const heldIds = new Set(held.map((post) => post.id))
    newPosts.value = [
      ...unknown.filter((post) => !heldIds.has(post.id)),
      ...held,
    ]
  }, () => {})
}

/** The posts held, into the feed */
export const showNewPosts = () => {
  const held = newPosts.peek()
  adoptPosts(held)
  reach(held)
  newPosts.value = []
}

/** Publishes a post: saved by the server, then shown at once */
export const savePost = async (draft: PostDraft) => {
  const saved = await api['POST/api/post/create'].fetch({
    community: draft.community,
    type: draft.type,
    title: draft.title,
    body: draft.body,
    media: draft.media?.map((media) => media.id) ?? [],
    videoUrl: draft.video ?? '',
  })
  const post = publishPost({ ...draft, media: saved.media }, me, {
    id: savedId(saved.id),
    at: saved.createdAt * 1000,
  })
  // Its @logins that are developers, as the server read them
  post.mentions = saved.mentions
  return post
}
