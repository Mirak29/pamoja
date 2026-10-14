import { APP_ENV, BASE_URL, PROD } from '@01edu/api/env'

export { APP_ENV, BASE_URL }

// Required in production: the server refuses to start without them. Without
// a GitHub App in dev, the login is simulated (§5.3).
export const GITHUB_CLIENT_ID: string = PROD('GITHUB_CLIENT_ID', '')
export const GITHUB_CLIENT_SECRET: string = PROD('GITHUB_CLIENT_SECRET', '')

// Signs the session cookies (§5.3)
export const SESSION_SECRET: string = PROD(
  'SESSION_SECRET',
  'pamoja-dev-session-secret',
)
