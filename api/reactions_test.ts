import { assert, assertEquals, assertThrows } from 'jsr:@std/assert@^1.0.13'
import { makeRestorePoint } from '@01edu/db'
import { seed } from '/api/seed.ts'
import { userIdOfLogin } from '/api/user.ts'
import {
  createPost,
  listPosts,
  listSaved,
  toggleBookmark,
  toggleReaction,
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

  assertEquals(toggleReaction(moussa, post, 'like').reacted, true)
  assertEquals(toggleReaction(abdou, post, 'like').reacted, true)
  const forMoussa = listPosts(moussa).find((p) => p.id === post)!
  assertEquals(forMoussa.reactions.like, 2)
  assertEquals(forMoussa.mine, ['like']) // Moussa's own reaction
  // Someone who did not react sees the count, not as theirs
  const fatou = userIdOfLogin('fatou')!
  assertEquals(listPosts(fatou).find((p) => p.id === post)!.mine, [])

  // Taken back
  assertEquals(toggleReaction(moussa, post, 'like').reacted, false)
  assertEquals(listPosts(moussa).find((p) => p.id === post)!.reactions.like, 1)

  // One reaction since PAM-539: any other kind, or an unknown post, is
  // refused
  assertThrows(() => toggleReaction(moussa, post, 'useful'))
  assertThrows(() => toggleReaction(moussa, 999999, 'like'))
})

Deno.test('bookmarks: saved posts come back for their owner (PAM-501)', () => {
  restore()
  seed()
  const abdou = userIdOfLogin('abdou')!
  const moussa = userIdOfLogin('moussa')!
  const post = newPost(moussa, 'Un post à garder')

  assertEquals(listSaved(abdou).length, 0)
  assertEquals(toggleBookmark(abdou, post).bookmarked, true)
  const saved = listSaved(abdou)
  assertEquals(saved.length, 1)
  assertEquals(saved[0].id, post)
  assert(saved[0].bookmarked)

  assertEquals(toggleBookmark(abdou, post).bookmarked, false)
  assertEquals(listSaved(abdou).length, 0)
})
