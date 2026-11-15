import { signal } from '@preact/signals'
import { api, type ApiOutput } from '/web/lib/api.ts'
import { FEED_PAGE } from '/api/limits.ts'

// The feed read without an account (§10.1): the latest posts and a thread,
// read only. Kept apart from the feed of the signed in developer
// (web/fixtures/posts.ts), which assumes one.

export type GuestPost = ApiOutput['GET/api/posts'][number]
export type GuestThread = ApiOutput['GET/api/post/thread']

export const guestPosts = signal<GuestPost[]>([])
/** Loading, loaded (with more to read or not), or failed */
export const guestFeedState = signal<
  'idle' | 'loading' | 'more' | 'end' | 'failed'
>(
  'idle',
)

/** Reads the first page, or the next one after the last post shown */
export const loadGuestFeed = (more = false) => {
  const shown = guestPosts.peek()
  const last = more ? shown[shown.length - 1] : undefined
  guestFeedState.value = 'loading'
  return api['GET/api/posts'].fetch(
    { before: last ? String(last.createdAt) : '', author: '' },
  ).then(
    (page) => {
      const known = new Set(shown.map((post) => post.id))
      guestPosts.value = more
        ? [...shown, ...page.filter((post) => !known.has(post.id))]
        : page
      // A page shorter than asked: the end of the feed
      guestFeedState.value = page.length >= FEED_PAGE ? 'more' : 'end'
    },
    () => guestFeedState.value = 'failed',
  )
}

/** A post with its thread, read only */
export const readGuestThread = (postId: number) =>
  api['GET/api/post/thread'].fetch({ postId: String(postId) })
