import { signal } from '@preact/signals'
import { type Login, me } from '/web/fixtures/people.ts'

export type NotificationCategory =
  | 'for-you'
  | 'projects'
  | 'communities'
  | 'social'
  | 'system'

export type NotificationKind =
  | 'pull-request'
  | 'follow'
  | 'sync'
  | 'help'
  | 'community'
  | 'moderation'
  | 'promising'
  | 'application'
  | 'collaboration'
  | 'reply'
  | 'repost'
  | 'mention'

export type Notification = {
  id: string
  to: Login
  category: NotificationCategory
  kind: NotificationKind
  title: string
  body: string
  at: number
  read: boolean
  href: string
  /** Id of a join request, accepted or refused from the notification (§6.6) */
  application?: string
  /** Server decision: -1 pending, 0 refused, 1 accepted. */
  accepted?: number
  /** A help request that matches me: what the toast shows (§7.4) */
  match?: { skills: string[]; score: number; duration: string }
  demo: boolean
}

export const notifications: Notification[] = []

// Session changes until the notification routes exist (PAM-210)
export const notificationsChanged = signal(0)

/** Last notification for the signed-in developer, shown as a toast (§7.4) */
export const incoming = signal<Notification | null>(null)

export const markRead = (notification: Notification) => {
  notification.read = true
  notificationsChanged.value++
}

export const markAllRead = (login: string) => {
  for (const n of notifications) n.to === login && (n.read = true)
  notificationsChanged.value++
}

/** What the server does when an action notifies someone */
export const pushNotification = (
  notification: Omit<Notification, 'id' | 'at' | 'read' | 'demo'>,
) => {
  const pushed = {
    ...notification,
    id: `n${notifications.length + 1}`,
    at: Date.now(),
    read: false,
    demo: false,
  }
  notifications.unshift(pushed)
  notification.to === me.login && (incoming.value = pushed)
  notificationsChanged.value++
}
