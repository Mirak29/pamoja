import { assertEquals, assertThrows } from 'jsr:@std/assert@^1.0.13'
import { db, makeRestorePoint } from '@01edu/db'
import { seed } from '/api/seed.ts'
import { communitiesOf, userIdOfLogin } from '/api/user.ts'
import {
  createCommunity,
  listCommunities,
  setMembership,
} from '/api/community.ts'
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

const communityRow = (slug: string) =>
  db.prepare(
    `SELECT c.communityId, c.type, c.source, m.role, m.userId
     FROM community c
     LEFT JOIN communityMember m ON m.communityId = c.communityId
     WHERE c.slug = ?`,
  ).get(slug) as
    | {
      communityId: number
      type: string
      source: string
      role: string
      userId: number
    }
    | undefined

Deno.test('community: created, its author its first moderator (PAM-502)', () => {
  restore()
  seed()
  const abdou = userIdOfLogin('abdou')!
  const out = createCommunity(abdou, {
    name: 'Rust Afrique',
    type: 'technology',
    description: 'Pour parler Rust',
  })
  assertEquals(out.slug, 'rust-afrique')
  const row = communityRow('rust-afrique')!
  assertEquals([row.type, row.source], ['technology', 'platform'])
  // Its creator is its only member, a moderator
  assertEquals([row.role, row.userId], ['moderator', abdou])
})

Deno.test('community: a taken slug gets a suffix (PAM-502)', () => {
  restore()
  seed()
  const abdou = userIdOfLogin('abdou')!
  const first = createCommunity(abdou, {
    name: 'Rust',
    type: 'technology',
    description: '',
  })
  const second = createCommunity(abdou, {
    name: 'Rust',
    type: 'technology',
    description: '',
  })
  assertEquals(first.slug, 'rust')
  assertEquals(second.slug, 'rust-2')
})

Deno.test('community: the listing has a created one, with the member state (PAM-502)', () => {
  restore()
  seed()
  const abdou = userIdOfLogin('abdou')!
  const moussa = userIdOfLogin('moussa')!
  createCommunity(abdou, {
    name: 'Rust Afrique',
    type: 'technology',
    description: '',
  })

  // The creator sees it joined, with its one member
  const forAbdou = listCommunities(abdou).find((c) =>
    c.slug === 'rust-afrique'
  )!
  assertEquals([forAbdou.joined, forAbdou.members], [true, 1])
  // Another developer sees it, not joined
  const forMoussa = listCommunities(moussa).find((c) =>
    c.slug === 'rust-afrique'
  )!
  assertEquals(forMoussa.joined, false)
})

Deno.test('community: a name is required, the type is known (PAM-502)', () => {
  restore()
  seed()
  const abdou = userIdOfLogin('abdou')!
  assertThrows(() =>
    createCommunity(abdou, { name: '  ', type: 'technology', description: '' })
  )
  assertThrows(() =>
    createCommunity(abdou, { name: 'Zig', type: 'nope', description: '' })
  )
  assertThrows(() =>
    createCommunity(abdou, {
      name: 'x'.repeat(200),
      type: 'domain',
      description: '',
    })
  )
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
