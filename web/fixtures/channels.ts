import { daysAgo, hoursAgo } from '/web/fixtures/clock.ts'
import type { Login } from '/web/fixtures/people.ts'
import type { ProjectSlug } from '/web/fixtures/projects.ts'

/** The four imposed channels of a project (cahier des charges §6.8) */
export type Channel = 'general' | 'tracking' | 'help' | 'announcements'

/** Kind of an alert written by the platform in #suivi or #aide */
export type AlertKind =
  | 'pr'
  | 'review'
  | 'ci-failed'
  | 'ci-fixed'
  | 'merge'
  | 'release'
  | 'help'
  | 'waiting'
  | 'sync'
  | 'import'

export type Message = {
  id: string
  /** A developer, or the platform for alerts */
  author: Login | 'platform'
  kind?: AlertKind
  text: string
  pullRequest?: number
  at: number
  reactions?: { like?: Login[] }
  replies?: {
    id: string
    author: Login
    text: string
    at: number
    demo: boolean
  }[]
  demo: boolean
}

export const channels: Partial<
  Record<ProjectSlug, Record<Channel, Message[]>>
> = {
  'openpay-africa': {
    general: [
      {
        id: 'm1',
        author: 'fatou',
        text: 'Je m’occupe du job de réconciliation du ledger cette semaine.',
        at: hoursAgo(7),
        demo: true,
      },
      {
        id: 'm2',
        author: 'abdou',
        text: 'Parfait. La PR #81 est prête, je cherche un reviewer Go.',
        at: hoursAgo(6),
        reactions: { like: ['fatou'] },
        demo: true,
      },
    ],
    tracking: [
      {
        id: 'm3',
        author: 'platform',
        kind: 'pr',
        text: 'PR #81 ouverte par Abdou : « Payment transaction handling ».',
        pullRequest: 81,
        at: hoursAgo(28),
        replies: [
          {
            id: 'r1',
            author: 'fatou',
            text:
              'Je regarde la partie rollback ce soir si personne ne s’en charge.',
            at: hoursAgo(20),
            demo: true,
          },
        ],
        demo: true,
      },
      {
        id: 'm4',
        author: 'platform',
        kind: 'pr',
        text: 'PR #84 ouverte par Fatou : « Ledger reconciliation job ».',
        pullRequest: 84,
        at: hoursAgo(6),
        demo: true,
      },
      {
        id: 'm7',
        author: 'platform',
        kind: 'waiting',
        text:
          'La PR #79 « Retry policy for Wave callbacks » attend une review depuis 3 jours.',
        pullRequest: 79,
        at: hoursAgo(2),
        demo: true,
      },
    ],
    help: [
      {
        id: 'm5',
        author: 'platform',
        kind: 'help',
        text:
          'Nouvelle demande d’aide : « Verrou SQLite sous charge concurrente (issue #44) ».',
        at: hoursAgo(30),
        demo: true,
      },
    ],
    announcements: [
      {
        id: 'm6',
        author: 'abdou',
        text:
          'Release v0.3 publiée : paiements Wave et Orange Money en sandbox.',
        at: daysAgo(9),
        demo: true,
      },
    ],
  },
}

/** An alert the platform writes in #suivi, like the webhook handler will */
export const postAlert = (
  project: ProjectSlug,
  kind: AlertKind,
  text: string,
) => {
  const store = channels[project] ??= {
    general: [],
    tracking: [],
    help: [],
    announcements: [],
  }
  store.tracking.push({
    id: `alert-${project}-${store.tracking.length + 1}`,
    author: 'platform',
    kind,
    text,
    at: Date.now(),
    demo: false,
  })
}
