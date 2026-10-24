import { respond } from '@01edu/api/response'
import { b64url } from '/api/lib/encoding.ts'
import {
  APP_ENV,
  BASE_URL,
  GITHUB_CLIENT_ID,
  GITHUB_CLIENT_SECRET,
} from '/api/lib/env.ts'
import { deleteCookie, setCookie } from 'jsr:@std/http@^1.0.20/cookie'
import { githubHeaders } from '/api/github.ts'
import { log } from '/api/lib/log.ts'
import { signText, verifyText } from '/api/lib/sign.ts'

// Login with the GitHub App (§5.3). The user token reads the profile, the
// primary email and the languages of the public repos to prefill the
// profile (§6.1), then it is dropped: no user token is ever stored (§5.2).

export type GithubUser = {
  id: number
  login: string
  avatar_url: string
  name: string | null
  email: string | null
  bio: string | null
  blog: string | null
  location: string | null
  /** Languages of the public repos, the most used first */
  languages: string[]
}

// Without a GitHub App in dev, the login is simulated: the demo account of
// the fixtures, never in production (§5.3). On a seeded database it is the
// seeded Abdou, by the githubId SEED_GITHUB_IDS gives him, not a second
// « abdou » (QA-26).
export const isSimulated = !GITHUB_CLIENT_ID && APP_ENV !== 'prod'
const seededAbdou = Number(
  Deno.env.get('SEED_GITHUB_IDS')?.match(/(?:^|,)\s*abdou\s*:\s*(\d+)/)?.[1] ??
    0,
)
const demoUser: GithubUser = {
  id: seededAbdou,
  login: 'abdou',
  avatar_url: 'https://avatars.githubusercontent.com/u/0',
  name: 'Abdou Sow',
  email: null,
  bio: 'Ingénieur backend à Dakar.',
  blog: null,
  location: 'Dakar, Senegal',
  languages: ['Go', 'TypeScript'],
}

// The state of the round trip to GitHub, against CSRF (§5.3). It is signed
// and dated rather than kept in memory: `deno task dev` restarts the server
// on each change, and a restart while the developer was on GitHub made the
// return fail. A nonce in a short cookie ties it to the browser that left,
// so a link with someone else's code cannot sign anyone in. A state can
// carry what the return needs: who installs, for which project.
export const STATE_TTL = 10 * 60
export const NONCE_COOKIE = 'oauth_nonce'
type Payload = Record<string, string | number>

// States already used, kept until they expire: a state works once
const used = new Map<string, number>()

export const newState = async (payload: Payload = {}) => {
  const nonce = crypto.getRandomValues(new Uint8Array(16)).toBase64(b64url)
  const expires = Math.floor(Date.now() / 1000) + STATE_TTL
  const state = await signText(JSON.stringify({ ...payload, nonce, expires }))
  return { state, nonce }
}

export type StateRefusal = 'invalid' | 'expired' | 'browser' | 'used'

/** The payload of a valid state for this browser, used once */
export const consumeState = async (
  state: string,
  nonce: string | undefined,
): Promise<{ payload: Payload } | { refused: StateRefusal }> => {
  const text = await verifyText(state)
  if (!text) return { refused: 'invalid' }
  const { nonce: expected, expires, ...payload } = JSON.parse(text)
  const now = Math.floor(Date.now() / 1000)
  if (expires < now) return { refused: 'expired' }
  if (!nonce || nonce !== expected) return { refused: 'browser' }
  for (const [old, until] of used) until < now && used.delete(old)
  if (used.has(state)) return { refused: 'used' }
  used.set(state, expires)
  return { payload }
}

/** The nonce cookie of the state, set when the browser leaves for GitHub */
export const withNonce = (response: Response, nonce: string) => {
  setCookie(response.headers, {
    name: NONCE_COOKIE,
    value: nonce,
    path: BASE_URL,
    secure: true,
    httpOnly: true,
    sameSite: 'Lax',
    maxAge: STATE_TTL,
  })
  return response
}

export const clearNonce = (response: Response) => {
  deleteCookie(response.headers, NONCE_COOKIE, {
    path: BASE_URL,
    secure: true,
    httpOnly: true,
  })
  return response
}

/** The state is refused: the page says why, the log too */
export const refuseState = (reason: StateRefusal) => {
  log.warn('github-state-refused', { reason })
  return new respond.UnauthorizedError({
    message: 'Invalid or expired OAuth state',
    reason,
  })
}

export const DEMO_CODE = 'demo'

/** The URL to send the browser to: GitHub, or the callback page in dev */
export const authorizationUrl = async () => {
  const { state, nonce } = await newState()
  if (isSimulated) {
    const params = new URLSearchParams({ code: DEMO_CODE, state })
    return { url: `connexion/github?${params}`, nonce }
  }
  // No redirect_uri: GitHub uses the Callback URL of the app (§5.1)
  const params = new URLSearchParams({ client_id: GITHUB_CLIENT_ID, state })
  return { url: `https://github.com/login/oauth/authorize?${params}`, nonce }
}

const refuse = (message: string) => new respond.UnauthorizedError({ message })

export type Read = (path: string) => Promise<Response>

/**
 * Exchanges a `code` for a temporary user token; the returned reader is the
 * only place it lives, and it is dropped with it (§5.2)
 */
export const exchangeCode = async (code: string): Promise<Read> => {
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
    // bad_verification_code: the code was used already, or is too old
    throw new respond.UnauthorizedError({
      message: 'Failed to exchange the GitHub code',
      reason: 'code',
      error: token.error,
    })
  }
  return (path: string) =>
    fetch(`https://api.github.com${path}`, {
      headers: githubHeaders(token.access_token),
    })
}

export const githubUserFromCode = async (
  { code, state }: { code: string; state: string },
  nonce: string | undefined,
): Promise<GithubUser> => {
  const checked = await consumeState(state, nonce)
  if ('refused' in checked) throw refuseState(checked.refused)
  if (isSimulated) {
    if (code !== DEMO_CODE) throw refuse('Unknown demo code')
    return demoUser
  }

  const read = await exchangeCode(code)
  const userRes = await read('/user')
  if (!userRes.ok) {
    log.error('github-user-error', { status: userRes.status })
    throw new respond.BadGatewayError({
      message: 'Failed to read the GitHub user',
      reason: 'user',
    })
  }
  const user = await userRes.json() as Omit<GithubUser, 'languages'>
  const [email, languages] = await Promise.all([
    user.email ?? primaryEmail(read),
    repoLanguages(read, user.login),
  ])
  return { ...user, email, languages }
}

// Needs the optional Email addresses permission: without it, only the
// public email is known, and the email is never required (§5.1)
const primaryEmail = async (read: Read) => {
  try {
    const res = await read('/user/emails')
    if (!res.ok) return null
    const emails = await res.json() as {
      email: string
      primary: boolean
      verified: boolean
    }[]
    return emails.find((e) => e.primary && e.verified)?.email ?? null
  } catch {
    return null
  }
}

// Public repos only, forks excluded: they hold someone else's code
const repoLanguages = async (read: Read, login: string) => {
  try {
    const res = await read(
      `/users/${encodeURIComponent(login)}/repos?per_page=100&sort=pushed`,
    )
    if (!res.ok) return []
    const repos = await res.json() as {
      fork: boolean
      language: string | null
    }[]
    const counts = new Map<string, number>()
    for (const { fork, language } of repos) {
      if (fork || !language) continue
      counts.set(language, (counts.get(language) ?? 0) + 1)
    }
    return [...counts].sort((a, b) => b[1] - a[1]).map(([language]) => language)
  } catch {
    return []
  }
}
