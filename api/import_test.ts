import { assert, assertEquals } from 'jsr:@std/assert@^1.0.13'
import { db, makeRestorePoint } from '@01edu/db'
import { now } from '@01edu/time'
import server from '/api/server.ts'
import { refreshRepository } from '/api/sync.ts'
import { login } from '/api/testing.ts'

// A fake GitHub: answers by path, with an ETag that a conditional read
// matches (304)
type Fake = { body: unknown; etag?: string; link?: string; raw?: boolean }
let routes: Record<string, Fake> = {}
const realFetch = globalThis.fetch
globalThis.fetch = (input: RequestInfo | URL, init?: RequestInit) => {
  const url = new URL(input instanceof Request ? input.url : String(input))
  if (url.hostname !== 'api.github.com') return realFetch(input, init)
  const fake = routes[url.pathname + url.search]
  if (!fake) return Promise.resolve(new Response('{}', { status: 404 }))
  const headers = new Headers(init?.headers)
  if (fake.etag && headers.get('If-None-Match') === fake.etag) {
    return Promise.resolve(new Response(null, { status: 304 }))
  }
  return Promise.resolve(
    new Response(
      fake.raw ? String(fake.body) : JSON.stringify(fake.body),
      {
        headers: {
          ...fake.etag && { etag: fake.etag },
          ...fake.link && { link: fake.link },
          'content-type': 'application/json',
        },
      },
    ),
  )
}

const repo = (name: string, extra: Record<string, unknown> = {}) => ({
  id: name.length * 1000,
  name,
  full_name: `abdou/${name}`,
  description: 'Paiements mobiles ouverts',
  fork: false,
  private: false,
  owner: { login: 'abdou', type: 'User' },
  default_branch: 'main',
  language: 'Go',
  stargazers_count: 214,
  forks_count: 12,
  open_issues_count: 3,
  topics: ['postgres', 'payments'],
  pushed_at: '2026-10-14T10:00:00Z',
  ...extra,
})

const issue = (number: number, state = 'open', pull = false) => ({
  id: 9000 + number,
  number,
  title: `Issue ${number}`,
  state,
  labels: [{ name: 'bug' }],
  user: { id: 7, login: 'fatou' },
  comments: 2,
  created_at: '2026-10-10T10:00:00Z',
  updated_at: '2026-10-12T10:00:00Z',
  ...pull && { pull_request: {} },
})

const pull = (number: number, merged = false) => ({
  id: 8000 + number,
  number,
  title: `PR ${number}`,
  state: merged ? 'closed' : 'open',
  user: { id: 1, login: 'abdou' },
  head: { ref: `feat/${number}` },
  merged_at: merged ? '2026-10-14T12:00:00Z' : null,
  created_at: '2026-10-13T10:00:00Z',
  updated_at: '2026-10-14T10:00:00Z',
})

const github = () => {
  const path = '/repos/abdou/openpay-africa'
  routes = {
    '/users/abdou/repos?type=owner&sort=pushed&per_page=100': {
      body: [repo('openpay-africa'), repo('a-fork', { fork: true })],
    },
    [path]: { body: repo('openpay-africa') },
    '/repos/abdou/someone-else': {
      body: repo('someone-else', { owner: { login: 'moussa', type: 'User' } }),
    },
    '/repos/abdou/an-org-repo': {
      body: repo('an-org-repo', {
        owner: { login: 'abdou', type: 'Organization' },
      }),
    },
    [`${path}/languages`]: {
      body: { Go: 7000, TypeScript: 2000, Dockerfile: 1000 },
    },
    [`${path}/readme`]: { body: '# OpenPay Africa', raw: true },
    [`${path}/releases/latest`]: {
      body: { tag_name: 'v0.3', published_at: '2026-10-05T10:00:00Z' },
    },
    [`${path}/contributors?anon=1&per_page=1`]: {
      body: [{}],
      link: `<https://api.github.com${path}/contributors?page=5>; rel="last"`,
    },
    [`${path}/pulls?state=open&per_page=1`]: {
      body: [{}],
      link: `<https://api.github.com${path}/pulls?page=2>; rel="last"`,
    },
    [`${path}/issues?state=open&per_page=100`]: {
      body: [issue(44), issue(81, 'open', true)],
    },
    [`${path}/pulls?state=open&per_page=100`]: { body: [pull(81), pull(80)] },
  }
}

