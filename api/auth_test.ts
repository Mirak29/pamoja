import { assert, assertEquals } from 'jsr:@std/assert@^1.0.13'
import { db, makeRestorePoint } from '@01edu/db'
import server from '/api/server.ts'
import { loginFlow } from '/api/testing.ts'
import { createSession } from '/api/session.ts'
import { sessionKey } from '/api/lib/sign.ts'
import { DEMO_LOGIN, findOrCreateGithubUser } from '/api/user.ts'
import { seed } from '/api/seed.ts'

// The test env has no GitHub App: the login is the simulated one (§5.3)
const restore = makeRestorePoint()

const call = (
  path: string,
  { body, cookie }: { body?: unknown; cookie?: string } = {},
) =>
  server.fetch(
    new Request(`http://localhost${path}`, {
      method: body === undefined ? 'GET' : 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(cookie && { Cookie: `session=${cookie}` }),
      },
      body: body === undefined ? undefined : JSON.stringify(body),
    }),
  )

// The whole login of the test env, nonce cookie included (§5.3)
const login = loginFlow

const me = (cookie?: string) => call('/api/user/me', { cookie })

Deno.test('auth: without a session, me is refused', async () => {
  restore()
  assertEquals((await me()).status, 401)
  assertEquals((await me('forged:cookie')).status, 401)
})

Deno.test('auth: the first login creates the developer', async () => {
  restore()
  const { res, session } = await login()
  assertEquals(res.status, 200)
  const user = await res.json()
  assertEquals(user.login, 'abdou')
  assertEquals(user.created, true)
  const cookie = res.headers.get('Set-Cookie') ?? ''
  assert(/HttpOnly/i.test(cookie) && /Secure/i.test(cookie))
  assert(/SameSite=Lax/i.test(cookie))

  const current = await me(session)
  assertEquals(current.status, 200)
  assertEquals((await current.json()).userId, user.userId)
  assertEquals(
    db.prepare('SELECT source FROM user WHERE userId = ?').get(user.userId),
    { source: 'demo' },
  )
})

Deno.test('auth: the next login finds the same developer', async () => {
  restore()
  const first = await (await login()).res.json()
  const second = await (await login()).res.json()
  assertEquals(second.userId, first.userId)
  assertEquals(second.created, false)
})

Deno.test('auth: a state works only once', async () => {
  restore()
  const { state, nonce } = await login()
  const replay = await server.fetch(
    new Request('http://localhost/api/auth/github/callback', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Cookie: `oauth_nonce=${nonce}`,
      },
      body: JSON.stringify({ code: 'demo', state }),
    }),
  )
  assertEquals(replay.status, 401)
  assertEquals((await replay.json()).reason, 'used')
})

Deno.test('auth: a state is tied to the browser that started', async () => {
  restore()
  const { state } = await login()
  const elsewhere = await call('/api/auth/github/callback', {
    body: { code: 'demo', state },
  })
  assertEquals(elsewhere.status, 401)
  assertEquals((await elsewhere.json()).reason, 'browser')
})

Deno.test('auth: a tampered cookie is refused', async () => {
  restore()
  const { session } = await login()
  const [data, signature] = session.split(':')
  const [entryId] = new Float64Array(
    Uint8Array.fromBase64(data, { alphabet: 'base64url' }).slice().buffer,
  )
  const otherId = new Uint8Array(new Float64Array([entryId + 1]).buffer)
  assertEquals(
    (await me(`${otherId.toBase64({ alphabet: 'base64url' })}:${signature}`))
      .status,
    401,
  )
  assertEquals((await me(`${data}:${signature.slice(1)}`)).status, 401)
})

