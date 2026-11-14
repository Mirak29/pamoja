import { assert, assertEquals, assertThrows } from 'jsr:@std/assert@^1.0.13'
import { db, makeRestorePoint } from '@01edu/db'
import { seed } from '/api/seed.ts'
import { userIdOfLogin } from '/api/user.ts'
import { followsOf, setFollow } from '/api/follow.ts'
import { createSession } from '/api/session.ts'
import { request } from '/api/testing.ts'

const restore = makeRestorePoint()

const followRows = (me: number) =>
  (db.prepare('SELECT count(*) n FROM follow WHERE followerId = ?')
    .get(me) as { n: number }).n

Deno.test('follow: the state asked for, a developer, a project and a community (PAM-503)', () => {
  restore()
  seed()
  const abdou = userIdOfLogin('abdou')!

  // kofi is not among abdou's seeded follows: a follow, then a stop
  const before = followRows(abdou)
  const on = setFollow(abdou, 'user', 'kofi', true)
  assertEquals(on.following, true)
  assert(on.followers >= 1)
  assertEquals(followRows(abdou), before + 1)
  assertEquals(setFollow(abdou, 'user', 'kofi', false).following, false)
  assertEquals(followRows(abdou), before)

  // The same request twice, a retry or a second tab: the same state, never
  // a follow undone by a click meant to follow
  setFollow(abdou, 'project', 'africommerce', true)
  const again = setFollow(abdou, 'project', 'africommerce', true)
  assertEquals(again.following, true)
  assert(followsOf(abdou).projects.includes('africommerce'))
  setFollow(abdou, 'project', 'africommerce', false)
  setFollow(abdou, 'project', 'africommerce', false)
  assertEquals(followsOf(abdou).projects.includes('africommerce'), false)

  // A community can be followed too, by its slug
  const before2 = followRows(abdou)
  assertEquals(setFollow(abdou, 'community', 'go', true).following, true)
  assertEquals(followRows(abdou), before2 + 1)
})

Deno.test('follow: a project gone unlisted can still be unfollowed, and stopping is never limited (PAM-503)', () => {
  restore()
  seed()
  const abdou = userIdOfLogin('abdou')!
  setFollow(abdou, 'project', 'africommerce', true)
  db.prepare("UPDATE project SET visibility = 'unlisted' WHERE slug = ?")
    .run('africommerce')
  // Not followed again while unlisted, but the follow there can go
  assertThrows(() => setFollow(abdou, 'project', 'africommerce', true))
  assertEquals(
    setFollow(abdou, 'project', 'africommerce', false).following,
    false,
  )
  assertEquals(followsOf(abdou).projects.includes('africommerce'), false)

  // The hour's follows used up: a new one is refused, stopping one is not
  const at = Date.now() / 1000
  const insert = db.prepare(
    `INSERT INTO follow (followerId, targetType, targetId, createdAt)
     VALUES (?, 'community', ?, ?)`,
  )
  for (let i = 0; i < 60; i++) insert.run(abdou, 100_000 + i, at)
  assertThrows(() => setFollow(abdou, 'user', 'kofi', true))
  assertEquals(setFollow(abdou, 'user', 'moussa', false).following, false)
})

Deno.test('follow: refuses oneself and an unknown target (PAM-503)', () => {
  restore()
  seed()
  const abdou = userIdOfLogin('abdou')!
  assertThrows(() => setFollow(abdou, 'user', 'abdou', true))
  assertThrows(() => setFollow(abdou, 'user', 'nobody-xyz', true))
  assertThrows(() => setFollow(abdou, 'project', 'no-such-project', true))
})

Deno.test('follow: the page reads what is followed at every load (PAM-503)', async () => {
  restore()
  seed()
  const abdou = userIdOfLogin('abdou')!
  const cookie = `session=${await createSession(abdou, 'demo')}`
  const me = async () =>
    await (await request('/api/follows', { cookie })).json()

  // What the seed gave, then a follow made through the API
  const seeded = await me()
  assertEquals(seeded.users.includes('kofi'), false)
  const res = await request('/api/follow', {
    body: { targetType: 'user', target: 'kofi', follow: true },
    cookie,
  })
  assertEquals(res.status, 200)
  assertEquals((await me()).users.includes('kofi'), true)
})
