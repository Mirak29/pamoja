import { assert, assertEquals } from 'jsr:@std/assert@^1.0.13'
import { db, makeRestorePoint } from '@01edu/db'
import { now } from '@01edu/time'
import { entries } from '/api/entry-types.ts'
import { runHelpTimers } from '/api/help-timers.ts'
import { HelpRequest, Project, ProjectMember, User } from '/api/schema.ts'
import { createSession } from '/api/session.ts'
import { request } from '/api/testing.ts'

const restore = makeRestorePoint()
const HOUR = 3600
const DAY = 24 * HOUR

const call = async (path: string, cookie: string, body?: unknown) => {
  const res = await request(path, { body, cookie: `session=${cookie}` })
  return { status: res.status, json: await res.json().catch(() => null) }
}

const addUser = (githubId: number, login: string) => {
  const at = now()
  return User.insert({
    githubId,
    githubUsername: login,
    avatarUrl: '',
    source: 'demo',
    createdAt: at,
    updatedAt: at,
  })
}

/** Abdou asks, Moussa and Fatou can help; Yao is just around */
const setup = async (withPullRequest = false) => {
  restore()
  const at = now()
  const abdou = addUser(1, 'abdou')
  const moussa = addUser(2, 'moussa')
  const fatou = addUser(3, 'fatou')
  const yao = addUser(4, 'yao')
  const projectId = Project.insert({
    ownerId: abdou,
    name: 'OpenPay Africa',
    slug: 'openpay-africa',
    description: '',
    visibility: 'public',
    status: 'active',
    source: 'github',
    createdAt: at,
    updatedAt: at,
  })
  ProjectMember.insert({
    projectId,
    userId: abdou,
    role: 'owner',
    joinedAt: at,
  })
  let pullRequestId: number | null = null
  if (withPullRequest) {
    db.exec(`INSERT INTO repository (projectId, githubId, owner, name, fullName,
      defaultBranch, syncMode, source)
      VALUES (${projectId}, 777, 'abdou', 'openpay', 'abdou/openpay', 'main',
      'live', 'github')`)
    db.exec(`INSERT INTO pullRequest (repositoryId, githubId, number, title,
      state, authorGithubId, additions, deletions, source, createdAt, updatedAt)
      VALUES (1, 8081, 81, 'PR 81', 'open', 1, 0, 0, 'github', 0, 0)`)
    pullRequestId = 1
  }
  const id = HelpRequest.insert({
    authorId: abdou,
    projectId,
    pullRequestId,
    category: 'code_review',
    title: 'Relire la PR #81',
    description: 'Verrou SQLite',
    skills: [],
    status: 'open',
    expiresAt: at + 7 * DAY,
    source: 'platform',
    createdAt: at,
    updatedAt: at,
  })
  const session = async (userId: number) => await createSession(userId, 'demo')
  return {
    id,
    users: { abdou, moussa, fatou, yao },
    abdou: await session(abdou),
    moussa: await session(moussa),
    fatou: await session(fatou),
    yao: await session(yao),
  }
}

const statusOf = (id: number) =>
  (db.prepare('SELECT status FROM helpRequest WHERE helpRequestId = ?')
    .get(id) as { status: string }).status

const countEntries = (name: keyof typeof entries) =>
  (db.prepare('SELECT count(*) AS n FROM entry WHERE type = ?')
    .get(entries[name]) as { n: number }).n

// Moves the acceptance and the messages back in time
const age = (id: number, seconds: number) => {
  db.prepare(
    'UPDATE helpRequest SET acceptedAt = acceptedAt - ? WHERE helpRequestId = ?',
  ).run(seconds, id)
  db.prepare(
    'UPDATE helpMessage SET createdAt = createdAt - ? WHERE helpRequestId = ?',
  ).run(seconds, id)
}

