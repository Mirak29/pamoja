import { assert, assertEquals } from 'jsr:@std/assert@^1.0.13'
import { makeRestorePoint } from '@01edu/db'
import { now } from '@01edu/time'
import { Profile, User, UserIntent } from '/api/schema.ts'
import { createSession } from '/api/session.ts'
import { setDeclaredSkills } from '/api/skills.ts'
import { request } from '/api/testing.ts'

const restore = makeRestorePoint()

const call = async (path: string, cookie: string, body?: unknown) => {
  const res = await request(path, { body, cookie: `session=${cookie}` })
  return { status: res.status, json: await res.json().catch(() => null) }
}

let githubId = 0
const dev = async (login: string, skills: string[] = []) => {
  const at = now()
  const userId = User.insert({
    githubId: ++githubId,
    githubUsername: login,
    avatarUrl: '',
    source: 'demo',
    createdAt: at,
    updatedAt: at,
  })
  Profile.insert({
    userId,
    displayName: login,
    theme: 'minimal',
    accent: 'indigo',
    availability: 'available',
    matchingMode: 'instant',
    createdAt: at,
    updatedAt: at,
  })
  setDeclaredSkills(userId, { skills, domains: [] })
  UserIntent.insert({ userId, intent: 'Faire des reviews' })
  return { userId, session: await createSession(userId, 'demo') }
}

const form = {
  category: 'code_review',
  title: 'Relire la gestion des transactions',
  description: '',
  skills: ['Go', 'SQLite'],
  expectedLevel: 'intermediate',
  estimatedMinutes: 30,
  project: '',
  pullRequest: 0,
  videoUrl: '',
}

const inbox = async (session: string) =>
  (await call('/api/notifications', session)).json as {
    id: number
    type: string
    actor: string
    title: string
    excerpt: string
    skills: string[]
    minutes: number
    score: number
    readAt: number
  }[]

Deno.test('notifications: the match, then each step reaches the other side', async () => {
  restore()
  const abdou = await dev('abdou')
  const moussa = await dev('moussa', ['Go', 'SQLite'])
  const id = (await call('/api/help/create', abdou.session, form)).json.id
  // The match carries what the toast shows (§7.4)
  const [match] = await inbox(moussa.session)
  assertEquals(match.type, 'help_match')
  assertEquals(match.actor, 'abdou')
  assertEquals(match.skills, ['Go', 'SQLite'])
  assertEquals(match.minutes, 30)
  assert(match.score >= 50)

  await call('/api/help/accept', moussa.session, { id })
  await call('/api/help/message', moussa.session, { id, body: 'Je regarde ça' })
  await call('/api/help/withdraw', moussa.session, { id })
  assertEquals(
    (await inbox(abdou.session)).map((n) => `${n.type}:${n.actor}`),
    ['help_withdrawn:moussa', 'help_message:moussa', 'help_accepted:moussa'],
  )
  const message = (await inbox(abdou.session))[1]
  assertEquals(message.excerpt, 'Je regarde ça')
  assertEquals(message.title, form.title)
})

Deno.test('notifications: only the recipient reads them', async () => {
  restore()
  const abdou = await dev('abdou')
  const moussa = await dev('moussa', ['Go', 'SQLite'])
  await call('/api/help/create', abdou.session, form)
  await call('/api/help/create', abdou.session, { ...form, title: 'Autre' })
  const [first] = await inbox(moussa.session)
  // Someone else's id changes nothing
  await call('/api/notification/read', abdou.session, { id: first.id })
  assertEquals((await inbox(moussa.session))[0].readAt, 0)
  await call('/api/notification/read', moussa.session, { id: first.id })
  assert((await inbox(moussa.session))[0].readAt > 0)
  assertEquals((await inbox(moussa.session))[1].readAt, 0)
  await call('/api/notifications/read-all', moussa.session, {})
  assert((await inbox(moussa.session)).every((n) => n.readAt > 0))
  assertEquals(await inbox(abdou.session), [])
})

Deno.test('notifications: the matching preferences are saved and applied', async () => {
  restore()
  const abdou = await dev('abdou')
  const moussa = await dev('moussa', ['Go', 'SQLite'])
  const me = (await call('/api/user/me', moussa.session)).json
  assertEquals([me.minScore, me.helpTypes], [50, []])
  const refused = await call('/api/notification/preferences', moussa.session, {
    matchingMode: 'instant',
    minScore: 80,
    helpTypes: ['homework'],
  })
  assertEquals(refused.status, 400)
  const saved = await call('/api/notification/preferences', moussa.session, {
    matchingMode: 'instant',
    minScore: 99,
    helpTypes: ['code_review', 'debugging'],
  })
  assertEquals([saved.json.minScore, saved.json.helpTypes], [99, [
    'code_review',
    'debugging',
  ]])
  // 99 is out of reach: no match, no notification
  await call('/api/help/create', abdou.session, form)
  assertEquals(await inbox(moussa.session), [])
  // Off: never matched, whatever the score
  await call('/api/notification/preferences', moussa.session, {
    matchingMode: 'off',
    minScore: 0,
    helpTypes: [],
  })
  await call('/api/help/create', abdou.session, { ...form, title: 'Encore' })
  assertEquals(await inbox(moussa.session), [])
})
