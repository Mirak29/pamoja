import { assert, assertEquals } from 'jsr:@std/assert@^1.0.13'
import { db, makeRestorePoint } from '@01edu/db'
import { now } from '@01edu/time'
import { languageOfFile, skillsOfFiles } from '/api/pull-skills.ts'
import { readPullRequestSkills } from '/api/pull-skills.ts'
import {
  HelpRequest,
  Project,
  ProjectMember,
  PullRequest,
  Repository,
  User,
} from '/api/schema.ts'
import { skillNamesOf } from '/api/skills.ts'
import server from '/api/server.ts'
import { login, request } from '/api/testing.ts'

// A fake GitHub for the files of a PR (§7.1)
let files: Record<string, unknown> = {}
const realFetch = globalThis.fetch
globalThis.fetch = (input: RequestInfo | URL, init?: RequestInit) => {
  const url = new URL(input instanceof Request ? input.url : String(input))
  if (url.hostname !== 'api.github.com') return realFetch(input, init)
  const body = files[url.pathname]
  return Promise.resolve(
    body
      ? new Response(JSON.stringify(body), {
        headers: { 'content-type': 'application/json' },
      })
      : new Response('{}', { status: 404 }),
  )
}

const restore = makeRestorePoint()
const at = now()

const call = async (path: string, cookie: string, body?: unknown) => {
  const res = await request(path, { body, cookie: `session=${cookie}` })
  return { status: res.status, json: await res.json().catch(() => null) }
}

/** The signed-in developer, a member of a project with a repo and two PRs */
const setup = async () => {
  restore()
  files = {}
  const session = await login()
  const me = (await call('/api/user/me', session)).json
  const projectId = Project.insert({
    ownerId: me.userId,
    name: 'OpenPay Africa',
    slug: 'openpay-africa',
    description: 'Paiements mobiles',
    visibility: 'public',
    status: 'active',
    source: 'github',
    createdAt: at,
    updatedAt: at,
  })
  ProjectMember.insert({
    projectId,
    userId: me.userId,
    role: 'owner',
    joinedAt: at,
  })
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
  for (const [number, state] of [[81, 'open'], [80, 'merged']] as const) {
    PullRequest.insert({
      repositoryId,
      githubId: 8000 + number,
      number,
      title: `PR ${number}`,
      state,
      authorGithubId: 1,
      additions: 10,
      deletions: 2,
      source: 'github',
      createdAt: at,
      updatedAt: at,
      authorLogin: 'abdou',
      branch: `feat/${number}`,
      headSha: `sha-${number}`,
    })
  }
  return { session, me, projectId }
}

const form = {
  category: 'code_review',
  title: '  Review de la PR #81 : verrou SQLite  ',
  description: 'Gestion des transactions',
  skills: ['Go', 'SQLite'],
  expectedLevel: 'intermediate_plus',
  estimatedMinutes: 20,
  project: 'openpay-africa',
  pullRequest: 81,
  videoUrl: '',
}

Deno.test('help: a request from a PR is published, open for 7 days', async () => {
  const { session } = await setup()
  const created = await call('/api/help/create', session, form)
  assertEquals(created.status, 200)
  assertEquals(created.json.title, 'Review de la PR #81 : verrou SQLite')
  assertEquals(created.json.status, 'open')
  assertEquals(created.json.project, 'openpay-africa')
  assertEquals(created.json.pullRequest, 81)
  assertEquals(created.json.branch, 'feat/81')
  assertEquals(created.json.skills, ['Go', 'SQLite'])
  assertEquals(created.json.demo, false)
  const row = db.prepare(
    'SELECT expiresAt - createdAt AS openFor, source FROM helpRequest',
  ).get() as { openFor: number; source: string }
  assertEquals(row, { openFor: 7 * 86_400, source: 'platform' })
  // HELP_REQUEST_CREATED, for the search reindexing
  assertEquals(
    db.prepare('SELECT count(*) AS n FROM entry WHERE type = 22').get(),
    { n: 1 },
  )
  const list = await call('/api/help?tab=&before=', session)
  assertEquals(list.json.items.map((h: { id: number }) => h.id), [
    created.json.id,
  ])
})

