import { computed, signal } from '@preact/signals'
import { api, type ApiOutput } from '/web/lib/api.ts'
import { FEED_PAGE } from '/api/limits.ts'
import { personOf } from '/web/fixtures/people.ts'
import {
  likeCountOf,
  type Post,
  posts as demoPosts,
  replyCountOf,
} from '/web/fixtures/posts.ts'

// The feed read without an account (§10.1): the latest posts and a thread,
// read only. Kept apart from the feed of the signed in developer, which
// assumes one; it reads the posts of the demo as that feed does.

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

/**
 * A post as the visitor reads it: one of the server, or one of the demo
 * (web/fixtures/posts.ts), which the signed in feed shows too. Without
 * them, a visitor of a fresh database would read an empty feed.
 */
export type GuestCard = {
  key: string
  demo: boolean
  /** Its discussion: post/s<id> for the server, post/<id> for the demo */
  href: string
  author: string
  authorName: string
  avatarUrl?: string
  /** Published, in ms */
  at: number
  community: string
  type: string
  title: string
  body: string
  mentions?: string[]
  media: GuestPost['media']
  videoUrl: string
  likes: number
  replies: number
}

export const fromServer = (post: GuestPost): GuestCard => ({
  key: `s${post.id}`,
  demo: false,
  href: `post/s${post.id}`,
  author: post.author,
  authorName: post.authorName,
  at: post.createdAt * 1000,
  community: post.community,
  type: post.type,
  title: post.title,
  body: post.body,
  mentions: post.mentions,
  media: post.media,
  videoUrl: post.videoUrl,
  likes: post.reactions.like,
  replies: post.replies,
})

export const fromDemo = (post: Post): GuestCard => {
  const author = personOf(post.author)
  return {
    key: post.id,
    demo: true,
    href: `post/${post.id}`,
    author: post.author,
    authorName: author.name,
    avatarUrl: author.avatarUrl,
    at: post.at,
    community: post.community,
    type: post.type,
    title: post.title,
    body: post.body,
    mentions: post.mentions,
    media: post.media ?? [],
    videoUrl: post.video ?? '',
    likes: likeCountOf(post),
    replies: replyCountOf(post),
  }
}

/** The first posts of the demo, never a hidden one */
const demoRoots = () =>
  demoPosts.filter((post) => post.demo && !post.parent && !post.hidden)

/** The feed of the visitor: the server's and the demo's, latest first */
export const guestCards = computed(() =>
  [...guestPosts.value.map(fromServer), ...demoRoots().map(fromDemo)]
    .sort((a, b) => b.at - a.at)
)

/** A post of the demo and its whole discussion, oldest reply first */
export const demoThread = (id: string) => {
  const root = demoPosts.find((post) =>
    post.id === id && post.demo && !post.parent && !post.hidden
  )
  if (!root) return null
  const replies = demoPosts
    .filter((post) => post.root === root.id && post.demo && !post.hidden)
    .sort((a, b) => a.at - b.at)
  return { root: fromDemo(root), replies: replies.map(fromDemo) }
}
