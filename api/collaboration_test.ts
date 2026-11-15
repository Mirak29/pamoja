import { assert, assertEquals, assertThrows } from 'jsr:@std/assert@^1.0.13'
import { db, makeRestorePoint } from '@01edu/db'
import { seed } from '/api/seed.ts'
import { userIdOfLogin } from '/api/user.ts'
import {
  getHelpRequest,
  listHelpRequests,
  requestCollaboration,
} from '/api/help.ts'
import { acceptHelp } from '/api/help-lifecycle.ts'

const restore = makeRestorePoint()

const proposal = {
  target: 'moussa',
  category: 'pair_programming',
  project: '',
  pullRequest: 0,
  message: 'Une heure de pair programming sur le ledger ?',
}

const notified = (userId: number) =>
  (db.prepare(
    "SELECT count(*) AS n FROM notification WHERE userId = ? AND type = 'collaboration_request'",
  ).get(userId) as { n: number }).n

Deno.test('collaboration: a request to one developer, who alone receives it (PAM-408)', () => {
  restore()
  seed()
  const abdou = userIdOfLogin('abdou')!
  const moussa = userIdOfLogin('moussa')!
  const fatou = userIdOfLogin('fatou')!

  const id = requestCollaboration(abdou, proposal)
  const request = getHelpRequest(id)!
  assertEquals(request.title, 'Pair programming')
  // Moussa is told, and sees it among his requests; nobody else is matched
  assertEquals(notified(moussa), 1)
  assert(listHelpRequests(moussa).items.some((r) => r.id === id))
  const matched = db.prepare(
    'SELECT count(*) AS n FROM helpMatch WHERE helpRequestId = ?',
  ).get(id) as { n: number } | undefined
  assertEquals(matched?.n ?? 0, 0)

  // Only Moussa may accept it
  assertThrows(() => acceptHelp(fatou, id))
  acceptHelp(moussa, id)
})

Deno.test('collaboration: never to oneself, nor to someone who blocked you', () => {
  restore()
  seed()
  const abdou = userIdOfLogin('abdou')!
  const moussa = userIdOfLogin('moussa')!
  assertThrows(() =>
    requestCollaboration(abdou, { ...proposal, target: 'abdou' })
  )
  assertThrows(() => requestCollaboration(abdou, { ...proposal, message: ' ' }))
  assertThrows(() =>
    requestCollaboration(abdou, { ...proposal, target: 'nobody-here' })
  )
  assertThrows(() =>
    requestCollaboration(abdou, { ...proposal, category: 'devops' })
  )
  db.prepare(
    'INSERT INTO userBlock (blockerId, blockedId, createdAt) VALUES (?, ?, ?)',
  ).run(moussa, abdou, Date.now() / 1000)
  assertThrows(() => requestCollaboration(abdou, proposal))
  assertEquals(notified(moussa), 0)
})
