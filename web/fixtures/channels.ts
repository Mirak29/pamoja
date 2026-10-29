import { signal } from '@preact/signals'
import { daysAgo, hoursAgo } from '/web/fixtures/clock.ts'
import { demoImage } from '/web/fixtures/media.ts'
import { hearOf, type Login, me } from '/web/fixtures/people.ts'
import type { ProjectSlug } from '/web/fixtures/projects.ts'
import { pullRequests } from '/web/fixtures/pull-requests.ts'
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
  | 'issue'
  | 'push'

/** An alert of #suivi read from the server: facts, written by the page */
export type TrackingAlert = ApiOutput['GET/api/project/tracking'][number]

export type Message = {
  id: string
  /** A developer, or the platform for alerts */
  author: Login | 'platform'
  kind?: AlertKind
  text: string
  /** One uploaded image (§17.3); a video goes in the text by its link */
  media?: Media[]
  pullRequest?: number
  /** An alert of #suivi read from the server (PAM-411) */
  alert?: TrackingAlert
  at: number
  reactions?: { like?: Login[] }
  /** The +1 the server counted, for a message it keeps (PAM-406) */
  likes?: { count: number; mine: boolean }
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
      {
        id: 'm9',
        author: 'fatou',
        text:
          'La réconciliation passe en local, voici la sortie des tests. Je pousse sur la PR #84.',
        media: [demoImage('ledger-tests')],
        at: hoursAgo(5),
        reactions: { like: ['abdou'] },
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

/** What reaches a developer from a channel: all, @mentions, their PRs, none */
export type Notify = 'all' | 'mentions' | 'mine' | 'none'

// Per « project:channel »: read up to this time (ms) and the setting. Saved
// on the server for a project it knows (PAM-412), in the session otherwise
const lastRead = signal<Record<string, number>>({})
const settingOf = signal<Record<string, Notify>>({})

/** The setting of a channel; #suivi speaks only of my PRs by default */
export const notifyOf = (project: ProjectSlug, channel: Channel): Notify =>
  settingOf.value[`${project}:${channel}`] ??
    (channel === 'tracking' ? 'mine' : 'all')

// A message that counts for the setting: an @mention of me, an alert on
// one of my PRs
const reaches = (message: Message, notify: Notify) =>
  notify === 'all' ||
  (notify === 'mentions' &&
    new RegExp(`(^|[^\\w.@])@${me.login}(?![\\w-])`, 'i').test(message.text)) ||
  (notify === 'mine' && !!message.pullRequest &&
    pullRequests.some((pr) =>
      pr.number === message.pullRequest && pr.author === me.login
    ))

// Messages of others written after the last read of the channel
const newOf = (project: ProjectSlug, channel: Channel) =>
  (channels[project]?.[channel] ?? []).filter((m) =>
    m.author !== me.login &&
    m.at > (lastRead.value[`${project}:${channel}`] ?? 0)
  )

/** Messages of others not read yet in a channel, as its setting counts them */
export const unreadIn = (project: ProjectSlug, channel: Channel) => {
  const notify = notifyOf(project, channel)
  return notify === 'none'
    ? 0
    : newOf(project, channel).filter((m) => reaches(m, notify)).length
}

/**
 * The channel on screen is read up to now; true when something new was
 * read, for the server to know it too
 */
export const markChannelRead = (project: ProjectSlug, channel: Channel) => {
  const key = `${project}:${channel}`
  const fresh = newOf(project, channel).length > 0 || !lastRead.peek()[key]
  if (fresh) lastRead.value = { ...lastRead.peek(), [key]: Date.now() }
  return fresh
}

/** Chooses what reaches the developer from a channel */
export const setNotifyOf = (
  project: ProjectSlug,
  channel: Channel,
  notify: Notify,
) => {
  settingOf.value = { ...settingOf.peek(), [`${project}:${channel}`]: notify }
}

/** What the server kept of the channels of a project */
export const adoptChannelStates = (
  project: ProjectSlug,
  states: ApiOutput['GET/api/project/channels'],
) => {
  const read = { ...lastRead.peek() }
  const settings = { ...settingOf.peek() }
  for (const state of states) {
    const key = `${project}:${state.channel}`
    // A read in this page, not yet known by the server, is kept
    read[key] = Math.max(read[key] ?? 0, state.lastReadAt * 1000)
    settings[key] = state.notify as Notify
  }
  lastRead.value = read
  settingOf.value = settings
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

type Saved = ApiOutput['GET/api/project/messages'][number]

/** The +1 of a message, counted by the server or by the page */
export const likesOf = (message: Message) =>
  message.likes ?? {
    count: message.reactions?.like?.length ?? 0,
    mine: !!message.reactions?.like?.includes(me.login),
  }

/**
 * A message saved on the server, in the channel it was written in, or in
 * the thread it answers; one already shown takes its new +1
 */
export const adoptChannelMessage = (project: ProjectSlug, saved: Saved) => {
  const store = channels[project] ??= emptyChannels()
  const list = store[saved.channel as Channel]
  if (!list) return
  const id = `s${saved.id}`
  hearOf(saved.author, saved.authorName, '')
  if (saved.parent) {
    const parent = list.find((message) => message.id === `s${saved.parent}`)
    if (!parent || parent.replies?.some((reply) => reply.id === id)) return
    parent.replies = [...parent.replies ?? [], {
      id,
      author: saved.author as Login,
      text: saved.body,
      at: saved.createdAt * 1000,
      demo: false,
    }]
  } else {
    const likes = { count: saved.likes, mine: saved.liked }
    const known = list.find((message) => message.id === id)
    if (known) known.likes = likes
    else {
      list.push({
        id,
        author: saved.author as Login,
        text: saved.body,
        media: saved.media,
        at: saved.createdAt * 1000,
        likes,
        demo: false,
      })
      list.sort((a, b) => a.at - b.at)
    }
  }
  channelsChanged.value++
}

// The kind of each entry #suivi shows, for its icon (§6.8)
const alertKinds: Record<string, AlertKind> = {
  PR_OPENED: 'pr',
  PR_REVIEWED: 'review',
  PR_MERGED: 'merge',
  PR_CLOSED: 'pr',
  PR_REVIEW_STALE: 'waiting',
  ISSUE_UPDATED: 'issue',
  RELEASE_PUBLISHED: 'release',
  CI_FAILED: 'ci-failed',
  CI_FIXED: 'ci-fixed',
  COMMITS_PUSHED: 'push',
}

/**
 * The alerts of #suivi read from the server, with their threads, in the
 * channel; those of the page (an import) stay
 */
export const adoptTracking = (
  project: ProjectSlug,
  alerts: ApiOutput['GET/api/project/tracking'],
) => {
  const store = channels[project] ??= emptyChannels()
  const local = store.tracking.filter((message) => !message.alert)
  const read = alerts.map((alert): Message => {
    for (const reply of alert.replies) {
      hearOf(reply.author, reply.authorName, '')
    }
    return {
      id: `e${alert.id}`,
      author: 'platform',
      kind: alertKinds[alert.kind] ?? 'sync',
      text: '',
      pullRequest: alert.pullRequest || undefined,
      alert,
      at: alert.at * 1000,
      replies: alert.replies.map((reply) => ({
        id: `s${reply.id}`,
        author: reply.author as Login,
        text: reply.body,
        at: reply.createdAt * 1000,
        demo: false,
      })),
      demo: false,
    }
  })
  store.tracking = [...local, ...read].sort((a, b) => a.at - b.at)
  channelsChanged.value++
}
