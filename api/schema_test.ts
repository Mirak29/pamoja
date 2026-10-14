import { assertEquals, assertThrows } from 'jsr:@std/assert@^1.0.13'
import { db, makeRestorePoint } from '@01edu/db'
import {
  Bookmark,
  HelpRequest,
  Post,
  Profile,
  Project,
  Task,
  User,
  UserSkill,
} from '/api/schema.ts'

const restore = makeRestorePoint()
const now = Date.now()

const addUser = (githubId: number) =>
  User.insert({
    githubId,
    githubUsername: `dev${githubId}`,
    avatarUrl: `https://avatars.githubusercontent.com/u/${githubId}`,
    source: 'demo',
    createdAt: now,
    updatedAt: now,
  })

const addProject = (ownerId: number, slug: string) =>
  Project.insert({
    ownerId,
    name: slug,
    slug,
    description: 'Un projet de test',
    visibility: 'public',
    status: 'active',
    source: 'demo',
    createdAt: now,
    updatedAt: now,
  })

const pragma = (name: string) =>
  Object.values(db.prepare(`PRAGMA ${name}`).get() as object)[0]

Deno.test('schema: the pragmas of §12.5 are set at startup', () => {
  assertEquals(pragma('foreign_keys'), 1)
  assertEquals(pragma('busy_timeout'), 5000)
})

Deno.test('schema: every table of §14 exists', () => {
  const tables = (db.prepare(
    `SELECT name FROM sqlite_master
      WHERE type = 'table' AND name NOT LIKE 'sqlite_%'`,
  ).all() as { name: string }[]).map((t) => t.name)
  assertEquals(tables.length, 38)
})

Deno.test('schema: the primary key is named after the table', () => {
  restore()
  const userId = addUser(1)
  assertEquals(User.get(userId)?.userId, userId)
})

Deno.test('schema: a join rejects a missing row', () => {
  restore()
  assertThrows(() => addProject(999, 'orphan'), Error, 'FOREIGN KEY')
})

Deno.test('schema: unique indexes reject duplicates', () => {
  restore()
  const userId = addUser(1)
  assertThrows(() => addUser(1), Error, 'UNIQUE')

  addProject(userId, 'pamoja')
  assertThrows(() => addProject(userId, 'pamoja'), Error, 'UNIQUE')

  const profile = {
    userId,
    displayName: 'Awa',
    theme: 'system',
    accent: 'indigo',
    availability: 'open',
    matchingMode: 'instant',
    createdAt: now,
    updatedAt: now,
  }
  Profile.insert(profile)
  assertThrows(() => Profile.insert(profile), Error, 'UNIQUE')
})

Deno.test('schema: a skill can come from several sources once each', () => {
  restore()
  const userId = addUser(1)
  db.exec(
    `INSERT INTO skill (slug, name, category) VALUES ('go', 'Go', 'language')`,
  )
  const skillId = db.lastInsertRowId
  const skill = { userId, skillId, createdAt: now }
  UserSkill.insert({ ...skill, source: 'declared' })
  UserSkill.insert({ ...skill, source: 'github' })
  assertThrows(
    () => UserSkill.insert({ ...skill, source: 'github' }),
    Error,
    'UNIQUE',
  )
})

Deno.test('schema: optional columns accept null, others do not', () => {
  restore()
  const authorId = addUser(1)
  const request = {
    authorId,
    category: 'review',
    title: 'Relire ma PR SQLite',
    description: 'Une requête lente',
    skills: [],
    status: 'open',
    expiresAt: now + 86_400_000,
    source: 'platform',
    createdAt: now,
    updatedAt: now,
  }
  const helpRequestId = HelpRequest.insert(request)
  assertEquals(HelpRequest.get(helpRequestId)?.acceptedBy, null)
  assertThrows(
    () => HelpRequest.insert({ ...request, title: null as unknown as string }),
    Error,
    'NOT NULL',
  )
})

Deno.test('schema: self references and the board column work', () => {
  restore()
  const userId = addUser(1)
  const projectId = addProject(userId, 'pamoja')
  const post = {
    authorId: userId,
    type: 'discussion',
    body: 'Qui connaît SQLite ?',
    source: 'platform',
    createdAt: now,
    updatedAt: now,
  }
  const postId = Post.insert(post)
  const replyId = Post.insert({ ...post, parentId: postId, rootId: postId })
  assertEquals(Post.get(replyId)?.parentId, postId)
  Bookmark.insert({ userId, postId, createdAt: now })

  const taskId = Task.insert({
    projectId,
    boardColumn: 'backlog',
    title: 'Brancher les webhooks',
    rank: 'a0',
    createdAt: now,
    updatedAt: now,
  })
  assertEquals(Task.get(taskId)?.boardColumn, 'backlog')
})