// The ids start again at 1 on a new database (prod:reset), SESSION_SECRET
// stays: the cookie of a login before it named the login of someone else
Deno.test('auth: a cookie of an erased database opens no session', async () => {
  restore()
  const { session: old } = await login()
  restore()
  const { userId } = findOrCreateGithubUser({
    id: 4242,
    login: 'awa',
    avatar_url: '',
    name: 'Awa',
    email: null,
    bio: null,
    blog: null,
    location: null,
    languages: [],
  }, 'github')
  const fresh = await createSession(userId, 'github')
  // The same entry id, given to Awa's login on the new database
  const idOf = (cookie: string) =>
    new Float64Array(
      Uint8Array.fromBase64(cookie.split(':')[0], { alphabet: 'base64url' })
        .slice(0, 8).buffer,
    )[0]
  assertEquals(idOf(fresh), idOf(old))
  assertEquals((await me(old)).status, 401)
  const current = await me(fresh)
  assertEquals(current.status, 200)
  assertEquals((await current.json()).userId, userId)
})

Deno.test('auth: a cookie without its secret is refused', async () => {
  restore()
  const { session } = await login()
  const data = Uint8Array.fromBase64(session.split(':')[0], {
    alphabet: 'base64url',
  }).slice(0, 8)
  const signature = new Uint8Array(
    await crypto.subtle.sign('HMAC', sessionKey, data),
  )
  const b64 = { alphabet: 'base64url' } as const
  assertEquals(
    (await me(`${data.toBase64(b64)}:${signature.toBase64(b64)}`)).status,
    401,
  )
})

Deno.test('auth: logout invalidates even a copied cookie', async () => {
  restore()
  const { session } = await login()
  const out = await call('/api/auth/logout', { body: {}, cookie: session })
  assertEquals(out.status, 204)
  assert(/session=;/.test(out.headers.get('Set-Cookie') ?? ''))
  assertEquals((await me(session)).status, 401)
})

Deno.test('auth: a session ends after 30 days', async () => {
  restore()
  const { session } = await login()
  db.exec(
    `UPDATE entryInternal SET createdAt = createdAt - 31 * 86400
      WHERE type = 1`,
  )
  assertEquals((await me(session)).status, 401)
})

// The demo button (PAM-127): the jury tries Pamoja without GitHub
Deno.test('auth: the demo button opens the seeded demo account', async () => {
  restore()
  seed()
  const res = await call('/api/auth/demo', { body: {} })
  assertEquals(res.status, 200)
  const user = await res.json()
  assertEquals(user.login, DEMO_LOGIN)
  assertEquals(user.demoAccount, true)
  const session = res.headers.get('Set-Cookie')?.match(/session=([^;]*)/)?.[1]
  const current = await me(session)
  assertEquals(current.status, 200)
  assertEquals((await current.json()).demoAccount, true)
})

Deno.test('auth: a real account is never the demo account', async () => {
  restore()
  // The seeded demo account linked to a real GitHub account: refused
  seed(new Map([[DEMO_LOGIN, 4242]]))
  const res = await call('/api/auth/demo', { body: {} })
  assertEquals(res.status, 404)
  assertEquals((await res.json()).reason, 'missing')
  // A developer signed in with GitHub is not flagged as the demo
  const { session } = await login()
  assertEquals((await (await me(session)).json()).demoAccount, false)
})

Deno.test('auth: the demo account survives a real account taking its login', async () => {
  restore()
  seed()
  const before = await (await call('/api/auth/demo', { body: {} })).json()
  // A GitHub account named like the demo signs in: the seeded one is renamed
  const real = findOrCreateGithubUser({
    id: 4242,
    login: DEMO_LOGIN,
    avatar_url: '',
    name: null,
    email: null,
    bio: null,
    blog: null,
    location: null,
    languages: [],
  }, 'github')
  const res = await call('/api/auth/demo', { body: {} })
  assertEquals(res.status, 200)
  const user = await res.json()
  assertEquals(user.userId, before.userId)
  assert(user.userId !== real.userId)
  assertEquals(user.demoAccount, true)
  assert(user.login.startsWith(`${DEMO_LOGIN}~`))
})

Deno.test('auth: without a seed, there is no demo account', async () => {
  restore()
  assertEquals((await call('/api/auth/demo', { body: {} })).status, 404)
})
