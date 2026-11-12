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

// The GitHub App itself (§5.1): its slug gives the installation page, its id
// and private key sign the JWT that asks GitHub where the app is installed.
// The key is the PEM GitHub downloads; `\n` written on one line is accepted.
export const GITHUB_APP_SLUG: string = PROD('GITHUB_APP_SLUG', '')
export const GITHUB_APP_ID: string = PROD('GITHUB_APP_ID', '')
export const GITHUB_APP_PRIVATE_KEY: string = PROD('GITHUB_APP_PRIVATE_KEY', '')

// Signs the webhooks GitHub sends: X-Hub-Signature-256 (§5.5). The same
// value goes in the Webhook secret field of the app.
export const GITHUB_WEBHOOK_SECRET: string = PROD('GITHUB_WEBHOOK_SECRET', '')

// The folder of the hourly copies of the database, a volume (§17.5): none
// in dev, where the seed rebuilds the database at will
export const BACKUP_DIR: string = PROD('BACKUP_DIR', '')
