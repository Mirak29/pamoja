import { assertEquals, assertThrows } from 'jsr:@std/assert@^1.0.13'
import { db, makeRestorePoint } from '@01edu/db'
import { seed } from '/api/seed.ts'
import { communitiesOf, userIdOfLogin } from '/api/user.ts'
import { setMembership } from '/api/community.ts'
import { createSession } from '/api/session.ts'
import { request } from '/api/testing.ts'

const restore = makeRestorePoint()

const memberRows = (me: number) =>
  (db.prepare('SELECT count(*) n FROM communityMember WHERE userId = ?')
    .get(me) as { n: number }).n

Deno.test('community: join and leave on the server, by the state asked (PAM-502)', () => {
  restore()
  seed()
  const abdou = userIdOfLogin('abdou')!

  // abdou does not belong to React in the seed: a join, then a leave
  const before = memberRows(abdou)
  assertEquals(setMembership(abdou, 'react', true).joined, true)
  assertEquals(memberRows(abdou), before + 1)

  // The same request twice, a retry or a second tab: still a member, never
  // a join undone by a click meant to join
  assertEquals(setMembership(abdou, 'react', true).joined, true)
  assertEquals(memberRows(abdou), before + 1)

  const left = setMembership(abdou, 'react', false)
  assertEquals(left.joined, false)
  assertEquals(setMembership(abdou, 'react', false).joined, false)
  assertEquals(memberRows(abdou), before)
})

Deno.test('community: leaving is never limited (PAM-502)', () => {
  restore()
  seed()
  const abdou = userIdOfLogin('abdou')!
  // The hour's joins used up: a new join is refused, leaving is not
  const at = Date.now() / 1000
  const community = db.prepare(
    `INSERT INTO community (slug, name, type, description, source, createdAt)
     VALUES (?, ?, 'domain', '', 'platform', ?) RETURNING communityId`,
  )
  const member = db.prepare(
    `INSERT INTO communityMember (communityId, userId, role, joinedAt)
     VALUES (?, ?, 'member', ?)`,
  )
  for (let i = 0; i < 60; i++) {
    const { communityId } = community.get(`limit-${i}`, `Limite ${i}`, at) as {
      communityId: number
    }
    member.run(communityId, abdou, at)
  }
  assertThrows(() => setMembership(abdou, 'react', true))
  assertEquals(setMembership(abdou, 'go', false).joined, false)
})

Deno.test('community: an unknown community is refused (PAM-502)', () => {
  restore()
  seed()
  const abdou = userIdOfLogin('abdou')!
  assertThrows(() => setMembership(abdou, 'no-such-community', true))
})

Deno.test('community: the page reads the communities joined at every session (PAM-502)', async () => {
  restore()
  seed()
  const abdou = userIdOfLogin('abdou')!
  const cookie = `session=${await createSession(abdou, 'demo')}`
  const mine = async () =>
    (await (await request('/api/user/me', { cookie })).json()).communities

  assertEquals(await mine(), communitiesOf(abdou))
  assertEquals((await mine()).includes('react'), false)
  const res = await request('/api/community/join', {
    body: { slug: 'react', join: true },
    cookie,
  })
  assertEquals(res.status, 200)
  assertEquals((await mine()).includes('react'), true)
})
