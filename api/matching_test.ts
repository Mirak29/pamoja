import { assert, assertEquals } from 'jsr:@std/assert@^1.0.13'
import { db, makeRestorePoint } from '@01edu/db'
import { now } from '@01edu/time'
import { Entry, maybe } from '/api/entries.ts'
import { runHelpTimers } from '/api/help-timers.ts'
import { pickWave, rank } from '/api/matching.ts'
import {
  Community,
  CommunityMember,
  Profile,
  Project,
  User,
  UserIntent,
} from '/api/schema.ts'
import { createSession } from '/api/session.ts'
import { setDeclaredSkills, skillIdsOf } from '/api/skills.ts'
import { request } from '/api/testing.ts'

const restore = makeRestorePoint()
const HOUR = 3600

const call = async (path: string, cookie: string, body?: unknown) => {
  const res = await request(path, { body, cookie: `session=${cookie}` })
  return { status: res.status, json: await res.json().catch(() => null) }
}

let githubId = 0
/** A developer with a profile, declared skills and intents */
const dev = (
  login: string,
  skills: string[],
  options: {
    intents?: string[]
    mode?: string
    minScore?: number
    available?: boolean
  } = {},
) => {
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
    availability: options.available === false ? 'busy' : 'available',
    matchingMode: options.mode ?? 'instant',
    matchingFilters: options.minScore === undefined
      ? null
      : { minScore: options.minScore },
    createdAt: at,
    updatedAt: at,
  })
  setDeclaredSkills(userId, { skills, domains: [] })
  for (const intent of options.intents ?? []) {
    UserIntent.insert({ userId, intent })
  }
  return userId
}

const confirm = (helperId: number, requesterId: number, skills: string[]) =>
  Entry.insert.HELP_CONFIRMED({
    userId: helperId,
    projectId: maybe(null),
    helpRequestId: maybe(null),
    requesterId,
    skills: skillIdsOf(skills).map((skillId) => ({ skillId })),
    helpCategory: 'debugging',
    eligible: 1,
    exclusionReason: '',
    rulesVersion: 1,
    source: 'demo',
  })

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

Deno.test('matching: the score and its reasons (§7.3)', () => {
  restore()
  const abdou = dev('abdou', ['Go'])
  const moussa = dev('moussa', ['Go', 'SQLite', 'Backend'], {
    intents: ['Faire des reviews'],
  })
  const awa = dev('awa', ['SQLite'], { available: false })
  dev('yao', ['Rust'])
  dev('off', ['Go', 'SQLite'], { mode: 'off' })
  dev('picky', ['Go', 'SQLite'], { minScore: 95 })
  // A community in common with the requester
  const go = Community.insert({
    name: 'Go',
    slug: 'go',
    description: '',
    type: 'technology',
    source: 'demo',
    createdAt: now(),
  })
  for (const userId of [abdou, moussa]) {
    CommunityMember.insert({
      communityId: go,
      userId,
      role: 'member',
      joinedAt: now(),
    })
  }
  for (let i = 0; i < 14; i++) confirm(moussa, abdou, ['Go'])
  const ranked = rank({
    authorId: abdou,
    category: 'code_review',
    skills: skillIdsOf(['Go', 'SQLite']),
    projectId: null,
  })
  // Neither the requester, nor a skill missing, nor Off, nor under the
  // minimum chosen
  assertEquals(ranked.map((c) => c.login), ['moussa'])
  const [first] = ranked
  assertEquals(
    first.reasons.map((r) => [r.kind, r.points]),
    [
      ['skills', 32],
      ['type', 15],
      ['confirmed', 15],
      // Available, and active: the entries of the confirmed helps
      ['availability', 10],
      ['affinity', 5],
    ],
  )
  assertEquals(first.score, 77)
  assertEquals(first.newcomer, false)
  // Awa: one skill out of two, busy, no type, no help: under 50
  const all = rank(
    {
      authorId: abdou,
      category: 'code_review',
      skills: skillIdsOf(['Go', 'SQLite']),
      projectId: null,
    },
    new Set(),
    now(),
  )
  assert(!all.some((c) => c.userId === awa))
})

