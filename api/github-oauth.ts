import { respond } from '@01edu/api/response'
import { b64url } from '/api/lib/encoding.ts'
import {
  APP_ENV,
  GITHUB_CLIENT_ID,
  GITHUB_CLIENT_SECRET,
} from '/api/lib/env.ts'
import { log } from '/api/lib/log.ts'

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
  location: 'Dakar, Senegal',
  languages: ['Go', 'TypeScript'],
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

  const read = (path: string) =>
    fetch(`https://api.github.com${path}`, {
      headers: {
        Accept: 'application/vnd.github+json',
        Authorization: `Bearer ${token.access_token}`,
        'User-Agent': 'Pamoja',
        'X-GitHub-Api-Version': '2022-11-28',
      },
    })

  const userRes = await read('/user')
  if (!userRes.ok) {
    log.error('github-user-error', { status: userRes.status })
    throw refuse('Failed to read the GitHub user')
  }
  const user = await userRes.json() as Omit<GithubUser, 'languages'>
  const [email, languages] = await Promise.all([
    user.email ?? primaryEmail(read),
    repoLanguages(read, user.login),
  ])
  return { ...user, email, languages }
}

type Read = (path: string) => Promise<Response>

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
