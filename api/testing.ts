import server from '/api/server.ts'

// What the API tests share: requests to the real server, and the login of
// the test env, simulated without a GitHub App (§5.3)

const cookieOf = (res: Response, name: string) =>
  res.headers.get('Set-Cookie')?.match(new RegExp(`${name}=([^;]*)`))?.[1]

/** A request to the server, GET without a body, POST JSON with one */
export const request = (
  path: string,
  { body, cookie }: { body?: unknown; cookie?: string } = {},
) =>
  server.fetch(
    new Request(`http://localhost${path}`, {
      method: body === undefined ? 'GET' : 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(cookie && { Cookie: cookie }),
      },
      body: body === undefined ? undefined : JSON.stringify(body),
    }),
  )

/**
 * The whole login, as the browser does it: the start sets the nonce cookie
 * that the callback must send back with the state (§5.3)
 */
export const loginFlow = async () => {
  const start = await request('/api/auth/github')
  const nonce = cookieOf(start, 'oauth_nonce') ?? ''
  const { url } = await start.json()
  const params = new URL(url, 'http://localhost/').searchParams
  const state = params.get('state') ?? ''
  const res = await request('/api/auth/github/callback', {
    body: { code: params.get('code'), state },
    cookie: `oauth_nonce=${nonce}`,
  })
  return { res, state, nonce, session: cookieOf(res, 'session') ?? '' }
}

/** The value of the session cookie of a new login */
export const login = async () => (await loginFlow()).session
