import { assert, assertEquals, assertThrows } from 'jsr:@std/assert@^1.0.13'
import { db, makeRestorePoint } from '@01edu/db'
import { seed } from '/api/seed.ts'
import { userIdOfLogin } from '/api/user.ts'
import { inviteHelper, listProjectHelpers } from '/api/project-helpers.ts'

const restore = makeRestorePoint()

const invites = (login: string) =>
  (db.prepare(
    "SELECT count(*) AS n FROM notification WHERE userId = ? AND type = 'project_invite'",
  ).get(userIdOfLogin(login)!) as { n: number }).n

Deno.test('helpers: the matching proposes who could help, members aside (PAM-402)', () => {
  restore()
  seed()
  const abdou = userIdOfLogin('abdou')!
  const { canInvite, needs } = listProjectHelpers(abdou, 'openpay-africa')
  assert(canInvite)
  assert(needs.length > 0)
  const all = needs.flatMap((n) => n.helpers)
  // Moussa holds Go and SQLite and is no member: proposed
  const moussa = all.find((h) => h.login === 'moussa')!
  assert(moussa)
  assert(moussa.skills.includes('Go'))
  assert(moussa.confirmed > 0)
  // Never a member of the project, three at most per need, best first
  const members = ['abdou', 'fatou']
  assert(all.every((h) => !members.includes(h.login)))
  for (const need of needs) {
    assert(need.helpers.length <= 3)
    const scores = need.helpers.map((h) => h.score)
    assertEquals([...scores].sort((a, b) => b - a), scores)
  }
})

Deno.test('helpers: a manager invites once, the developer is told', () => {
  restore()
  seed()
  const abdou = userIdOfLogin('abdou')!
  const moussa = userIdOfLogin('moussa')!
  const need = listProjectHelpers(abdou, 'openpay-africa').needs
    .find((n) => n.helpers.some((h) => h.login === 'moussa'))!

  const invite = { slug: 'openpay-africa', login: 'moussa', need: need.title }
  inviteHelper(abdou, invite)
  // Twice: one notification
  inviteHelper(abdou, invite)
  assertEquals(invites('moussa'), 1)
  const shown = listProjectHelpers(abdou, 'openpay-africa').needs
    .find((n) => n.title === need.title)!.helpers
    .find((h) => h.login === 'moussa')!
  assert(shown.invited)

  // Only a manager, never a member, never an unknown need
  assertThrows(() => inviteHelper(moussa, { ...invite, login: 'awa' }))
  assertThrows(() => inviteHelper(abdou, { ...invite, login: 'fatou' }))
  assertThrows(() => inviteHelper(abdou, { ...invite, need: 'Inconnu' }))
  assert(!listProjectHelpers(moussa, 'openpay-africa').canInvite)
})