Deno.test('matching: a wave of 5 keeps a seat for a promising newcomer', () => {
  restore()
  const abdou = dev('abdou', [])
  const seniors = ['a1', 'a2', 'a3', 'a4', 'a5'].map((login) =>
    dev(login, ['Go', 'SQLite'], { intents: ['Faire des reviews'] })
  )
  for (const id of seniors) {
    for (let i = 0; i < 3; i++) confirm(id, abdou, ['Go'])
  }
  // Fewer than 3 confirmed helps, both skills: the newcomer seat
  dev('zz-new', ['Go', 'SQLite'], { intents: ['Faire des reviews'] })
  const wave = pickWave(rank({
    authorId: abdou,
    category: 'code_review',
    skills: skillIdsOf(['Go', 'SQLite']),
    projectId: null,
  }))
  assertEquals(wave.length, 5)
  assertEquals(wave.at(-1)!.login, 'zz-new')
  assert(wave.at(-1)!.reasons.some((r) => r.kind === 'newcomer'))
})

Deno.test('matching: waves on creation, 2 h later, and after a withdrawal', async () => {
  restore()
  const abdou = dev('abdou', [])
  const helpers = Array.from(
    { length: 11 },
    (_, i) =>
      dev(`h${String(i).padStart(2, '0')}`, ['Go', 'SQLite'], {
        intents: ['Faire des reviews'],
      }),
  )
  dev('digest', ['Go', 'SQLite'], {
    intents: ['Faire des reviews'],
    mode: 'digest',
  })
  const session = await createSession(abdou, 'demo')
  const created = await call('/api/help/create', session, form)
  assertEquals(created.status, 200)
  const id = created.json.id
  const matches = () =>
    db.prepare(
      'SELECT userId, wave, notifiedAt IS NOT NULL AS notified FROM helpMatch WHERE helpRequestId = ? ORDER BY wave, helpMatchId',
    ).all(id) as { userId: number; wave: number; notified: number }[]
  const notifications = () =>
    (db.prepare(
      "SELECT count(*) AS n FROM notification WHERE type = 'help_match'",
    )
      .get() as { n: number }).n
  assertEquals(matches().length, 5)
  assertEquals(notifications(), matches().filter((m) => m.notified).length)

  // Nothing new before 2 h, the next 5 after
  runHelpTimers(now() + HOUR)
  assertEquals(matches().length, 5)
  runHelpTimers(now() + 2 * HOUR + 1)
  assertEquals(matches().length, 10)
  assertEquals(new Set(matches().map((m) => m.userId)).size, 10)
  assertEquals(matches().at(-1)!.wave, 2)

  // A helper leaves: the next wave goes out at once
  const helper = matches()[0].userId
  const helperSession = await createSession(helper, 'demo')
  await call('/api/help/accept', helperSession, { id })
  await call('/api/help/withdraw', helperSession, { id })
  const third = matches().filter((m) => m.wave === 3)
  assert(third.length >= 1)
  assert(!third.some((m) => m.userId === helper))

  // The requester sees every match; a matched developer only their own
  const forAbdou = (await call(`/api/help/detail?id=${id}`, session)).json
  assertEquals(forAbdou.matches.length, matches().length)
  const other = helpers.find((h) =>
    h !== helper && matches().some((m) => m.userId === h)
  )!
  const forOther = (await call(
    `/api/help/detail?id=${id}`,
    await createSession(other, 'demo'),
  )).json
  assertEquals(forOther.matches.length, 1)
  // « Pour moi » lists it, with the score
  const forMe = (await call(
    '/api/help/for-me?before=',
    await createSession(other, 'demo'),
  )).json.items
  assertEquals(forMe.map((h: { id: number }) => h.id), [id])
  assert(forMe[0].score > 0)
})

Deno.test('matching: at most 10 matching notifications a day', async () => {
  restore()
  const abdou = dev('abdou', [])
  const busy = dev('busy-helper', ['Go', 'SQLite'], {
    intents: ['Faire des reviews'],
  })
  const session = await createSession(abdou, 'demo')
  for (let i = 0; i < 11; i++) {
    await call('/api/help/create', session, { ...form, title: `Demande ${i}` })
  }
  const count = (db.prepare(
    'SELECT count(*) AS n FROM helpMatch WHERE userId = ? AND notifiedAt IS NOT NULL',
  ).get(busy) as { n: number }).n
  assertEquals(count, 10)
})

