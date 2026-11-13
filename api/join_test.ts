import { assertEquals, assertThrows } from 'jsr:@std/assert@^1.0.13'
import { db, makeRestorePoint } from '@01edu/db'
import { seed } from '/api/seed.ts'
import { userIdOfLogin } from '/api/user.ts'
import { applyToProject, decideJoinRequest } from '/api/join.ts'

const restore = makeRestorePoint()

const lastRequest = (userId: number) =>
  db.prepare(
    `SELECT joinRequestId, status FROM joinRequest
     WHERE userId = ? ORDER BY joinRequestId DESC`,
  ).get(userId) as { joinRequestId: number; status: string }

const roleIn = (slug: string, userId: number) =>
  (db.prepare(
    `SELECT role FROM projectMember pm JOIN project p ON p.projectId = pm.projectId
     WHERE p.slug = ? AND pm.userId = ?`,
  ).get(slug, userId) as { role: string } | undefined)?.role

Deno.test('join: apply then accept adds the member (PAM-403)', () => {
  restore()
  seed()
  const moussa = userIdOfLogin('moussa')!
  const abdou = userIdOfLogin('abdou')!

  const res = applyToProject(
    moussa,
    'openpay-africa',
    ['Backend', 'Tests'],
    '~5 h par semaine',
    'Je veux aider sur la concurrence SQLite',
  )
  assertEquals(res.applied, true)
  assertEquals(lastRequest(moussa).status, 'pending')

  // A second candidature while one is pending is refused
  assertThrows(() =>
    applyToProject(moussa, 'openpay-africa', ['Backend'], '', '')
  )

  // The owner accepts: the applicant joins as a contributor
  const request = lastRequest(moussa)
  assertEquals(
    decideJoinRequest(abdou, request.joinRequestId, true).status,
    'accepted',
  )
  assertEquals(roleIn('openpay-africa', moussa), 'contributor')

  // Deciding again is refused
  assertThrows(() => decideJoinRequest(abdou, request.joinRequestId, true))
})

Deno.test('join: only a manager decides, no self-apply (PAM-403)', () => {
  restore()
  seed()
  const moussa = userIdOfLogin('moussa')!
  const abdou = userIdOfLogin('abdou')!
  const kofi = userIdOfLogin('kofi')!

  applyToProject(moussa, 'openpay-africa', ['Backend'], '', '')
  const request = lastRequest(moussa)
  // kofi is not a manager of OpenPay → forbidden
  assertThrows(() => decideJoinRequest(kofi, request.joinRequestId, true))

  // The owner cannot apply to their own project, nor to an unknown one
  assertThrows(() =>
    applyToProject(abdou, 'openpay-africa', ['Backend'], '', '')
  )
  assertThrows(() =>
    applyToProject(moussa, 'no-such-project', ['Backend'], '', '')
  )
})