Deno.test('help lifecycle: one acceptance, the second helper gets « Déjà prise »', async () => {
  const s = await setup()
  const [first, second] = await Promise.all([
    call('/api/help/accept', s.moussa, { id: s.id }),
    call('/api/help/accept', s.fatou, { id: s.id }),
  ])
  assertEquals([first.status, second.status].sort(), [200, 409])
  const loser = first.status === 409 ? first : second
  assertEquals(loser.json.message, 'Already taken')
  assertEquals(statusOf(s.id), 'accepted')
  assertEquals(
    db.prepare('SELECT count(*) AS n FROM entry WHERE helpRequestId = ?')
      .get(s.id),
    { n: 1 },
  )
  // Nor the requester, nor someone on a closed request
  assertEquals(
    (await call('/api/help/accept', s.abdou, { id: s.id })).status,
    403,
  )
})

Deno.test('help lifecycle: the helper withdraws, stays out, another one takes it', async () => {
  const s = await setup()
  await call('/api/help/accept', s.moussa, { id: s.id })
  // Only the helper withdraws
  assertEquals(
    (await call('/api/help/withdraw', s.fatou, { id: s.id })).status,
    403,
  )
  const res = await call('/api/help/withdraw', s.moussa, { id: s.id })
  assertEquals(res.status, 200)
  assertEquals(res.json.status, 'open')
  assertEquals(res.json.helper, '')
  assertEquals(res.json.left, true)
  assertEquals(
    (await call('/api/help/accept', s.moussa, { id: s.id })).status,
    403,
  )
  assertEquals(
    (await call('/api/help/accept', s.fatou, { id: s.id })).status,
    200,
  )
  const timeline = (await call('/api/help/detail?id=' + s.id, s.abdou)).json
    .timeline.map((e: { event: string; login: string }) =>
      `${e.event}:${e.login}`
    )
  assertEquals(timeline, [
    'HELP_REQUEST_ACCEPTED:moussa',
    'HELP_REQUEST_WITHDRAWN:moussa',
    'HELP_REQUEST_ACCEPTED:fatou',
  ])
})

Deno.test('help lifecycle: release only 72 h after the last activity of the helper', async () => {
  const s = await setup()
  await call('/api/help/accept', s.moussa, { id: s.id })
  assertEquals(
    (await call('/api/help/release', s.abdou, { id: s.id })).status,
    403,
  )
  age(s.id, 73 * HOUR)
  // A message of the helper counts as activity
  await call('/api/help/message', s.moussa, { id: s.id, body: 'Je regarde' })
  assertEquals(
    (await call('/api/help/release', s.abdou, { id: s.id })).status,
    403,
  )
  age(s.id, 73 * HOUR)
  const detail = (await call('/api/help/detail?id=' + s.id, s.abdou)).json
  assert(detail.releasableAt <= now())
  // Only the requester releases
  assertEquals(
    (await call('/api/help/release', s.moussa, { id: s.id })).status,
    403,
  )
  const res = await call('/api/help/release', s.abdou, { id: s.id })
  assertEquals(res.status, 200)
  assertEquals(res.json.status, 'open')
  assertEquals(
    (await call('/api/help/accept', s.moussa, { id: s.id })).status,
    403,
  )
})

Deno.test('help lifecycle: deliver, decline, reopen with the same data', async () => {
  const s = await setup()
  await call('/api/help/accept', s.moussa, { id: s.id })
  const delivered = await call('/api/help/deliver', s.moussa, { id: s.id })
  assertEquals(delivered.json.status, 'delivered')
  assertEquals(
    (await call('/api/help/decline', s.moussa, { id: s.id })).status,
    403,
  )
  const declined = await call('/api/help/decline', s.abdou, { id: s.id })
  assertEquals(declined.json.status, 'closed_unhelpful')
  const reopened = await call('/api/help/reopen', s.abdou, { id: s.id })
  assertEquals(reopened.json.status, 'open')
  assertEquals(reopened.json.helper, '')
  assertEquals(reopened.json.title, 'Relire la PR #81')
  // Moussa did not leave: he may take it again
  assertEquals(
    (await call('/api/help/accept', s.moussa, { id: s.id })).status,
    200,
  )
})

Deno.test('help lifecycle: on a PR the review is detected, not declared', async () => {
  const s = await setup(true)
  await call('/api/help/accept', s.moussa, { id: s.id })
  assertEquals(
    (await call('/api/help/deliver', s.moussa, { id: s.id })).status,
    409,
  )
})

