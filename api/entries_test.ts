import { assertEquals } from 'jsr:@std/assert@^1.0.13'
import { db, makeRestorePoint } from '@01edu/db'
import { now } from '@01edu/time'
import {
  entries,
  Entry,
  type EntryListener,
  entryNames,
  maybe,
} from '/api/entries.ts'
import {
  HelpMatch,
  HelpRequest,
  Project,
  ProjectMessage,
  Task,
  User,
} from '/api/schema.ts'

const restore = makeRestorePoint()
const at = now()

const addUser = (githubId: number) =>
  User.insert({
    githubId,
    githubUsername: `dev${githubId}`,
    avatarUrl: `https://avatars.githubusercontent.com/u/${githubId}`,
    source: 'demo',
    createdAt: at,
    updatedAt: at,
  })

const addProject = (ownerId: number) =>
  Project.insert({
    ownerId,
    name: 'OpenPay Africa',
    slug: `openpay-${ownerId}`,
    description: 'Paiements mobiles',
    visibility: 'public',
    status: 'active',
    source: 'demo',
    createdAt: at,
    updatedAt: at,
  })

const addHelpRequest = (authorId: number, projectId: number) =>
  HelpRequest.insert({
    authorId,
    projectId,
    category: 'review',
    title: 'Relire la PR #81',
    description: 'Une requête SQLite lente',
    skills: [],
    status: 'open',
    expiresAt: at + 7 * 86_400,
    source: 'demo',
    createdAt: at,
    updatedAt: at,
  })

// A listener whose stream records the entries it receives
const listen = (userId: number, sets: Partial<EntryListener> = {}) => {
  const received: string[] = []
  const decoder = new TextDecoder()
  const sub: EntryListener = {
    userId,
    projectIds: new Set(),
    followedProjectIds: new Set(),
    communityIds: new Set(),
    moderatedCommunityIds: new Set(),
    followedUserIds: new Set(),
    connectionId: crypto.randomUUID(),
    controller: {
      enqueue: (chunk: Uint8Array) => {
        const [, type] = JSON.parse(decoder.decode(chunk).slice(6))
        received.push(entryNames[type as keyof typeof entryNames])
      },
    } as unknown as ReadableStreamDefaultController,
    ...sets,
  }
  Entry.insertListeners.add(sub)
  return received
}

const clear = () => Entry.insertListeners.clear()

Deno.test('entries: numbers go from 1 to N without a gap', () => {
  const ids = Object.values(entries).sort((a, b) => a - b)
  assertEquals(ids, ids.map((_, i) => i + 1))
})

Deno.test('entries: the type table matches the declared names', () => {
  const rows = db.prepare('SELECT typeId, typeName FROM type').all() as {
    typeId: number
    typeName: string
  }[]
  assertEquals(
    Object.fromEntries(rows.map((r) => [r.typeName, r.typeId])),
    { ...entries },
  )
})

Deno.test('entries: a proof keeps its frozen fields', () => {
  restore()
  const requesterId = addUser(1)
  const helperId = addUser(2)
  const projectId = addProject(requesterId)
  const helpRequestId = addHelpRequest(requesterId, projectId)
  const skills = [{ skillId: 1, slug: 'sqlite', name: 'SQLite' }]
  const entryId = Entry.insert.HELP_CONFIRMED({
    userId: helperId,
    projectId,
    helpRequestId,
    requesterId,
    skills,
    helpCategory: 'debug',
    eligible: 1,
    exclusionReason: '',
    rulesVersion: 1,
    source: 'demo',
  })
  const proof = db.prepare(
    `SELECT e.userId, s.skills, r.requesterId, o.source
      FROM entry e
      JOIN entrySkills s ON s.entryId = e.id
      JOIN entryRequesterId r ON r.entryId = e.id
      JOIN entrySource o ON o.entryId = e.id
      WHERE e.id = ?`,
  ).get(entryId) as Record<string, unknown>
  assertEquals(proof, {
    userId: helperId,
    skills: JSON.stringify(skills),
    requesterId,
    source: 'demo',
  })
})

