import { assert, assertEquals } from 'jsr:@std/assert@^1.0.13'
import { db, makeRestorePoint } from '@01edu/db'
import { seed } from '/api/seed.ts'
import { userIdOfLogin } from '/api/user.ts'
import { createPost, createReply } from '/api/posts.ts'
import { request } from '/api/testing.ts'

const restore = makeRestorePoint()

// The feed read without an account (§10.1): read only, as anyone

Deno.test('guest feed: the posts and a thread, read without a session', async () => {
  restore()
  seed()
  const abdou = userIdOfLogin('abdou')!
  const moussa = userIdOfLogin('moussa')!
  const post = createPost(abdou, {
    community: '',
    type: 'Question',
    title: 'Le verrou SQLite',
    body: 'Comment éviter `database is locked` ?',
  })
  createReply(moussa, post.id, 'Un seul writer derrière une file.')

  const feed = await request('/api/posts')
  assertEquals(feed.status, 200)
  const posts = await feed.json() as { id: number; mine: string[] }[]
  const shown = posts.find((p) => p.id === post.id)!
  assert(shown)
  // A visitor is no one: no reaction of their own
  assertEquals(shown.mine, [])

  const thread = await request(`/api/post/thread?postId=${post.id}`)
  assertEquals(thread.status, 200)
  const { posts: all } = await thread.json() as { posts: unknown[] }
  assertEquals(all.length, 2)
})

Deno.test('guest feed: never a hidden post, never an action', async () => {
  restore()
  seed()
  const abdou = userIdOfLogin('abdou')!
  const post = createPost(abdou, {
    community: '',
    type: 'Discussion',
    title: '',
    body: 'Masqué par la modération',
  })
  db.prepare('UPDATE post SET hiddenAt = unixepoch() WHERE postId = ?')
    .run(post.id)
  const posts = await (await request('/api/posts')).json() as { id: number }[]
  assert(!posts.some((p) => p.id === post.id))
  // Writing still needs an account
  const like = await request('/api/reaction', {
    body: { postId: post.id, kind: 'like', on: true },
  })
  assertEquals(like.status, 401)
})