Deno.test('help: ten requests a day at most (§16)', async () => {
  const { session } = await setup()
  const alone = { ...form, project: '', pullRequest: 0 }
  for (let i = 0; i < 10; i++) {
    const res = await call('/api/help/create', session, {
      ...alone,
      title: `Demande ${i}`,
    })
    assertEquals(res.status, 200)
  }
  const res = await request('/api/help/create', {
    body: alone,
    cookie: `session=${session}`,
  })
  assertEquals(res.status, 429)
  // When to try again: once the first of the day is a day old
  assert(Number(res.headers.get('Retry-After')) > 86_000)
})

Deno.test('help: one request at a time on a PR', async () => {
  const { session } = await setup()
  assertEquals((await call('/api/help/create', session, form)).status, 200)
  assertEquals((await call('/api/help/create', session, form)).status, 409)
  // Once it is cancelled, a new one may start
  db.prepare("UPDATE helpRequest SET status = 'cancelled'").run()
  assertEquals((await call('/api/help/create', session, form)).status, 200)
})

Deno.test('help: a request without a project or a PR', async () => {
  const { session } = await setup()
  const created = await call('/api/help/create', session, {
    ...form,
    category: 'mentorship',
    project: '',
    pullRequest: 0,
    videoUrl: 'https://www.loom.com/share/abc',
  })
  assertEquals(created.status, 200)
  assertEquals(created.json.project, '')
  assertEquals(created.json.videoUrl, 'https://www.loom.com/share/abc')
})

Deno.test('help: the server checks the form again', async () => {
  const { session } = await setup()
  const refused = async (change: Record<string, unknown>, status = 400) =>
    assertEquals(
      (await call('/api/help/create', session, { ...form, ...change })).status,
      status,
    )
  await refused({ title: '   ' })
  await refused({ title: 'x'.repeat(141) })
  await refused({ skills: [] })
  await refused({ skills: ['Cobol'] })
  await refused({ category: 'homework' })
  await refused({ expectedLevel: 'guru' })
  await refused({ estimatedMinutes: 45 })
  await refused({ videoUrl: 'javascript:alert(1)' })
  await refused({ project: '', pullRequest: 81 })
  // A PR merged, a PR or a project that does not exist
  await refused({ pullRequest: 80 })
  await refused({ pullRequest: 99 }, 404)
  await refused({ project: 'nowhere' }, 404)
  assertEquals(
    db.prepare('SELECT count(*) AS n FROM helpRequest').get(),
    { n: 0 },
  )
})

Deno.test('help: only a member asks for help on a project', async () => {
  const { session } = await setup()
  const ownerId = User.insert({
    githubId: 4242,
    githubUsername: 'fatou',
    avatarUrl: '',
    source: 'demo',
    createdAt: at,
    updatedAt: at,
  })
  Project.insert({
    ownerId,
    name: 'Dakar Transit',
    slug: 'dakar-transit',
    description: '',
    visibility: 'public',
    status: 'active',
    source: 'demo',
    createdAt: at,
    updatedAt: at,
  })
  const res = await call('/api/help/create', session, {
    ...form,
    project: 'dakar-transit',
    pullRequest: 0,
  })
  assertEquals(res.status, 403)
  // And the requests of another developer are not listed
  assertEquals((await call('/api/help?tab=&before=', session)).json, {
    items: [],
    next: '',
  })
})

Deno.test('help: a request needs a session', async () => {
  restore()
  const res = await request('/api/help/create', { body: form })
  assertEquals(res.status, 401)
  await res.body?.cancel()
})

Deno.test('pull skills: the languages of the changed files', () => {
  assertEquals(languageOfFile('api/server.go'), 'go')
  assertEquals(languageOfFile('web/App.TSX'), 'typescript')
  assertEquals(languageOfFile('deploy/Dockerfile'), 'docker')
  assertEquals(languageOfFile('.github/workflows/ci.yml'), 'ci')
  assertEquals(languageOfFile('README.md'), undefined)
  assertEquals(
    skillNamesOf(skillsOfFiles([
      { filename: 'db/schema.sql', changes: 4 },
      { filename: 'api/tx.go', changes: 120 },
      { filename: 'api/tx_test.go', changes: 30 },
      { filename: 'README.md', changes: 300 },
    ])),
    ['Go', 'SQL'],
  )
})

