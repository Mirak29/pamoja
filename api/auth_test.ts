import { assert, assertEquals } from 'jsr:@std/assert@^1.0.13'
import { db, makeRestorePoint } from '@01edu/db'
import server from '/api/server.ts'
import { loginFlow } from '/api/testing.ts'

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

const sessionOf = (res: Response) =>
  res.headers.get('Set-Cookie')?.match(/session=([^;]*)/)?.[1] ?? ''

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