const restore = makeRestorePoint()

const call = async (
  path: string,
  { body, cookie }: { body?: unknown; cookie?: string } = {},
) => {
  const res = await server.fetch(
    new Request(`http://localhost${path}`, {
      method: body === undefined ? 'GET' : 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(cookie && { Cookie: `session=${cookie}` }),
      },
      body: body === undefined ? undefined : JSON.stringify(body),
    }),
  )
  return { status: res.status, json: await res.json().catch(() => null) }
}

const project = {
  name: 'openpay-africa',
  title: 'OpenPay Africa',
  description: '',
  vision: 'Payer en dix lignes',
  skills: ['Go', 'PostgreSQL'],
  needs: ['Tests', 'Review de code Go'],
}

Deno.test('import: the public repos of the developer, forks excluded', async () => {
  restore()
  github()
  const cookie = await login()
  const { json } = await call('/api/github/repositories', { cookie })
  assertEquals(json.map((r: { name: string }) => r.name), ['openpay-africa'])
  assertEquals(json[0].existing, '')
})

Deno.test('import: the preview reads the repo from GitHub', async () => {
  restore()
  github()
  const cookie = await login()
  const { json } = await call(
    '/api/github/repository?name=openpay-africa',
    { cookie },
  )
  assertEquals(json.readme, '# OpenPay Africa')
  assertEquals(json.languages, [
    { name: 'Go', share: 70 },
    { name: 'TypeScript', share: 20 },
    { name: 'Dockerfile', share: 10 },
  ])
  assertEquals([json.contributors, json.openPullRequests], [5, 2])
  assertEquals(json.openIssues, 1)
  assertEquals(json.release, 'v0.3')
  // Languages and topics through the aliases: Dockerfile, postgres
  assertEquals(json.skills, ['Go', 'TypeScript', 'Docker', 'PostgreSQL'])
})

Deno.test('import: the project, its repo, issues and PRs', async () => {
  restore()
  github()
  const cookie = await login()
  const { status, json } = await call('/api/project/import', {
    body: project,
    cookie,
  })
  assertEquals(status, 200)
  assertEquals(json.slug, 'openpay-africa')

  const [mine] = (await call('/api/projects', { cookie })).json
  assertEquals(mine.name, 'OpenPay Africa')
  assertEquals(mine.description, 'Paiements mobiles ouverts')
  assertEquals(mine.skills, ['Go', 'PostgreSQL'])
  assertEquals(mine.members, [{ login: 'abdou', role: 'owner' }])
  assertEquals(mine.needs, ['Tests', 'Review de code Go'])
  assertEquals(mine.repository.syncMode, 'poll')
  // The PR listed among the issues is not an issue
  assertEquals(
    mine.repository.issues.items.map((i: { number: number }) => i.number),
    [
      44,
    ],
  )
  assertEquals(mine.repository.openIssues, 1)
  assertEquals(mine.repository.pullRequests.items[0].branch, 'feat/81')
  assertEquals(
    db.prepare(`SELECT count(*) n FROM entry WHERE type = 5`).get(),
    { n: 1 },
  )
  const list = (await call('/api/github/repositories', { cookie })).json
  assertEquals(list[0].existing, 'openpay-africa')
})

Deno.test('import: a project of the same name without a repo is connected (§6.3)', async () => {
  restore()
  github()
  const cookie = await login()
  const me = (await call('/api/user/me', { cookie })).json
  // OpenPay Africa exists, created from scratch (or seeded), without its repo
  const at = Date.now() / 1000
  const { projectId } = db.prepare(
    `INSERT INTO project (ownerId, name, slug, description, visibility,
      status, source, createdAt, updatedAt)
     VALUES (?, 'OpenPay Africa', 'openpay-africa', 'Déjà là', 'public',
      'beta', 'demo', ?, ?) RETURNING projectId`,
  ).get(me.userId, at, at) as { projectId: number }
  db.prepare(
    "INSERT INTO projectMember (projectId, userId, role, joinedAt) VALUES (?, ?, 'owner', ?)",
  ).run(projectId, me.userId, at)
  const { json } = await call('/api/project/import', { body: project, cookie })
  // The same project, now with its repo: no « openpay-africa-2 »
  assertEquals(json.slug, 'openpay-africa')
  const mine = (await call('/api/projects', { cookie })).json
  assertEquals(mine.length, 1)
  assertEquals(mine[0].description, 'Déjà là')
  assertEquals(mine[0].members, [{ login: 'abdou', role: 'owner' }])
  assertEquals(mine[0].repository.pullRequests.items[0].branch, 'feat/81')
})

