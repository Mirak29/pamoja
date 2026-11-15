import { me } from '/web/fixtures/people.ts'
import {
  adoptPosts,
  adoptReplies,
  isKnownPost,
  oldestSeenAt,
  type PostDraft,
  publishPost,
  savedId,
} from '/web/fixtures/posts.ts'
import { api, type ApiOutput } from '/web/lib/api.ts'
import { signal } from '@preact/signals'

// Posts saved on the server with their images and their video (PAM-427),
// read with their likes, reposts and replies (PAM-501)

/** The latest posts, into the feed */
export const loadPosts = () =>
  api['GET/api/posts'].fetch({ after: '', author: '', before: '' }).then(
    (list) => {
      adoptPosts(list)
      feedStart.value = list.length < FEED_PAGE
      // Read with the others: none waits any more
      newPosts.value = []
    },
    () => {},
  )

// As many as the server reads at once (FEED_PAGE of api/posts.ts)
const FEED_PAGE = 50

/** Whether the feed holds the oldest post: nothing more to read below */
export const feedStart = signal(false)

/** The page of the feed below what it holds (cursor, §12.7) */
export const loadOlderPosts = async () => {
  const before = oldestSeenAt()
  if (!before) return
  const list = await api['GET/api/posts']
    .fetch({ after: '', author: '', before: String(before) })
    .catch(() => undefined)
  if (!list) return
  adoptPosts(list)
  if (list.length < FEED_PAGE) feedStart.value = true
}

/** The posts and the replies of one developer, for their profile */
export const loadPostsOf = (login: string) =>
  Promise.all([
    api['GET/api/posts'].fetch({ after: '', author: login, before: '' }).then(
      adoptPosts,
    ),
    api['GET/api/replies'].fetch({ author: login }).then(adoptReplies),
  ]).catch(() => {})

type Saved = ApiOutput['GET/api/posts']

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
export const loadNewPosts = () =>
  api['GET/api/posts'].fetch({ after: '', author: '', before: '' }).then(
    (list) => {
      adoptPosts(list.filter((post) => isKnownPost(post.id)))
      const held = new Set(newPosts.peek().map((post) => post.id))
      const fresh = list.filter((post) =>
        !held.has(post.id) && !isKnownPost(post.id)
      )
      // The held ones take what was read too
      const read = new Map(list.map((post) => [post.id, post]))
      const kept = newPosts.peek().map((post) => read.get(post.id) ?? post)
      if (fresh.length || kept.some((post, i) => post !== newPosts.peek()[i])) {
        newPosts.value = [...fresh, ...kept]
      }
    },
    () => {},
  )

/** The posts held, into the feed */
export const showNewPosts = () => {
  adoptPosts(newPosts.peek())
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
  return publishPost({ ...draft, media: saved.media }, me, {
    id: savedId(saved.id),
    at: saved.createdAt * 1000,
  })
}