Deno.test('help lifecycle: cancel is final', async () => {
  const s = await setup()
  await call('/api/help/accept', s.moussa, { id: s.id })
  assertEquals(
    (await call('/api/help/cancel', s.moussa, { id: s.id })).status,
    403,
  )
  const res = await call('/api/help/cancel', s.abdou, { id: s.id })
  assertEquals(res.json.status, 'cancelled')
  assertEquals(
    (await call('/api/help/reopen', s.abdou, { id: s.id })).status,
    409,
  )
  assertEquals(
    (await call('/api/help/accept', s.fatou, { id: s.id })).status,
    409,
  )
})

Deno.test('help lifecycle: the thread is for the requester and the helper', async () => {
  const s = await setup()
  // Not before an acceptance
  assertEquals(
    (await call('/api/help/message', s.abdou, { id: s.id, body: 'Allô' }))
      .status,
    409,
  )
  await call('/api/help/accept', s.moussa, { id: s.id })
  assertEquals(
    (await call('/api/help/message', s.abdou, { id: s.id, body: '  ' })).status,
    400,
  )
  await call('/api/help/message', s.abdou, { id: s.id, body: 'Merci !' })
  await call('/api/help/message', s.moussa, { id: s.id, body: 'Avec plaisir' })
  assertEquals(
    (await call('/api/help/message', s.yao, { id: s.id, body: 'Moi aussi' }))
      .status,
    403,
  )
  const forAbdou = (await call('/api/help/detail?id=' + s.id, s.abdou)).json
  assertEquals(
    forAbdou.messages.map((m: { author: string }) => m.author),
    ['abdou', 'moussa'],
  )
  // Anyone reads the request, not the thread
  const forYao = (await call('/api/help/detail?id=' + s.id, s.yao)).json
  assertEquals(forYao.title, 'Relire la PR #81')
  assertEquals(forYao.messages, [])
  // After a withdrawal the former helper still reads it
  await call('/api/help/withdraw', s.moussa, { id: s.id })
  const forMoussa = (await call('/api/help/detail?id=' + s.id, s.moussa)).json
  assertEquals(forMoussa.messages.length, 2)
})

Deno.test('help timers: expiry, reminders once, closed unconfirmed', async () => {
  const s = await setup()
  // The reminders only: each step of the lifecycle notifies too (PAM-210)
  const notifications = () =>
    db.prepare(
      "SELECT userId, type FROM notification WHERE type LIKE '%reminder' ORDER BY notificationId",
    ).all() as { userId: number; type: string }[]
  // An open request expires after 7 days
  runHelpTimers(now() + 6 * DAY)
  assertEquals(statusOf(s.id), 'open')
  runHelpTimers(now() + 7 * DAY + 1)
  assertEquals(statusOf(s.id), 'expired')
  assertEquals(countEntries('HELP_REQUEST_EXPIRED'), 1)

  await call('/api/help/reopen', s.abdou, { id: s.id })
  await call('/api/help/accept', s.moussa, { id: s.id })
  // A silent helper is reminded once, after 24 h
  runHelpTimers(now() + 23 * HOUR)
  assertEquals(notifications(), [])
  runHelpTimers(now() + 25 * HOUR)
  runHelpTimers(now() + 30 * HOUR)
  assertEquals(notifications(), [
    { userId: s.users.moussa, type: 'help_helper_reminder' },
  ])

  await call('/api/help/deliver', s.moussa, { id: s.id })
  // The requester is reminded once after 24 h, closed after 7 days
  runHelpTimers(now() + 25 * HOUR)
  runHelpTimers(now() + 26 * HOUR)
  assertEquals(notifications().map((n) => n.type), [
    'help_helper_reminder',
    'help_confirm_reminder',
  ])
  runHelpTimers(now() + 7 * DAY + 1)
  assertEquals(statusOf(s.id), 'closed_unconfirmed')
  assertEquals(countEntries('HELP_REQUEST_CLOSED'), 1)
})
