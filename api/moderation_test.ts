import { assert, assertEquals, assertThrows } from 'jsr:@std/assert@^1.0.13'
import { db, makeRestorePoint } from '@01edu/db'
import { seed } from '/api/seed.ts'
import { getCurrentUser, userIdOfLogin } from '/api/user.ts'
import { createPost, listPosts } from '/api/posts.ts'
import { reportContent } from '/api/reports.ts'
import { decide, isSuspended, moderationQueue } from '/api/moderation.ts'
import { createSession } from '/api/session.ts'
import { proofsOf } from '/api/proofs.ts'
import { badgesOf } from '/api/badges.ts'
import { createCommunity } from '/api/community.ts'
import { request } from '/api/testing.ts'

const restore = makeRestorePoint()

// Kofi is a platform admin for the time of `fn`: PAMOJA_ADMINS
const asAdmin = <T>(fn: () => T) => {
  Deno.env.set('PAMOJA_ADMINS', 'kofi')
  try {
    return fn()
  } finally {
    Deno.env.delete('PAMOJA_ADMINS')
  }
}

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
  assert(!listPosts(moussa, 'abdou').some((p) => p.id === post))
  // Its author still reads it on their profile, with the reason
  const mine = listPosts(abdou, 'abdou').find((p) => p.id === post)!
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
  const kofi = userIdOfLogin('kofi')!
  // A community moderator never suspends: it acts on the whole platform
  assertThrows(() => decide(zeinab, decision(post, 'suspend', 7)))
  asAdmin(() => {
    assertThrows(() => decide(kofi, decision(post, 'suspend', 3)))
    decide(kofi, decision(post, 'suspend', 7))
  })
  assert(isSuspended(abdou))
  assert(!isSuspended(zeinab))
})

Deno.test('moderation: the server refuses the writes of a suspended account', async () => {
  const { abdou, post } = reported()
  const kofi = userIdOfLogin('kofi')!
  asAdmin(() => decide(kofi, decision(post, 'suspend', 1)))
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

Deno.test('moderation: a proof withdrawn for fraud no longer counts', () => {
  restore()
  seed()
  const [moussa, abdou, zeinab, kofi] = ['moussa', 'abdou', 'zeinab', 'kofi']
    .map((login) => userIdOfLogin(login)!)
  // Abdou reports Moussa's profile for cheating with his reputation
  reportContent(
    abdou,
    'profile',
    moussa,
    'reputation_fraud',
    'Reviews en boucle',
  )
  const before = proofsOf(moussa)
  const reviews = () =>
    badgesOf(moussa).find((b) => b.badge === 'trusted_reviewer')!.count
  const counted = reviews()
  const proof = before[0]

  const revoke = {
    targetType: 'profile',
    targetId: moussa,
    action: 'revoke_evidence',
    reason: 'Fraude avérée',
    days: 0,
    proofId: proof.id,
  }
  // A community moderator never withdraws a proof
  assertThrows(() => decide(zeinab, revoke))
  // Only a proof of the one reported
  assertThrows(() =>
    asAdmin(() =>
      decide(kofi, {
        targetType: 'profile',
        targetId: moussa,
        action: 'revoke_evidence',
        reason: 'Fraude avérée',
        days: 0,
        proofId: 999999,
      })
    )
  )
  asAdmin(() => decide(kofi, revoke))
  // Gone from his proofs and from his badge, never from the journal
  assertEquals(proofsOf(moussa).length, before.length - 1)
  assert(!proofsOf(moussa).some((p) => p.id === proof.id))
  assertEquals(reviews(), counted - 1)
  assert(db.prepare('SELECT 1 FROM entry WHERE id = ?').get(proof.id))
  // He is told why
  const told = db.prepare(
    "SELECT count(*) AS n FROM notification WHERE userId = ? AND type = 'moderation_proof_revoked'",
  ).get(moussa) as { n: number }
  assertEquals(told.n, 1)
})

Deno.test('moderation: creating a community gives no power beyond it', () => {
  const { abdou, zeinab, post } = reported()
  const moussa = userIdOfLogin('moussa')!
  const awa = userIdOfLogin('awa')!
  // Moussa creates a community: he moderates it, and nothing else
  createCommunity(moussa, {
    name: 'Les amis de Moussa',
    type: 'domain',
    description: 'Une communauté',
  })
  assert(getCurrentUser(moussa)!.moderator)
  reportContent(abdou, 'profile', awa, 'spam', '')
  const onAwa = {
    targetType: 'profile',
    targetId: awa,
    action: 'warn',
    reason: 'x',
    days: 0,
  }
  // No platform admin while PAMOJA_ADMINS is empty: the profile is nobody's
  assertThrows(() => decide(moussa, onAwa))
  assertThrows(() => decide(zeinab, onAwa))
  assert(!moderationQueue(moussa).queue.some((q) => q.targetType === 'profile'))
  // Nor the Go post he does not moderate
  assertThrows(() => decide(moussa, decision(post, 'hide')))
})

Deno.test('moderation: a decision answers a report, never a moderator', () => {
  restore()
  seed()
  const [abdou, zeinab, kofi, awa] = ['abdou', 'zeinab', 'kofi', 'awa'].map(
    (login) => userIdOfLogin(login)!,
  )
  // A post of the Go community nobody reported: nothing to decide
  const quiet = createPost(abdou, {
    community: 'go',
    type: 'Discussion',
    title: '',
    body: 'Un post sans signalement',
  }).id
  assertThrows(() => decide(zeinab, decision(quiet, 'hide')))
  asAdmin(() => {
    // A moderator is never the target, even of an admin
    reportContent(awa, 'profile', zeinab, 'spam', '')
    assertThrows(() =>
      decide(kofi, {
        targetType: 'profile',
        targetId: zeinab,
        action: 'suspend',
        reason: 'x',
        days: 7,
      })
    )
    // Only a post or a comment is hidden
    reportContent(awa, 'profile', abdou, 'spam', '')
    assertThrows(() =>
      decide(kofi, {
        targetType: 'profile',
        targetId: abdou,
        action: 'hide',
        reason: 'x',
        days: 0,
      })
    )
  })
})
