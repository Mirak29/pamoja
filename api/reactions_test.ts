import { assert, assertEquals, assertThrows } from 'jsr:@std/assert@^1.0.13'
import { makeRestorePoint, sql } from '@01edu/db'
import { seed } from '/api/seed.ts'
import { Post } from '/api/schema.ts'
import { userIdOfLogin } from '/api/user.ts'
import {
  createPost,
  createReply,
  listPosts,
  listRepliesOf,
  listSaved,
  setBookmark,
  setReaction,
  setRepost,
} from '/api/posts.ts'

const restore = makeRestorePoint()

const backdate = sql<undefined, { postId: number; at: number }>`
  UPDATE post SET createdAt = :at WHERE postId = :postId
`.run

const newPost = (me: number, body: string) =>
  createPost(me, { community: '', type: 'Discussion', title: '', body }).id

Deno.test('reactions: a post counts reactions and keeps mine apart (PAM-501)', () => {
  restore()
  seed()
  const abdou = userIdOfLogin('abdou')!
  const moussa = userIdOfLogin('moussa')!
  const post = newPost(abdou, 'Un post à réactions')

  assertEquals(setReaction(moussa, post, 'like', true).reacted, true)
  assertEquals(setReaction(abdou, post, 'like', true).reacted, true)
  const forMoussa = listPosts(moussa).find((p) => p.id === post)!
  assertEquals(forMoussa.reactions.like, 2)
  assertEquals(forMoussa.mine, ['like']) // Moussa's own reaction
  // Someone who did not react sees the count, not as theirs
  const fatou = userIdOfLogin('fatou')!
  assertEquals(listPosts(fatou).find((p) => p.id === post)!.mine, [])

  // Taken back
  assertEquals(setReaction(moussa, post, 'like', false).reacted, false)
  assertEquals(listPosts(moussa).find((p) => p.id === post)!.reactions.like, 1)

  // One reaction since PAM-539: any other kind, or an unknown post, is
  // refused
  assertThrows(() => setReaction(moussa, post, 'useful', true))
  assertThrows(() => setReaction(moussa, 999999, 'like', true))
})

Deno.test('bookmarks: saved posts come back for their owner (PAM-501)', () => {
  restore()
  seed()
  const abdou = userIdOfLogin('abdou')!
  const moussa = userIdOfLogin('moussa')!
  const post = newPost(moussa, 'Un post à garder')

  assertEquals(listSaved(abdou).length, 0)
  assertEquals(setBookmark(abdou, post, true).bookmarked, true)
  const saved = listSaved(abdou)
  assertEquals(saved.length, 1)
  assertEquals(saved[0].id, post)
  assert(saved[0].bookmarked)

  assertEquals(setBookmark(abdou, post, false).bookmarked, false)
  assertEquals(listSaved(abdou).length, 0)
})

Deno.test('reactions: the state wanted, so a replay or a late tab keeps it', () => {
  restore()
  seed()
  const abdou = userIdOfLogin('abdou')!
  const post = newPost(abdou, 'Mon propre post')
  const liked = () => listPosts(abdou).find((p) => p.id === post)!

  // Liked twice, from two tabs: one like, still mine
  setReaction(abdou, post, 'like', true)
  setReaction(abdou, post, 'like', true)
  assertEquals(liked().reactions.like, 1)
  assertEquals(liked().mine, ['like'])

  // Taken back twice: none, never liked again by a toggle
  setReaction(abdou, post, 'like', false)
  setReaction(abdou, post, 'like', false)
  assertEquals(liked().reactions.like, 0)
  assertEquals(liked().mine, [])

  // The same for a bookmark
  setBookmark(abdou, post, true)
  setBookmark(abdou, post, true)
  assertEquals(listSaved(abdou).length, 1)
  setBookmark(abdou, post, false)
  setBookmark(abdou, post, false)
  assertEquals(listSaved(abdou).length, 0)
})

Deno.test('reposts: the state wanted, shown on the post, never as a post', () => {
  restore()
  seed()
  const abdou = userIdOfLogin('abdou')!
  const moussa = userIdOfLogin('moussa')!
  const old = newPost(abdou, 'Un vieux post')
  // Two days old, then fifty newer posts push it out of the latest ones,
  // written straight in the table more than an hour ago: the rate of their
  // author is not the point
  const hours = (n: number) => Date.now() / 1000 - n * 3600
  backdate({ postId: old, at: hours(48) })
  for (let i = 0; i < 50; i++) {
    const at = hours(2) + i
    Post.insert({
      authorId: moussa,
      type: 'Discussion',
      body: `Post ${i}`,
      source: 'platform',
      createdAt: at,
      updatedAt: at,
    })
  }
  assert(!listPosts(abdou).some((p) => p.id === old))

  // Reposted twice, from two tabs: one repost, which brings it back
  assertEquals(setRepost(moussa, old, true).reposted, true)
  assertEquals(setRepost(moussa, old, true).reposted, true)
  const shown = listPosts(abdou).find((p) => p.id === old)!
  assertEquals(shown.reposts.map((r) => r.by), ['moussa'])
  // The repost itself never shows as a post of the feed or of the profile
  assert(listPosts(abdou).every((p) => p.body !== ''))
  assert(listPosts(abdou, 0, 'moussa').every((p) => p.body !== ''))
  // Read by a feed open since before it
  assert(listPosts(abdou, shown.createdAt).some((p) => p.id === old))

  // Taken back twice: none
  setRepost(moussa, old, false)
  setRepost(moussa, old, false)
  assertEquals(
    listPosts(abdou, 0, 'abdou').find((p) => p.id === old)!.reposts,
    [],
  )
  // Reposted again: back, its author told only the first time
  setRepost(moussa, old, true)
  assertEquals(
    listPosts(abdou).find((p) => p.id === old)!.reposts.map((r) => r.by),
    ['moussa'],
  )
  // A reply is not reposted
  const reply = createReply(moussa, old, 'Une réponse').id
  assertThrows(() => setRepost(abdou, reply, true))
})

Deno.test('replies: counted with the post, listed for the profile', () => {
  restore()
  seed()
  const abdou = userIdOfLogin('abdou')!
  const moussa = userIdOfLogin('moussa')!
  const post = newPost(abdou, 'Un post commenté')
  const first = createReply(moussa, post, 'Première réponse').id
  createReply(abdou, first, 'Réponse à la réponse')
  createReply(moussa, post, 'Deuxième réponse')
  // Direct replies: the page shows them before reading the thread
  assertEquals(listPosts(abdou).find((p) => p.id === post)!.replies, 2)

  const replies = listRepliesOf(abdou, 'moussa')
  assertEquals(replies.length, 2)
  assert(replies.every((r) => r.parentId === post && r.rootId === post))
  const nested = listRepliesOf(moussa, 'abdou')[0]
  assertEquals([nested.parentId, nested.rootId], [first, post])
})