Deno.test('pull skills: read once per head commit, shown on the PR', async () => {
  const { session } = await setup()
  files['/repos/abdou/openpay-africa/pulls/81/files'] = [
    { filename: 'api/tx.go', changes: 50 },
    { filename: 'migrations/1.sql', changes: 5 },
  ]
  await readPullRequestSkills()
  const pulls = async () =>
    (await call('/api/projects', session)).json[0].repository.pullRequests
  // The merged PR is not read
  assertEquals((await pulls()).map((p: { skills: string[] }) => p.skills), [
    ['Go', 'SQL'],
    [],
  ])
  // Same head: nothing read again
  files = {}
  await readPullRequestSkills()
  assertEquals((await pulls())[0].skills, ['Go', 'SQL'])
  // A push moves the head: read again
  db.prepare("UPDATE pullRequest SET headSha = 'sha-new' WHERE number = 81")
    .run()
  files['/repos/abdou/openpay-africa/pulls/81/files'] = [
    { filename: 'web/app.ts', changes: 5 },
  ]
  await readPullRequestSkills()
  assertEquals((await pulls())[0].skills, ['TypeScript'])
})

// A PNG header is all the server reads: the type, then the size
const png = () => {
  const bytes = new Uint8Array(33)
  bytes.set([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0, 0, 0, 13])
  bytes.set([0x49, 0x48, 0x44, 0x52], 12)
  new DataView(bytes.buffer).setUint32(16, 800)
  new DataView(bytes.buffer).setUint32(20, 600)
  return bytes
}

const upload = async (session: string) => {
  const body = new FormData()
  body.append('file', new File([png()], 'erreur.png'))
  const res = await server.fetch(
    new Request('http://localhost/api/media/upload', {
      method: 'POST',
      body,
      headers: { Cookie: `session=${session}` },
    }),
  )
  return (await res.json()).id as number
}

Deno.test('help: screenshots shown with the request, 4 at most (§17.3)', async () => {
  const { session } = await setup()
  const shots = [await upload(session), await upload(session)]
  const created = await call('/api/help/create', session, {
    ...form,
    pullRequest: 0,
    project: '',
    media: shots,
  })
  assertEquals(created.status, 200)
  assertEquals(created.json.media.map((m: { id: number }) => m.id), shots)
  const listed = (await call('/api/help?tab=&before=', session)).json.items
  assertEquals(listed[0].media.length, 2)
  // Five, or an upload already attached: refused, nothing published
  const five = []
  for (let i = 0; i < 5; i++) five.push(await upload(session))
  const refused = await call('/api/help/create', session, {
    ...form,
    project: '',
    pullRequest: 0,
    media: five,
  })
  assertEquals(refused.status, 400)
  const again = await call('/api/help/create', session, {
    ...form,
    project: '',
    pullRequest: 0,
    title: 'Encore',
    media: [shots[0]],
  })
  assertEquals(again.status, 400)
  assertEquals(
    (await call('/api/help?tab=&before=', session)).json.items.length,
    1,
  )
})

Deno.test('help: the lists by tab, by batches of 20 (§12.7)', async () => {
  const { session, me, projectId } = await setup()
  const other = User.insert({
    githubId: 4242,
    githubUsername: 'kofi',
    avatarUrl: '',
    source: 'demo',
    createdAt: at,
    updatedAt: at,
  })
  const add = (authorId: number, title: string, extra = {}) =>
    HelpRequest.insert({
      authorId,
      category: 'code_review',
      title,
      description: '',
      skills: [],
      status: 'open',
      expiresAt: at + 86_400,
      source: 'demo',
      // All at the same second: the id decides between them
      createdAt: at,
      updatedAt: at,
      ...extra,
    })
  for (let i = 0; i < 25; i++) add(me.userId, `Mine ${i}`)
  add(other, 'Accepted', { acceptedBy: me.userId, status: 'accepted' })
  add(other, 'Of my project', { projectId })
  add(other, 'Elsewhere')
  const all = async (tab: string) => {
    const titles: string[] = []
    let before = ''
    let batches = 0
    do {
      const { json } = await call(
        `/api/help?tab=${tab}&before=${encodeURIComponent(before)}`,
        session,
      )
      titles.push(...json.items.map((h: { title: string }) => h.title))
      before = json.next
      batches++
    } while (before)
    return { titles, batches }
  }
  const mine = await all('mine')
  assertEquals([mine.titles.length, mine.batches], [25, 2])
  assertEquals(new Set(mine.titles).size, 25)
  assertEquals((await all('accepted')).titles, ['Accepted'])
  assertEquals((await all('projects')).titles, ['Of my project'])
  // All of them together, never the others' elsewhere
  const together = await all('')
  assertEquals(together.titles.length, 27)
  assert(!together.titles.includes('Elsewhere'))
  assertEquals((await call('/api/help?tab=other&before=', session)).status, 400)
})
