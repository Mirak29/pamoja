import {
  incoming,
  markAllRead,
  markRead,
  type Notification,
  type NotificationCategory,
  notifications,
  notificationsChanged,
} from '/web/fixtures/notifications.ts'
import { durationLabel } from '/web/fixtures/help.ts'
import { badgeName, levelNames } from '/web/fixtures/reputation.ts'
import { me, personOf } from '/web/fixtures/people.ts'
import { api, type ApiOutput } from '/web/lib/api.ts'
import { t, translate } from '/web/lib/language.ts'
import { onEvent, onReconnect, whenShown } from '/web/lib/realtime.ts'
import { currentUser } from '/web/lib/session.ts'
import { effect, signal } from '@preact/signals'

// The notifications of the server (§7.4) join those of the demo in the
// center; a new one pops up as a toast. The server says what happened, the
// page writes the sentence in its language.

type Batch = ApiOutput['GET/api/notifications']
type Item = Batch['items'][number]

// The badges of §8.2, by their key on the server
const firstName = (login: string) => personOf(login).name.split(' ')[0]

// Ids of the server, kept apart from the demo ones
const idOf = (item: Item) => `s${item.id}`

const sentence = (n: Item): Pick<Notification, 'title' | 'body' | 'kind'> & {
  match?: Notification['match']
} => {
  const who = firstName(n.actor)
  const about = t`« ${n.title} »`
  switch (n.type) {
    case 'help_match':
      return {
        kind: 'help',
        title: n.project
          ? t`${n.project} a besoin de toi`
          : t`${who} a besoin de toi`,
        body: about,
        match: {
          skills: n.skills,
          score: n.score,
          duration: n.minutes ? durationLabel(n.minutes) : '',
        },
      }
    case 'help_accepted':
      return {
        kind: 'help',
        title: t`${who} a accepté ta demande`,
        body: about,
      }
    case 'help_withdrawn':
      return {
        kind: 'help',
        title: t`${who} s’est désisté`,
        body: t`« ${n.title} » repasse en Ouverte.`,
      }
    case 'help_released':
      return {
        kind: 'help',
        title: t`${who} t’a libéré de sa demande`,
        body: about,
      }
    case 'help_cancelled':
      return { kind: 'help', title: t`${who} a annulé sa demande`, body: about }
    case 'help_delivered':
      return {
        kind: 'help',
        title: t`${who} a livré son aide`,
        body: translate(
          'Confirme si elle t’a aidé : la preuve rejoint son profil.',
        ),
      }
    case 'help_reviewed':
      return {
        kind: 'help',
        title: t`${who} a fait sa review sur GitHub`,
        body: translate(
          'Confirme si elle t’a aidé : la preuve rejoint son profil.',
        ),
      }
    case 'help_confirmed':
      return {
        kind: 'help',
        title: t`${who} a confirmé ton aide`,
        body: translate(
          n.eligible
            ? 'La preuve rejoint ton profil.'
            : 'Elle ne compte pas dans ta réputation : au plus 2 confirmations par demandeur sur 30 jours.',
        ),
      }
    case 'badge_unlocked':
      return {
        kind: 'promising',
        title: t`Badge débloqué : ${translate(badgeName(n.badge))}`,
        body: t`Niveau ${translate(levelNames[n.level - 1] ?? '')}.`,
      }
    case 'help_declined':
      return {
        kind: 'help',
        title: t`${who} a fermé sa demande`,
        body: t`« ${n.title} » : ton aide n’a pas été jugée utile.`,
      }
    case 'help_message':
      return { kind: 'help', title: t`${who} t’a écrit`, body: n.excerpt }
    case 'help_expired':
      return {
        kind: 'help',
        title: translate('Ta demande a expiré'),
        body: t`« ${n.title} » : 7 jours sans acceptation. Tu peux la rouvrir.`,
      }
    case 'help_helper_reminder':
      return {
        kind: 'help',
        title: translate('Une demande attend ton aide'),
        body: t`« ${n.title} » : tu l’as acceptée il y a plus de 24 h.`,
      }
    case 'help_confirm_reminder':
      return {
        kind: 'help',
        title: t`${who} attend ta réponse`,
        body: t`L’aide sur « ${n.title} » t’a-t-elle aidé ?`,
      }
    default:
      return { kind: 'help', title: n.title, body: '' }
  }
}

