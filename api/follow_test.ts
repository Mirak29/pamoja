import { assert, assertEquals, assertThrows } from 'jsr:@std/assert@^1.0.13'
import { db, makeRestorePoint } from '@01edu/db'
import { seed } from '/api/seed.ts'
import { userIdOfLogin } from '/api/user.ts'
import { toggleFollow } from '/api/follow.ts'

const restore = makeRestorePoint()

const followRows = (me: number) =>
  (db.prepare('SELECT count(*) n FROM follow WHERE followerId = ?')
    .get(me) as { n: number }).n

Deno.test('follow: toggle a developer, a project and a community (PAM-503)', () => {
  restore()
  seed()
  const abdou = userIdOfLogin('abdou')!

  // kofi is not among abdou's seeded follows: a clean follow, then unfollow
  const before = followRows(abdou)
  const on = toggleFollow(abdou, 'user', 'kofi')
  assertEquals(on.following, true)
  assert(on.followers >= 1)
  assertEquals(followRows(abdou), before + 1)
  assertEquals(toggleFollow(abdou, 'user', 'kofi').following, false)
  assertEquals(followRows(abdou), before)

  // Communities are joined, not followed, so none is followed in the seed
  assertEquals(toggleFollow(abdou, 'community', 'go').following, true)
  // A project toggles from whatever the seed set
  const first = toggleFollow(abdou, 'project', 'africommerce')
  const second = toggleFollow(abdou, 'project', 'africommerce')
  assertEquals(first.following, !second.following)
})

Deno.test('follow: refuses oneself and an unknown target (PAM-503)', () => {
  restore()
  seed()
  const abdou = userIdOfLogin('abdou')!
  assertThrows(() => toggleFollow(abdou, 'user', 'abdou'))
  assertThrows(() => toggleFollow(abdou, 'user', 'nobody-xyz'))
  assertThrows(() => toggleFollow(abdou, 'project', 'no-such-project'))
})
