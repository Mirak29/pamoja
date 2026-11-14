import { assert, assertEquals, assertThrows } from 'jsr:@std/assert@^1.0.13'
import { db, makeRestorePoint } from '@01edu/db'
import { seed } from '/api/seed.ts'
import { userIdOfLogin } from '/api/user.ts'
import { createTask, listBoard, moveTask } from '/api/board.ts'
import { rankBetween } from '/api/lib/rank.ts'

const restore = makeRestorePoint()

Deno.test('rank: appending and inserting keep a strict order (PAM-404)', () => {
  const a = rankBetween('', '')
  const b = rankBetween(a, '')
  assert(a < b) // appending (b empty) grows the rank
  assert(a < rankBetween(a, b) && rankBetween(a, b) < b) // room between
  assert(rankBetween('', a) < a) // prepending shrinks it

  // Forty appends to a column stay strictly ordered, never renumbering the
  // ones before (a move appends with rankBetween(last, ''))
  let prev = a
  for (let i = 0; i < 40; i++) {
    const next = rankBetween(prev, '')
    assert(prev < next)
    prev = next
  }
})

Deno.test('board: a member creates and moves cards, persisted (PAM-404)', () => {
  restore()
  seed()
  const abdou = userIdOfLogin('abdou')!
  const moussa = userIdOfLogin('moussa')!

  const before = listBoard(abdou, 'openpay-africa').length
  const card = createTask(abdou, 'openpay-africa', 'Une carte de test')
  assertEquals(card.column, 'backlog')
  assertEquals(listBoard(abdou, 'openpay-africa').length, before + 1)

  const moved = moveTask(abdou, card.id, 'review')
  assertEquals(moved.column, 'review')
  assertEquals(
    listBoard(abdou, 'openpay-africa').find((c) => c.id === card.id)?.column,
    'review',
  )

  // A non-member cannot create or move; an unknown column or card is refused
  assertThrows(() => createTask(moussa, 'openpay-africa', 'x'))
  assertThrows(() => moveTask(moussa, card.id, 'done'))
  assertThrows(() => moveTask(abdou, card.id, 'nope'))
  assertThrows(() => moveTask(abdou, 999999, 'done'))
})

Deno.test('board: a private project shows its board to its members only', () => {
  restore()
  seed()
  const abdou = userIdOfLogin('abdou')!
  const moussa = userIdOfLogin('moussa')!
  db.prepare("UPDATE project SET visibility = 'private' WHERE slug = ?")
    .run('openpay-africa')
  assert(Array.isArray(listBoard(abdou, 'openpay-africa')))
  assertThrows(() => listBoard(moussa, 'openpay-africa'))
})