Deno.test('matching: the preview of the form writes nothing', async () => {
  restore()
  const abdou = dev('abdou', [])
  dev('moussa', ['Go', 'SQLite'], { intents: ['Faire des reviews'] })
  const session = await createSession(abdou, 'demo')
  const res = await call(
    '/api/help/preview?category=code_review&skills=Go,SQLite&project=',
    session,
  )
  assertEquals(res.status, 200)
  assertEquals(res.json.map((m: { login: string }) => m.login), ['moussa'])
  assertEquals(res.json[0].reasons[0].kind, 'skills')
  assertEquals(
    db.prepare('SELECT count(*) AS n FROM helpMatch').get(),
    { n: 0 },
  )
})

Deno.test('matching: only the skills, projects and communities kept (§7.4)', async () => {
  restore()
  const abdou = dev('abdou', ['Go'])
  const go = Community.insert({
    name: 'Go',
    slug: 'go',
    description: '',
    type: 'technology',
    source: 'demo',
    createdAt: now(),
  })
  CommunityMember.insert({
    communityId: go,
    userId: abdou,
    role: 'member',
    joinedAt: now(),
  })
  const projectId = Project.insert({
    ownerId: abdou,
    name: 'OpenPay Africa',
    slug: 'openpay-africa',
    description: '',
    visibility: 'public',
    status: 'beta',
    source: 'demo',
    createdAt: now(),
    updatedAt: now(),
  })
  // Each one keeps something, saved as the settings page saves it
  const filters = {
    all: {},
    sqlite: { onlySkills: ['SQLite'] },
    rust: { onlySkills: ['Rust'] },
    openpay: { onlyProjects: ['openpay-africa'] },
    other: { onlyProjects: ['senegal-maps'] },
    gophers: { onlyCommunities: ['go'] },
    reacters: { onlyCommunities: ['react'] },
    both: { onlySkills: ['Go'], onlyProjects: ['senegal-maps'] },
  }
  for (const [login, kept] of Object.entries(filters)) {
    const userId = dev(login, ['Go', 'SQLite', 'Rust'])
    const saved = await call(
      '/api/notification/preferences',
      await createSession(userId, 'demo'),
      { matchingMode: 'instant', minScore: 0, helpTypes: [], ...kept },
    )
    assertEquals(saved.status, 200)
  }
  const reached = (projectId: number | null) =>
    rank({
      authorId: abdou,
      category: 'debugging',
      skills: skillIdsOf(['Go', 'SQLite']),
      projectId,
    }).map((c) => c.login).sort()
  assertEquals(reached(projectId), ['all', 'gophers', 'openpay', 'sqlite'])
  // Without a project, a filter on projects keeps nothing
  assertEquals(reached(null), ['all', 'gophers', 'sqlite'])
})

Deno.test('matching: the filters are read back and checked', async () => {
  restore()
  const cookie = await createSession(dev('moussa', ['Go']), 'demo')
  const base = { matchingMode: 'digest', minScore: 60, helpTypes: [] }
  const saved = await call('/api/notification/preferences', cookie, {
    ...base,
    onlySkills: ['Go', 'Go'],
    onlyProjects: ['openpay-africa'],
    onlyCommunities: ['go'],
  })
  assertEquals(
    [
      saved.json.onlySkills,
      saved.json.onlyProjects,
      saved.json.onlyCommunities,
    ],
    [['Go'], ['openpay-africa'], ['go']],
  )
  for (
    const refused of [
      { onlySkills: ['Cobol++'] },
      { onlyProjects: ['Not A Slug'] },
      { onlyCommunities: Array.from({ length: 31 }, (_, i) => `c${i}`) },
    ]
  ) {
    assertEquals(
      (await call('/api/notification/preferences', cookie, {
        ...base,
        ...refused,
      })).status,
      400,
    )
  }
  // An older page that does not send them keeps none
  const older = await call('/api/notification/preferences', cookie, base)
  assertEquals(older.json.onlySkills, [])
})
