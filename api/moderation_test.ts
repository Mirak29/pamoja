import { assert, assertEquals, assertThrows } from 'jsr:@std/assert@^1.0.13'
import { db, makeRestorePoint } from '@01edu/db'
import { seed } from '/api/seed.ts'
import { getCurrentUser, userIdOfLogin } from '/api/user.ts'
import { createPost, listPosts } from '/api/posts.ts'
import { reportContent } from '/api/reports.ts'
import { decide, isSuspended, moderationQueue } from '/api/moderation.ts'
import { createSession } from '/api/session.ts'
import { request } from '/api/testing.ts'

const restore = makeRestorePoint()

const hiddenAt = (postId: number) =>
  (db.prepare('SELECT hiddenAt FROM post WHERE postId = ?')
    .get(postId) as { hiddenAt: number | null }).hiddenAt

// A post of Abdou in the Go community, reported by three developers: it
// hides itself and waits for Zeinab, who moderates Go
const reported = () => {
  restore()
  seed()
  const [abdou, moussa, awa, fatou, zeinab] = [
    'abdou',
    'moussa',
    'awa',
    'fatou',
    'zeinab',
  ].map((login) => userIdOfLogin(login)!)
  const post = createPost(abdou, {
    community: 'go',
    type: 'Discussion',
    title: '',
    body: 'Un post signalé trois fois',
  }).id
  for (const who of [moussa, awa, fatou]) {
    reportContent(who, 'post', post, 'spam', who === moussa ? 'Pub' : '')
  }
  return { abdou, moussa, zeinab, post }
}

const decision = (post: number, action: string, days = 0) => ({
  targetType: 'post',
  targetId: post,
  action,
  reason: 'Hors sujet pour la communauté',
  days,
})

Deno.test('moderation: the queue of a community goes to its moderators (PAM-508)', () => {
  const { abdou, moussa, zeinab, post } = reported()
  assert(getCurrentUser(zeinab)!.moderator)
  assert(!getCurrentUser(moussa)!.moderator)

  const { queue } = moderationQueue(zeinab)
  const item = queue.find((q) => q.targetId === post)!
  assertEquals(item.reports.length, 3)
  assertEquals(item.author, 'abdou')
  assert(item.hidden)
  assertEquals(item.reports[0].comment, 'Pub')
  // Someone who moderates nothing has no queue
  assertEquals(moderationQueue(moussa).queue.length, 0)

  // Neither a stranger to the queue nor the author decides
  assertThrows(() => decide(moussa, decision(post, 'hide')))
  assertThrows(() => decide(abdou, decision(post, 'hide')))
  assertThrows(() =>
    decide(zeinab, { ...decision(post, 'hide'), reason: '  ' })
  )
})

Deno.test('moderation: ignoring brings back a post its reports hid', () => {
  const { abdou, zeinab, post } = reported()
  decide(zeinab, decision(post, 'dismiss'))
  assertEquals(hiddenAt(post), null)
  assert(listPosts(abdou).some((p) => p.id === post))
  // Its reports are closed, the decision is in the history
  const after = moderationQueue(zeinab)
  assert(!after.queue.some((q) => q.targetId === post))
  assertEquals(after.history[0].action, 'dismiss')
})

Deno.test('moderation: a hidden post stays for its author, with why', () => {
  const { abdou, moussa, zeinab, post } = reported()
  decide(zeinab, decision(post, 'hide'))
  assert(hiddenAt(post))
  // Gone from the feed and from the profile for the others
  assert(!listPosts(moussa).some((p) => p.id === post))
  assert(!listPosts(moussa, 0, 'abdou').some((p) => p.id === post))
  // Its author still reads it on their profile, with the reason
  const mine = listPosts(abdou, 0, 'abdou').find((p) => p.id === post)!
  assert(mine.hidden)
  assertEquals(mine.hiddenReason, 'Hors sujet pour la communauté')
  // The author is told
  const told = db.prepare(
    "SELECT count(*) AS n FROM notification WHERE userId = ? AND type = 'moderation_hidden'",
  ).get(abdou) as { n: number }
  assertEquals(told.n, 1)
})

Deno.test('moderation: a suspended account reads, never writes', () => {
  const { abdou, zeinab, post } = reported()
  assertThrows(() => decide(zeinab, decision(post, 'suspend', 3)))
  decide(zeinab, decision(post, 'suspend', 7))
  assert(isSuspended(abdou))
  assert(!isSuspended(zeinab))
})

Deno.test('moderation: the server refuses the writes of a suspended account', async () => {
  const { abdou, zeinab, post } = reported()
  decide(zeinab, decision(post, 'suspend', 1))
  const cookie = `session=${await createSession(abdou, 'demo')}`
  // Reading still works
  assertEquals((await request('/api/follows', { cookie })).status, 200)
  // Writing is refused
  const res = await request('/api/follow', {
    body: { targetType: 'user', target: 'kofi', follow: true },
    cookie,
  })
  assertEquals(res.status, 403)
  await res.body?.cancel()
})
