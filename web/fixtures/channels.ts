import { signal } from '@preact/signals'
import { daysAgo, hoursAgo } from '/web/fixtures/clock.ts'
import { hearOf, type Login, me } from '/web/fixtures/people.ts'
import type { ProjectSlug } from '/web/fixtures/projects.ts'
import type { ApiOutput } from '/web/lib/api.ts'
import type { Media } from '/web/lib/messages.ts'

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
  /** One uploaded image (§17.3); a video goes in the text by its link */
  media?: Media[]
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
  /** Hidden by a moderator: its text is replaced */
  moderated?: boolean
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
      {
        id: 'm8',
        author: 'platform',
        kind: 'ci-failed',
        text:
          'CI en échec sur la PR #79 « Retry policy for Wave callbacks » : le job test (go 1.22) échoue sur fix/wave-retry.',
        pullRequest: 79,
        at: hoursAgo(1),
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

// Messages read per channel during the session, until ChannelState
// (PAM-412): a count of the messages of others already seen
const read = signal<Record<string, number>>({})

const fromOthers = (project: ProjectSlug, channel: Channel) =>
  (channels[project]?.[channel] ?? []).filter((m) => m.author !== me.login)
    .length

/** Messages of others not read yet in a channel */
export const unreadIn = (project: ProjectSlug, channel: Channel) =>
  Math.max(
    0,
    fromOthers(project, channel) - (read.value[`${project}:${channel}`] ?? 0),
  )

/** The channel on screen is read up to its last message */
export const markChannelRead = (project: ProjectSlug, channel: Channel) => {
  const key = `${project}:${channel}`
  const count = fromOthers(project, channel)
  if (read.peek()[key] !== count) read.value = { ...read.peek(), [key]: count }
}

const emptyChannels = (): Record<Channel, Message[]> => ({
  general: [],
  tracking: [],
  help: [],
  announcements: [],
})

/** An alert the platform writes in #suivi, like the webhook handler will */
export const postAlert = (
  project: ProjectSlug,
  kind: AlertKind,
  text: string,
) => {
  const store = channels[project] ??= emptyChannels()
  store.tracking.push({
    id: `alert-${project}-${store.tracking.length + 1}`,
    author: 'platform',
    kind,
    text,
    at: Date.now(),
    demo: true,
  })
}

// Messages saved on the server (PAM-428): read when the channels open
export const channelsChanged = signal(0)

/** A message saved on the server, in the channel it was written in */
export const adoptChannelMessage = (
  project: ProjectSlug,
  saved: ApiOutput['GET/api/project/messages'][number],
) => {
  const store = channels[project] ??= emptyChannels()
  const list = store[saved.channel as Channel]
  const id = `s${saved.id}`
  if (!list || list.some((message) => message.id === id)) return
  hearOf(saved.author, saved.authorName, '')
  list.push({
    id,
    author: saved.author as Login,
    text: saved.body,
    media: saved.media,
    at: saved.createdAt * 1000,
    demo: false,
  })
  list.sort((a, b) => a.at - b.at)
  channelsChanged.value++
}
