import { assert, assertEquals } from 'jsr:@std/assert@^1.0.13'
import { db, makeRestorePoint } from '@01edu/db'
import { appJwt, pkcs1ToPkcs8 } from '/api/github-app.ts'
import type { Read } from '/api/github-oauth.ts'
import { verifyInstallation } from '/api/installation.ts'
import server from '/api/server.ts'
import { login } from '/api/testing.ts'

const restore = makeRestorePoint()

// A fake GitHub for the import that precedes the installation
const repo = {
  id: 4242,
  name: 'openpay-africa',
  full_name: 'abdou/openpay-africa',
  description: 'Paiements mobiles ouverts',
  fork: false,
  private: false,
  owner: { login: 'abdou', type: 'User' },
  default_branch: 'main',
  language: 'Go',
  stargazers_count: 3,
  forks_count: 0,
  open_issues_count: 0,
  topics: [],
  pushed_at: '2026-10-14T10:00:00Z',
}
const realFetch = globalThis.fetch
globalThis.fetch = (input: RequestInfo | URL, init?: RequestInit) => {
  const url = new URL(input instanceof Request ? input.url : String(input))
  if (url.hostname !== 'api.github.com') return realFetch(input, init)
  const path = url.pathname
  const body = path === '/repos/abdou/openpay-africa'
    ? repo
    : path.endsWith('/languages')
    ? { Go: 100 }
    : path.endsWith('/readme') || path.endsWith('/releases/latest')
    ? null
    : []
  return Promise.resolve(
    body === null ? new Response('{}', { status: 404 }) : Response.json(body),
  )
}

const call = async (
  path: string,
  { body, cookie, nonce }: { body?: unknown; cookie?: string; nonce?: string } =
    {},
) => {
  const res = await server.fetch(
    new Request(`http://localhost${path}`, {
      method: body === undefined ? 'GET' : 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(cookie &&
          {
            Cookie: `session=${cookie}${nonce ? `; oauth_nonce=${nonce}` : ''}`,
          }),
      },
      body: body === undefined ? undefined : JSON.stringify(body),
    }),
  )
  return { status: res.status, json: await res.json().catch(() => null), res }
}

const importProject = (cookie: string) =>
  call('/api/project/import', {
    body: {
      name: 'openpay-africa',
      title: '',
      description: '',
      vision: '',
      skills: ['Go'],
      needs: [],
    },
    cookie,
  })

/*
 * The three checks
 */

const fake = (answers: Record<string, unknown>): Read => (path) =>
  Promise.resolve(
    path in answers
      ? Response.json(answers[path])
      : new Response('{}', { status: 404 }),
  )

const covered = (names: string[], total = names.length) => ({
  total_count: total,
  repositories: names.map((full_name) => ({ full_name })),
})

const target = { githubId: 7, installationId: 99, fullName: 'abdou/openpay' }
const page = (n: number) =>
  `/user/installations/99/repositories?per_page=100&page=${n}`
const results = (checks: { ok: boolean }[]) => checks.map((check) => check.ok)

Deno.test('installation: all three checks pass for the admin', async () => {
  const checks = await verifyInstallation(
    fake({
      '/user': { id: 7 },
      [page(1)]: covered(['abdou/OpenPay']),
      '/repos/abdou/openpay': { permissions: { admin: true } },
    }),
    target,
  )
  assertEquals(results(checks), [true, true, true])
})

Deno.test('installation: another account fails the identity check', async () => {
  const checks = await verifyInstallation(
    fake({
      '/user': { id: 8 },
      [page(1)]: covered(['abdou/openpay']),
      '/repos/abdou/openpay': { permissions: { admin: true } },
    }),
    target,
  )
  assertEquals(results(checks), [false, true, true])
})

Deno.test('installation: coverage is read across pages', async () => {
  const checks = await verifyInstallation(
    fake({
      '/user': { id: 7 },
      [page(1)]: covered(['abdou/other'], 150),
      [page(2)]: covered(['abdou/openpay'], 150),
      '/repos/abdou/openpay': { permissions: { maintain: true } },
    }),
    target,
  )
  assertEquals(results(checks), [true, true, true])
})

Deno.test('installation: read access is not enough', async () => {
  const checks = await verifyInstallation(
    fake({
      '/user': { id: 7 },
      [page(1)]: covered(['abdou/other']),
      '/repos/abdou/openpay': { permissions: { admin: false, push: true } },
    }),
    target,
  )
  assertEquals(results(checks), [true, false, false])
})