Deno.test('entries: a relation « if any » can be absent', () => {
  restore()
  const userId = addUser(1)
  const helpRequestId = addHelpRequest(userId, addProject(userId))
  const entryId = Entry.insert.HELP_REQUEST_CREATED({
    userId,
    projectId: maybe(undefined),
    helpRequestId,
    source: 'platform',
  })
  assertEquals(Entry.get(entryId)?.projectId, null)
})

Deno.test('entries: an archived entry leaves the entry view', () => {
  restore()
  const userId = addUser(1)
  const entryId = Entry.insert.USER_LOGIN({ userId, source: 'platform' })
  Entry.archive(entryId)
  assertEquals(
    db.prepare('SELECT count(*) AS n FROM entry WHERE id = ?').get(entryId),
    { n: 0 },
  )
})

Deno.test('entries: a type without trigger is never broadcast', () => {
  restore()
  const userId = addUser(1)
  const received = listen(userId)
  Entry.insert.USER_LOGIN({ userId, source: 'platform' })
  clear()
  assertEquals(received, [])
})

Deno.test('entries: a card reaches members, not followers', () => {
  restore()
  const ownerId = addUser(1)
  const projectId = addProject(ownerId)
  const member = listen(ownerId, { projectIds: new Set([projectId]) })
  const follower = listen(addUser(2), {
    followedProjectIds: new Set([projectId]),
  })
  const taskId = Task.insert({
    projectId,
    boardColumn: 'ready',
    title: 'Brancher les webhooks',
    rank: 'a0',
    createdAt: at,
    updatedAt: at,
  })
  Entry.insert.TASK_UPDATED({
    userId: ownerId,
    projectId,
    taskId,
    source: 'platform',
  })
  Entry.insert.PROJECT_UPDATED({ userId: ownerId, projectId, source: 'demo' })
  clear()
  assertEquals(member, ['TASK_UPDATED', 'PROJECT_UPDATED'])
  assertEquals(follower, ['PROJECT_UPDATED'])
})

Deno.test('entries: followers only read #annonces', () => {
  restore()
  const ownerId = addUser(1)
  const projectId = addProject(ownerId)
  const follower = listen(addUser(2), {
    followedProjectIds: new Set([projectId]),
  })
  for (const channel of ['general', 'announcements']) {
    const messageId = ProjectMessage.insert({
      projectId,
      channel,
      authorId: ownerId,
      body: `Message dans ${channel}`,
      source: 'platform',
      createdAt: at,
    })
    Entry.insert.MESSAGE_CREATED({
      userId: ownerId,
      projectId,
      messageId,
      source: 'platform',
    })
  }
  clear()
  assertEquals(follower.length, 1)
})

Deno.test('entries: help events reach the requester and the matched', () => {
  restore()
  const requesterId = addUser(1)
  const helperId = addUser(2)
  const matchedId = addUser(3)
  const strangerId = addUser(4)
  const projectId = addProject(requesterId)
  const helpRequestId = addHelpRequest(requesterId, projectId)
  for (const userId of [helperId, matchedId]) {
    HelpMatch.insert({
      helpRequestId,
      userId,
      score: 80,
      reasons: [],
      wave: 1,
      newcomerSlot: 0,
      status: 'notified',
    })
  }
  const requester = listen(requesterId)
  const matched = listen(matchedId)
  const stranger = listen(strangerId)
  Entry.insert.HELP_REQUEST_ACCEPTED({
    userId: helperId,
    projectId,
    helpRequestId,
    source: 'platform',
  })
  Entry.insert.HELP_REQUEST_WITHDRAWN({
    userId: helperId,
    helpRequestId,
    source: 'platform',
  })
  clear()
  assertEquals(requester, ['HELP_REQUEST_ACCEPTED', 'HELP_REQUEST_WITHDRAWN'])
  assertEquals(matched, ['HELP_REQUEST_WITHDRAWN'])
  assertEquals(stranger, [])
})

Deno.test('entries: a listener whose stream fails is removed', () => {
  restore()
  const userId = addUser(1)
  Entry.insertListeners.add({
    userId,
    controller: {
      enqueue: () => {
        throw Error('closed')
      },
    } as unknown as ReadableStreamDefaultController,
  })
  Entry.insert.BADGE_UNLOCKED({ userId, source: 'platform' })
  assertEquals(Entry.insertListeners.size, 0)
})