const toPage = (n: Item): Notification => ({
  id: idOf(n),
  to: me.login,
  category: n.category as Notification['category'],
  href: n.helpRequestId
    ? `help/${n.helpRequestId}`
    : n.type === 'badge_unlocked'
    ? `@${me.login}`
    : 'notifications',
  at: n.createdAt * 1000,
  read: n.readAt > 0,
  demo: false,
  ...sentence(n),
})

// Seen since the page opened: only a new one pops up
const seen = new Set<string>()
let loaded = false

/*
 * The inbox comes by batches of 20 (§12.7): the newest at once, the older
 * ones on demand, each tab (a category, or all of them) by its own batches:
 * a tab never reads the others' to find its own. The counters come from the
 * server, which counts every unread one, not only those of the batches read.
 */

/**
 * Cursor of the older batch of each tab (`''` for all of them): empty when
 * everything is read, missing before the first batch of the tab
 */
export const olderNotifications = signal<Record<string, string>>({})
// Tabs whose older batches were read: a new read of the newest keeps them
const olderRead = new Set<string>()
// Unread ones of the server, by category
const serverUnread = signal<Record<string, number>>({})

const keep = (batch: Batch) => {
  serverUnread.value = Object.fromEntries(
    batch.unread.map(({ category, count }) => [category, count]),
  )
  const fresh = batch.items.map(toPage)
  for (const notification of fresh) {
    const i = notifications.findIndex((n) => n.id === notification.id)
    i < 0 ? notifications.push(notification) : notifications[i] = notification
  }
  return fresh
}

/** The newest batch of the server: the first read is quiet, later ones pop up */
export const loadNotifications = () =>
  api['GET/api/notifications'].fetch({ before: '', category: '' }).then(
    (batch) => {
      const fresh = keep(batch)
      olderRead.has('') || setCursor('', batch.next)
      const arrived = fresh.filter((n) => !n.read && !seen.has(n.id))
      fresh.forEach((n) => seen.add(n.id))
      if (loaded && arrived.length) incoming.value = arrived[0]
      loaded = true
      notificationsChanged.value++
    },
    () => {},
  )

const setCursor = (category: string, next: string) => {
  olderNotifications.value = { ...olderNotifications.peek(), [category]: next }
}

const reading = new Map<string, Promise<void>>()

/**
 * The next batch of a tab, its first one if none was read; nothing when one
 * is already on its way
 */
export const loadNotificationBatch = (
  category: NotificationCategory | '' = '',
) => {
  const current = reading.get(category)
  if (current) return current
  const before = olderNotifications.peek()[category]
  if (before === '') return Promise.resolve()
  const read = api['GET/api/notifications']
    .fetch({ before: before ?? '', category })
    .then((batch) => {
      keep(batch).forEach((n) => seen.add(n.id))
      before && olderRead.add(category)
      setCursor(category, batch.next)
      notificationsChanged.value++
    })
    .catch(() => {})
    .finally(() => reading.delete(category))
  reading.set(category, read)
  return read
}

/**
 * Unread ones for the developer, of a category or all: those of the demo,
 * counted here, and those of the server, counted by the server
 */
export const unreadCount = (category?: string) => {
  notificationsChanged.value
  const demo =
    notifications.filter((n) =>
      n.to === me.login && !n.read && !n.id.startsWith('s') &&
      (!category || n.category === category)
    ).length
  const server = serverUnread.value
  return demo +
    (category
      ? server[category] ?? 0
      : Object.values(server).reduce((sum, count) => sum + count, 0))
}

/** Opened or read: the server keeps it */
export const readOne = (notification: Notification) => {
  const wasUnread = !notification.read
  markRead(notification)
  if (notification.id.startsWith('s')) {
    if (wasUnread) {
      const counts = serverUnread.peek()
      const left = (counts[notification.category] ?? 1) - 1
      serverUnread.value = {
        ...counts,
        [notification.category]: Math.max(0, left),
      }
    }
    api['POST/api/notification/read']
      .fetch({ id: Number(notification.id.slice(1)) })
      .catch(() => {})
  }
}

export const readAll = () => {
  markAllRead(me.login)
  serverUnread.value = {}
  api['POST/api/notifications/read-all'].fetch().catch(() => {})
}

// Read once the developer is known, again for each new one: a notification
// for me reaches my open pages as an entry (§13.3)
effect(() => {
  if (!currentUser.value) return
  loaded = false
  olderRead.clear()
  olderNotifications.value = {}
  seen.clear()
  loadNotifications()
})
// Hidden, the tab reads once when it shows again (§12.7)
onEvent('NOTIFICATION_CREATED', () => whenShown(loadNotifications))
onReconnect(() => currentUser.peek() && whenShown(loadNotifications))
