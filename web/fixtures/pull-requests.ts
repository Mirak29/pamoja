import { daysAgo, hoursAgo } from '/web/fixtures/clock.ts'
import type { Login } from '/web/fixtures/people.ts'
import type { ProjectSlug } from '/web/fixtures/projects.ts'

export type PullRequest = {
  number: number
  project: ProjectSlug
  title: string
  author: Login
  branch: string
  state: 'open' | 'merged' | 'closed'
  review: 'waiting' | 'received' | 'approved'
  /** Reviewers detected on GitHub */
  reviewers?: Login[]
  ci: 'ok' | 'failed'
  at: number
  demo: boolean
}

export const pullRequests: PullRequest[] = [
  {
    number: 81,
    project: 'openpay-africa',
    title: 'Payment transaction handling',
    author: 'abdou',
    branch: 'feat/payment-tx',
    state: 'open',
    review: 'waiting',
    ci: 'ok',
    at: hoursAgo(28),
    demo: true,
  },
  {
    number: 80,
    project: 'openpay-africa',
    title: 'Idempotency keys for webhooks',
    author: 'fatou',
    branch: 'feat/idempotency',
    state: 'open',
    review: 'waiting',
    ci: 'ok',
    at: hoursAgo(50),
    demo: true,
  },
  {
    number: 79,
    project: 'openpay-africa',
    title: 'Retry policy for Wave callbacks',
    author: 'fatou',
    branch: 'fix/wave-retry',
    state: 'open',
    review: 'waiting',
    ci: 'ok',
    at: hoursAgo(75),
    demo: true,
  },
  {
    number: 84,
    project: 'openpay-africa',
    title: 'Ledger reconciliation job',
    author: 'fatou',
    branch: 'feat/ledger-recon',
    state: 'open',
    review: 'approved',
    ci: 'ok',
    at: hoursAgo(6),
    demo: true,
  },
  {
    number: 78,
    project: 'openpay-africa',
    title: 'Docs: deno task dev setup',
    author: 'fatou',
    branch: 'docs/dev-setup',
    state: 'open',
    review: 'approved',
    ci: 'ok',
    at: daysAgo(4),
    demo: true,
  },
  {
    number: 31,
    project: 'senegal-maps',
    title: 'Tile cache for offline mode',
    author: 'awa',
    branch: 'feat/tile-cache',
    state: 'open',
    review: 'waiting',
    ci: 'ok',
    at: hoursAgo(30),
    demo: true,
  },
]
