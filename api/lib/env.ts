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

// Reads public repos for the import and the 15 min refresh (§5.2). Without
// it in dev, GitHub allows 60 requests an hour.
export const GITHUB_BOT_TOKEN: string = PROD('GITHUB_BOT_TOKEN', '')
