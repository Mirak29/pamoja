import { assert, assertEquals, assertThrows } from 'jsr:@std/assert@^1.0.13'
import { makeRestorePoint } from '@01edu/db'
import { seed } from '/api/seed.ts'
import { userIdOfLogin } from '/api/user.ts'
import {
  createPost,
  listPosts,
  listSaved,
  setBookmark,
  setReaction,
} from '/api/posts.ts'

const restore = makeRestorePoint()

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