Deno.test('import: refused for a repo of someone else, an org, or twice', async () => {
  restore()
  github()
  const cookie = await login()
  const tryImport = (name: string) =>
    call('/api/project/import', { body: { ...project, name }, cookie })
  assertEquals((await tryImport('someone-else')).status, 403)
  assertEquals((await tryImport('an-org-repo')).status, 403)
  assertEquals((await tryImport('openpay-africa')).status, 200)
  assertEquals((await tryImport('openpay-africa')).status, 409)
  assertEquals(
    (await call('/api/project/import', {
      body: { ...project, skills: ['Cobol++'] },
      cookie,
    })).status,
    400,
  )
})

Deno.test('import: the texts of the project keep their size (§16)', async () => {
  restore()
  github()
  const cookie = await login()
  const projects = () => db.prepare('SELECT count(*) n FROM project').get()
  const before = projects()
  const refused = async (body: Record<string, unknown>) => {
    const { status, json } = await call('/api/project/import', {
      body: { ...project, ...body },
      cookie,
    })
    assertEquals(status, 400)
    return json.message
  }
  assertEquals(
    await refused({ title: 'x'.repeat(81) }),
    'projectName too long',
  )
  assertEquals(
    await refused({ description: 'x'.repeat(301) }),
    'projectDescription too long',
  )
  assertEquals(
    await refused({ vision: 'x'.repeat(1001) }),
    'projectVision too long',
  )
  assertEquals(
    await refused({ needs: ['x'.repeat(81)] }),
    'projectNeed too long',
  )
  assertEquals(
    await refused({ needs: Array.from({ length: 11 }, (_, i) => `n${i}`) }),
    'Too many needs',
  )
  // Refused before anything is written
  assertEquals(projects(), before)
})

Deno.test('import: ten imports an hour at most (§16)', async () => {
  restore()
  github()
  const cookie = await login()
  const { userId } = (await call('/api/user/me', { cookie })).json
  // Ten projects imported in the last hour
  for (let i = 0; i < 10; i++) {
    db.exec(`INSERT INTO project (ownerId, name, slug, description,
      visibility, status, source, createdAt, updatedAt)
      VALUES (${userId}, 'P${i}', 'p-${i}', '', 'public', 'idea', 'github',
      ${now()}, ${now()})`)
  }
  const { status, json } = await call('/api/project/import', {
    body: project,
    cookie,
  })
  assertEquals([status, json.message], [429, 'Too many imports'])
})

Deno.test('import: the refresh applies changes, then a 304 changes nothing', async () => {
  restore()
  github()
  const cookie = await login()
  await call('/api/project/import', { body: project, cookie })
  const { repositoryId } = db.prepare('SELECT repositoryId FROM repository')
    .get() as { repositoryId: number }

  const path = '/repos/abdou/openpay-africa'
  routes[path] = {
    body: repo('openpay-africa', { stargazers_count: 230 }),
    etag: '"r1"',
  }
  routes[`${path}/issues?state=all&sort=updated&per_page=100`] = {
    body: [issue(44, 'closed')],
    etag: '"i1"',
  }
  routes[`${path}/pulls?state=all&sort=updated&per_page=100`] = {
    body: [pull(81, true)],
    etag: '"p1"',
  }
  assertEquals(await refreshRepository(repositoryId), true)
  const [mine] = (await call('/api/projects', { cookie })).json
  assertEquals(mine.repository.stars, 230)
  // Closed: counted out, and out of the open issues listed
  assertEquals(mine.repository.openIssues, 0)
  assertEquals(mine.repository.issues.items, [])
  assertEquals(
    mine.repository.pullRequests.items.find((p: { number: number }) =>
      p.number === 81
    ).state,
    'merged',
  )

  const updates = () =>
    (db.prepare('SELECT count(*) n FROM entry WHERE type = 6').get() as {
      n: number
    }).n
  const before = updates()
  assertEquals(await refreshRepository(repositoryId), false)
  assertEquals(updates(), before)
  assert(before >= 1)
})