/*
 * The flow, simulated without a GitHub App
 */

Deno.test('installation: from the start to the live sync', async () => {
  restore()
  const cookie = await login()
  const { json: imported } = await importProject(cookie)
  const { json: start, res: started } = await call(
    `/api/github/installation/start?project=${imported.slug}`,
    { cookie },
  )
  const nonce = started.headers.get('Set-Cookie')
    ?.match(/oauth_nonce=([^;]*)/)?.[1]
  const params = new URL(start.url, 'http://localhost/').searchParams
  assertEquals(params.get('setup_action'), 'install')
  const { status, json } = await call('/api/github/installation/confirm', {
    body: {
      code: params.get('code'),
      installationId: params.get('installation_id'),
      state: params.get('state'),
    },
    cookie,
    nonce,
  })
  assertEquals(status, 200)
  assertEquals(json.live, true)
  assertEquals(json.slug, imported.slug)
  assertEquals(
    db.prepare(`SELECT syncMode, installationId IS NOT NULL linked
      FROM repository`).get(),
    { syncMode: 'live', linked: 1 },
  )
  assertEquals(
    db.prepare('SELECT accountLogin FROM githubInstallation').get(),
    { accountLogin: 'abdou' },
  )
  const [project] = (await call('/api/projects', { cookie })).json
  assertEquals(project.repository.syncMode, 'live')

  // A state works once
  const replay = await call('/api/github/installation/confirm', {
    body: {
      code: params.get('code'),
      installationId: params.get('installation_id'),
      state: params.get('state'),
    },
    cookie,
    nonce,
  })
  assertEquals(replay.status, 401)
})

Deno.test('installation: only the owner of a project with a repo starts it', async () => {
  restore()
  const cookie = await login()
  assertEquals(
    (await call('/api/github/installation/start?project=nowhere', { cookie }))
      .status,
    404,
  )
  await importProject(cookie)
  db.exec(`UPDATE user SET githubUsername = 'moussa', githubId = 5`)
  const ownerId = (db.prepare('SELECT userId FROM user').get() as {
    userId: number
  }).userId
  db.exec(`INSERT INTO user (githubId, githubUsername, avatarUrl, source,
    createdAt, updatedAt) VALUES (0, 'abdou', '', 'demo', 0, 0)`)
  db.exec(`UPDATE project SET ownerId = ${ownerId}`)
  // The simulated account logs in again as a new developer, not the owner
  const other = await login()
  assertEquals(
    (await call('/api/github/installation/start?project=openpay-africa', {
      cookie: other,
    })).status,
    403,
  )
})

/*
 * The JWT of the app
 */

Deno.test('installation: the app JWT is signed with a PKCS#1 key', async () => {
  const { privateKey, publicKey } = await crypto.subtle.generateKey(
    {
      name: 'RSASSA-PKCS1-v1_5',
      modulusLength: 2048,
      publicExponent: new Uint8Array([1, 0, 1]),
      hash: 'SHA-256',
    },
    true,
    ['sign', 'verify'],
  )
  const pkcs8 = new Uint8Array(
    await crypto.subtle.exportKey('pkcs8', privateKey),
  )
  // PKCS#8 = SEQUENCE { version, algorithm, OCTET STRING { PKCS#1 } }
  const pkcs1 = pkcs8.slice(4 + 3 + 15 + 4)
  assertEquals(pkcs1ToPkcs8(pkcs1), pkcs8)

  const pem = `-----BEGIN RSA PRIVATE KEY-----\n${
    pkcs1.toBase64().match(/.{1,64}/g)!.join('\n')
  }\n-----END RSA PRIVATE KEY-----`
  const jwt = await appJwt('123', pem.replaceAll('\n', '\\n'))
  const [header, payload, signature] = jwt.split('.')
  const decode = (part: string) =>
    JSON.parse(
      new TextDecoder().decode(
        Uint8Array.fromBase64(part, { alphabet: 'base64url' }),
      ),
    )
  assertEquals(decode(header), { alg: 'RS256', typ: 'JWT' })
  const claims = decode(payload)
  assertEquals(claims.iss, '123')
  assert(claims.exp - claims.iat <= 600)
  assert(
    await crypto.subtle.verify(
      'RSASSA-PKCS1-v1_5',
      publicKey,
      Uint8Array.fromBase64(signature, { alphabet: 'base64url' }),
      new TextEncoder().encode(`${header}.${payload}`),
    ),
  )
})
