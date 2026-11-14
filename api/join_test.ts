import { assertEquals, assertThrows } from 'jsr:@std/assert@^1.0.13'
import { LIMITS } from '/api/limits.ts'
import { db, makeRestorePoint } from '@01edu/db'
import { listNotifications, readAllNotifications } from '/api/notifications.ts'
import { seed } from '/api/seed.ts'
import { userIdOfLogin } from '/api/user.ts'
import { applyToProject, decideJoinRequest } from '/api/join.ts'

const restore = makeRestorePoint()

const lastRequest = (userId: number) =>
  db.prepare(
    `SELECT joinRequestId, status FROM joinRequest
     WHERE userId = ? ORDER BY joinRequestId DESC`,
  ).get(userId) as { joinRequestId: number; status: string }

// A time the dialog offers (api/vocabulary.ts)
const WEEKLY = '4 h par semaine'

// Why the server refused: the reason the page reads to say what happened
const refusal = async (attempt: () => unknown) => {
  try {
    attempt()
  } catch (error) {
    return (await (error as { response: Response }).response.json()).reason
  }
  return 'accepted'
}

const roleIn = (slug: string, userId: number) =>
  (db.prepare(
    `SELECT role FROM projectMember pm JOIN project p ON p.projectId = pm.projectId
     WHERE p.slug = ? AND pm.userId = ?`,
  ).get(slug, userId) as { role: string } | undefined)?.role

Deno.test('join: apply then accept adds the member (PAM-403)', async () => {
  restore()
  seed()
  const moussa = userIdOfLogin('moussa')!
  const abdou = userIdOfLogin('abdou')!

  const res = applyToProject(
    moussa,
    'openpay-africa',
    ['Backend', 'Tests'],
    WEEKLY,
    'Je veux aider sur la concurrence SQLite',
  )
  assertEquals(res.applied, true)
  assertEquals(lastRequest(moussa).status, 'pending')

  // A second candidature while one is pending is refused, and says so
  assertEquals(
    await refusal(() =>
      applyToProject(moussa, 'openpay-africa', ['Backend'], WEEKLY, '')
    ),
    'pending',
  )

  // The owner accepts: the applicant joins as a contributor
  const request = lastRequest(moussa)
  assertEquals(
    decideJoinRequest(abdou, request.joinRequestId, true).status,
    'accepted',
  )
  assertEquals(roleIn('openpay-africa', moussa), 'contributor')

  // A request that is not there says so, apart from an unknown project
  assertEquals(
    await refusal(() => decideJoinRequest(abdou, 999_999, true)),
    'gone',
  )
  // Deciding again is refused, and says so
  assertEquals(
    await refusal(() => decideJoinRequest(abdou, request.joinRequestId, true)),
    'decided',
  )
})

Deno.test('join: only a manager decides, no self-apply (PAM-403)', async () => {
  restore()
  seed()
  const moussa = userIdOfLogin('moussa')!
  const abdou = userIdOfLogin('abdou')!
  const kofi = userIdOfLogin('kofi')!

  applyToProject(moussa, 'openpay-africa', ['Backend'], WEEKLY, '')
  const request = lastRequest(moussa)
  // kofi is not a manager of OpenPay → forbidden
  assertThrows(() => decideJoinRequest(kofi, request.joinRequestId, true))

  // The owner cannot apply to their own project, nor to an unknown one
  assertEquals(
    await refusal(() =>
      applyToProject(abdou, 'openpay-africa', ['Backend'], WEEKLY, '')
    ),
    'member',
  )
  assertEquals(
    await refusal(() =>
      applyToProject(moussa, 'no-such-project', ['Backend'], WEEKLY, '')
    ),
    'unknown',
  )
})

Deno.test('join: the answers come from the lists of the dialog (PAM-403, §16)', async () => {
  restore()
  seed()
  const kofi = userIdOfLogin('kofi')!
  const apply = (areas: string[], availability: string, message = '') => () =>
    applyToProject(kofi, 'openpay-africa', areas, availability, message)
  // An area or a time the dialog does not offer, or none
  assertEquals(await refusal(apply(['Marketing'], WEEKLY)), 'invalid')
  assertEquals(await refusal(apply([], WEEKLY)), 'invalid')
  assertEquals(await refusal(apply(['Backend'], '~5 h par semaine')), 'invalid')
  // A message longer than the page lets one write
  const long = 'x'.repeat(LIMITS.note + 1)
  assertEquals(await refusal(apply(['Backend'], WEEKLY, long)), 'invalid')
  // Repeated areas are counted once, not refused
  assertEquals(
    await refusal(
      apply(
        ['Backend', 'Backend', 'Tests', 'Tests', 'DevOps', 'DevOps'],
        WEEKLY,
      ),
    ),
    'accepted',
  )
  db.prepare('DELETE FROM joinRequest WHERE userId = ?').run(kofi)
  // Within the lists and the limit: sent, each area once
  assertEquals(
    await refusal(apply(['Backend', 'Backend', 'Tests'], WEEKLY, 'x')),
    'accepted',
  )
  const areas = db.prepare(
    'SELECT areas FROM joinRequest WHERE userId = ? ORDER BY joinRequestId DESC',
  ).get(kofi) as { areas: string | string[] }
  const saved = typeof areas.areas === 'string'
    ? JSON.parse(areas.areas)
    : areas.areas
  assertEquals(saved, ['Backend', 'Tests'])
})

Deno.test('join: manager decisions follow request state independently of reading', () => {
  for (const accept of [true, false]) {
    restore()
    seed()
    const applicant = userIdOfLogin('moussa')!
    const manager = userIdOfLogin('abdou')!
    applyToProject(applicant, 'openpay-africa', ['Backend'], WEEKLY, '')
    const request = lastRequest(applicant)
    const notification = () =>
      listNotifications(manager).items.find((n) =>
        n.joinRequestId === request.joinRequestId
      )!
    assertEquals(notification().accepted, -1)
    readAllNotifications(manager)
    assertEquals(notification().accepted, -1)
    decideJoinRequest(manager, request.joinRequestId, accept)
    assertEquals(notification().accepted, accept ? 1 : 0)
    // The same state is returned for an unread manager notification too.
    db.prepare('UPDATE notification SET readAt = NULL WHERE userId = ?').run(
      manager,
    )
    assertEquals(notification().accepted, accept ? 1 : 0)
    const outcome = listNotifications(applicant).items.find((n) =>
      n.type === 'application'
    )!
    assertEquals(outcome.accepted, accept ? 1 : 0)
    assertEquals(outcome.joinRequestId, 0)
  }
})
