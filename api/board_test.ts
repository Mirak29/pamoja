import { assert, assertEquals, assertThrows } from 'jsr:@std/assert@^1.0.13'
import { db, makeRestorePoint } from '@01edu/db'
import { seed } from '/api/seed.ts'
import { userIdOfLogin } from '/api/user.ts'
import {
  cardForPullRequest,
  createTask,
  linkTask,
  listBoard,
  markMergedPullDone,
  moveTask,
} from '/api/board.ts'
import { Issue, PullRequest, Repository } from '/api/schema.ts'
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

// The repo of OpenPay Africa with PR #81 open, PR #80 merged and issue #12
const withRepo = () => {
  const projectId = (db.prepare(
    "SELECT projectId FROM project WHERE slug = 'openpay-africa'",
  ).get() as { projectId: number }).projectId
  const at = Date.now() / 1000
  const repositoryId = Repository.insert({
    projectId,
    githubId: 777,
    owner: 'abdou',
    name: 'openpay-africa',
    fullName: 'abdou/openpay-africa',
    defaultBranch: 'main',
    syncMode: 'live',
    source: 'github',
  })
  const pulls: Record<number, number> = {}
  for (const [number, state] of [[81, 'open'], [80, 'merged']] as const) {
    pulls[number] = PullRequest.insert({
      repositoryId,
      githubId: 8000 + number,
      number,
      title: `Ledger PR ${number}`,
      state,
      authorGithubId: 1,
      additions: 10,
      deletions: 2,
      source: 'github',
      createdAt: at,
      updatedAt: at,
    })
  }
  Issue.insert({
    repositoryId,
    githubId: 912,
    number: 12,
    title: 'Webhooks signés',
    state: 'open',
    labels: [],
    authorGithubId: 1,
    source: 'github',
    createdAt: at,
    updatedAt: at,
  })
  return { repositoryId, pulls }
}

Deno.test('board: a card linked to an issue or a PR, one card each (PAM-404)', () => {
  restore()
  seed()
  const abdou = userIdOfLogin('abdou')!
  const moussa = userIdOfLogin('moussa')!
  withRepo()
  const find = (id: number) =>
    listBoard(abdou, 'openpay-africa').find((c) => c.id === id)!

  // From an issue: titled after it, in the Backlog
  const fromIssue = createTask(abdou, 'openpay-africa', '', { issue: 12 })
  assertEquals([fromIssue.title, fromIssue.column], [
    'Webhooks signés',
    'backlog',
  ])
  assertEquals(find(fromIssue.id).issue, 12)
  // From an open PR: in Review; a merged one goes to Done
  const fromPull = createTask(abdou, 'openpay-africa', '', { pullRequest: 81 })
  assertEquals(fromPull.column, 'review')
  assertEquals(find(fromPull.id).pullRequest, 81)
  // One card each
  assertThrows(() => createTask(abdou, 'openpay-africa', '', { issue: 12 }))
  // An internal card linked afterwards to the merged PR goes to Done
  const internal = createTask(abdou, 'openpay-africa', 'Réconciliation')
  assertEquals(linkTask(abdou, internal.id, { pullRequest: 80 }).column, 'done')
  assertEquals(find(internal.id).pullRequest, 80)
  // Unlinked: internal again, where it is
  linkTask(abdou, internal.id, {})
  assertEquals([find(internal.id).pullRequest, find(internal.id).column], [
    0,
    'done',
  ])

  // Unknown numbers, or someone outside the project, are refused
  assertThrows(() => createTask(abdou, 'openpay-africa', '', { issue: 999 }))
  assertThrows(() => linkTask(moussa, internal.id, { issue: 12 }))
  assertThrows(() => createTask(abdou, 'openpay-africa', '', {}))
})

Deno.test('board: a PR opened gets its card, merged it goes to Done (PAM-404)', () => {
  restore()
  seed()
  const abdou = userIdOfLogin('abdou')!
  const { repositoryId, pulls } = withRepo()
  cardForPullRequest(pulls[81], null)
  // Only once
  cardForPullRequest(pulls[81], null)
  const cards = () =>
    listBoard(abdou, 'openpay-africa').filter((c) => c.pullRequest === 81)
  assertEquals(cards().length, 1)
  assertEquals(cards()[0].column, 'review')

  // Merged: the webhook or the refresh moves it to Done
  db.prepare("UPDATE pullRequest SET state = 'merged' WHERE number = 81")
    .run()
  markMergedPullDone(repositoryId, 81)
  assertEquals(cards()[0].column, 'done')
})
