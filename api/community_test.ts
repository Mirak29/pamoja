import { assert, assertEquals, assertThrows } from 'jsr:@std/assert@^1.0.13'
import { db, makeRestorePoint } from '@01edu/db'
import { seed } from '/api/seed.ts'
import { userIdOfLogin } from '/api/user.ts'
import { toggleMembership } from '/api/community.ts'

const restore = makeRestorePoint()

const memberRows = (me: number) =>
  (db.prepare('SELECT count(*) n FROM communityMember WHERE userId = ?')
    .get(me) as { n: number }).n

Deno.test('community: join and leave on the server (PAM-502)', () => {
  restore()
  seed()
  const abdou = userIdOfLogin('abdou')!

  // abdou does not belong to React in the seed: a clean join, then leave
  const before = memberRows(abdou)
  const joined = toggleMembership(abdou, 'react')
  assertEquals(joined.joined, true)
  assert(joined.members >= 1)
  assertEquals(memberRows(abdou), before + 1)

  const left = toggleMembership(abdou, 'react')
  assertEquals(left.joined, false)
  assertEquals(memberRows(abdou), before)
})

Deno.test('community: an unknown community is refused (PAM-502)', () => {
  restore()
  seed()
  const abdou = userIdOfLogin('abdou')!
  assertThrows(() => toggleMembership(abdou, 'no-such-community'))
})
