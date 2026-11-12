import { me } from '/web/fixtures/people.ts'
import {
  adoptPosts,
  isKnownPost,
  newestSavedAt,
  type PostDraft,
  publishPost,
  savedId,
} from '/web/fixtures/posts.ts'
import { api, type ApiOutput } from '/web/lib/api.ts'
import { signal } from '@preact/signals'

// Posts saved on the server with their images and their video (PAM-427);
// replies and reactions stay in the page until PAM-501

/** The latest posts, into the feed */
export const loadPosts = () =>
  api['GET/api/posts'].fetch({ after: '' }).then((list) => {
    adoptPosts(list)
    // Read with the others: none waits any more
    newPosts.value = []
  }, () => {})

type Saved = ApiOutput['GET/api/posts']

/**
 * Posts published while the feed is open (§12.2): held here, not in the
 * feed, until the reader is at its top or asks for them. What one reads
 * does not jump, and only posts count as news.
 */
export const newPosts = signal<Saved>([])

/** Reads only what is newer than the feed, and holds it */
export const loadNewPosts = () =>
  api['GET/api/posts'].fetch({ after: String(newestSavedAt()) }).then(
    (list) => {
      const held = new Set(newPosts.peek().map((post) => post.id))
      const fresh = list.filter((post) =>
        !held.has(post.id) && !isKnownPost(post.id)
      )
      fresh.length && (newPosts.value = [...fresh, ...newPosts.peek()])
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
