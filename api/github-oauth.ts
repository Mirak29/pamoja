import { respond } from '@01edu/api/response'
import { b64url } from '/api/lib/encoding.ts'
import {
  APP_ENV,
  GITHUB_CLIENT_ID,
  GITHUB_CLIENT_SECRET,
} from '/api/lib/env.ts'
import { log } from '/api/lib/log.ts'

// Login with the GitHub App (§5.3). The user token only reads GET /user, then
// it is dropped: no user token is ever stored (§5.2).

export type GithubUser = {
  id: number
  login: string
  avatar_url: string
  name: string | null
  email: string | null
  bio: string | null
  blog: string | null
}

// Without a GitHub App in dev, the login is simulated: the demo account of
// the fixtures, never in production (§5.3)
export const isSimulated = !GITHUB_CLIENT_ID && APP_ENV !== 'prod'
const DEMO_CODE = 'demo'
const demoUser: GithubUser = {
  id: 0,
  login: 'abdou',
  avatar_url: 'https://avatars.githubusercontent.com/u/0',
  name: 'Abdou Sow',
  email: null,
  bio: 'Ingénieur backend à Dakar.',
  blog: null,
}

// One-time states against CSRF, like the StateManager of Tournament
const STATE_TTL = 10 * 60 * 1000
const states = new Map<string, number>()

const newState = () => {
  const now = Date.now()
  for (const [state, expires] of states) {
    if (expires < now) states.delete(state)
  }
  const state = crypto.getRandomValues(new Uint8Array(16)).toBase64(b64url)
  states.set(state, now + STATE_TTL)
  return state
}

const consumeState = (state: string) => {
  const expires = states.get(state)
  states.delete(state)
  return expires !== undefined && expires > Date.now()
}

/** The URL to send the browser to: GitHub, or the callback page in dev */
export const authorizationUrl = () => {
  const state = newState()
  if (isSimulated) {
    return `connexion/github?${new URLSearchParams({ code: DEMO_CODE, state })}`
  }
  // No redirect_uri: GitHub uses the Callback URL of the app (§5.1)
  const params = new URLSearchParams({ client_id: GITHUB_CLIENT_ID, state })
  return `https://github.com/login/oauth/authorize?${params}`
}

const refuse = (message: string) => new respond.UnauthorizedError({ message })

export const githubUserFromCode = async (
  { code, state }: { code: string; state: string },
): Promise<GithubUser> => {
  if (!consumeState(state)) throw refuse('Invalid or expired OAuth state')
  if (isSimulated) {
    if (code !== DEMO_CODE) throw refuse('Unknown demo code')
    return demoUser
  }

  // GitHub answers 200 with an `error` field when the code is refused
  const tokenRes = await fetch('https://github.com/login/oauth/access_token', {
    method: 'POST',
    headers: {
      Accept: 'application/json',
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: new URLSearchParams({
      client_id: GITHUB_CLIENT_ID,
      client_secret: GITHUB_CLIENT_SECRET,
      code,
    }),
  })
  const token = await tokenRes.json().catch(() => ({})) as {
    access_token?: string
    error?: string
    error_description?: string
  }
  if (!tokenRes.ok || !token.access_token) {
    log.warn('github-token-error', {
      status: tokenRes.status,
      error: token.error,
      message: token.error_description,
    })
    throw refuse('Failed to exchange the GitHub code')
  }

  const userRes = await fetch('https://api.github.com/user', {
    headers: {
      Accept: 'application/vnd.github+json',
      Authorization: `Bearer ${token.access_token}`,
      'User-Agent': 'Pamoja',
      'X-GitHub-Api-Version': '2022-11-28',
    },
  })
  if (!userRes.ok) {
    log.error('github-user-error', { status: userRes.status })
    throw refuse('Failed to read the GitHub user')
  }
  return await userRes.json() as GithubUser
}
