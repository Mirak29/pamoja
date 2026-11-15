import { assert, assertEquals, assertThrows } from 'jsr:@std/assert@^1.0.13'
import { makeRestorePoint } from '@01edu/db'
import { seed } from '/api/seed.ts'
import { userIdOfLogin } from '/api/user.ts'
import { createTask, listBoard, moveTask } from '/api/board.ts'
import {
  attachTask,
  createMilestone,
  listRoadmap,
  updateMilestone,
} from '/api/roadmap.ts'

const restore = makeRestorePoint()

Deno.test('roadmap: the seed attaches the board to the milestone in progress', () => {
  restore()
  seed()
  const abdou = userIdOfLogin('abdou')!
  const { milestones } = listRoadmap(abdou, 'openpay-africa')
  const active = milestones.find((m) => m.status === 'active')!
  const cards = listBoard(abdou, 'openpay-africa')
  assertEquals(active.total, cards.length)
  assertEquals(active.done, cards.filter((c) => c.column === 'done').length)
  assert(cards.every((c) => c.milestone === active.id))
})

Deno.test('roadmap: maintainers plan, members attach cards, progress follows the board (PAM-405)', () => {
  restore()
  seed()
  const abdou = userIdOfLogin('abdou')!
  const moussa = userIdOfLogin('moussa')!
  assert(listRoadmap(abdou, 'openpay-africa').canManage)
  assert(!listRoadmap(moussa, 'openpay-africa').canManage)

  const { id } = createMilestone(abdou, 'openpay-africa', {
    title: '  v1.0 · Production  ',
    description: 'Mise en production',
    status: 'planned',
  })
  let milestone = listRoadmap(abdou, 'openpay-africa').milestones.at(-1)!
  assertEquals(
    [milestone.id, milestone.title, milestone.status, milestone.total],
    [id, 'v1.0 · Production', 'planned', 0],
  )

  // Two cards attached, one done: half the milestone
  const first = createTask(abdou, 'openpay-africa', 'Monitoring').id
  const second = createTask(abdou, 'openpay-africa', 'Runbook').id
  attachTask(abdou, first, id)
  attachTask(abdou, second, id)
  moveTask(abdou, first, 'done')
  updateMilestone(abdou, id, {
    title: 'v1.0',
    description: '',
    status: 'active',
  })
  milestone = listRoadmap(abdou, 'openpay-africa').milestones.at(-1)!
  assertEquals(
    [milestone.title, milestone.description, milestone.status],
    ['v1.0', '', 'active'],
  )
  assertEquals([milestone.done, milestone.total], [1, 2])

  // Detached: it leaves the progress
  attachTask(abdou, second, 0)
  milestone = listRoadmap(abdou, 'openpay-africa').milestones.at(-1)!
  assertEquals([milestone.done, milestone.total], [1, 1])

  // Someone outside the project neither plans nor attaches; a bad status, an
  // empty title or a milestone of another project is refused
  const input = { title: 'x', description: '', status: 'planned' }
  assertThrows(() => createMilestone(moussa, 'openpay-africa', input))
  assertThrows(() => updateMilestone(moussa, id, input))
  assertThrows(() => attachTask(moussa, first, id))
  assertThrows(() =>
    createMilestone(abdou, 'openpay-africa', { ...input, status: 'late' })
  )
  assertThrows(() =>
    createMilestone(abdou, 'openpay-africa', { ...input, title: '  ' })
  )
  assertThrows(() => attachTask(abdou, first, 999999))
})
