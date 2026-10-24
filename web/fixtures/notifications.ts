import { signal } from '@preact/signals'
import { daysAgo, hoursAgo } from '/web/fixtures/clock.ts'
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
  /** A help request that matches me: what the toast shows (§7.4) */
  match?: { skills: string[]; score: number; duration: string }
  demo: boolean
}

export const notifications: Notification[] = [
  {
    id: 'n9',
    to: 'abdou',
    category: 'projects',
    kind: 'application',
    title: 'Awa veut rejoindre OpenPay Africa',
    body:
      'Frontend et Tests, 4 h par semaine : « J’aimerais contribuer au projet. »',
    at: hoursAgo(1),
    read: true,
    href: 'project/openpay-africa/equipe',
    application: 'a1',
    demo: true,
  },
  {
    id: 'n1',
    to: 'abdou',
    category: 'projects',
    kind: 'pull-request',
    title: 'Fatou a ouvert la PR #80',
    body:
      '« Idempotency keys for webhooks » sur OpenPay Africa attend une review.',
    at: hoursAgo(50),
    read: true,
    href: 'project/openpay-africa/prs?dialog=pr-80',
    demo: true,
  },
  {
    id: 'n10',
    to: 'abdou',
    category: 'for-you',
    kind: 'help',
    title: 'AfriCommerce a besoin de toi',
    body:
      'Kofi demande une review de code Go : « Relire l’API Go de paiement à la livraison ». Environ 30 min.',
    at: hoursAgo(5),
    read: false,
    href: 'help/h1',
    demo: true,
  },
  {
    id: 'n11',
    to: 'abdou',
    category: 'for-you',
    kind: 'help',
    title: 'Dakar Transit a besoin de toi',
    body:
      'Fatou cherche un avis d’architecture Go et SQL : « Choisir l’architecture du backend des horaires ». Environ 45 min.',
    at: hoursAgo(20),
    read: true,
    href: 'help/h2',
    demo: true,
  },
  {
    id: 'n2',
    to: 'abdou',
    category: 'social',
    kind: 'follow',
    title: 'Moussa suit OpenPay Africa',
    body: 'Il rejoint Awa et Zeinab parmi les abonnés du projet.',
    at: hoursAgo(26),
    read: false,
    href: '@moussa',
    demo: true,
  },
  {
    id: 'n3',
    to: 'abdou',
    category: 'system',
    kind: 'sync',
    title: 'Synchro live active sur OpenPay Africa',
    body: 'Les PRs, reviews et CI arrivent en temps réel dans #suivi.',
    at: daysAgo(3),
    read: true,
    href: 'project/openpay-africa/channels/updates',
    demo: true,
  },
  {
    id: 'n4',
    to: 'moussa',
    category: 'for-you',
    kind: 'help',
    title: '3 demandes d’aide correspondent à tes skills',
    body:
      'Go, SQLite, Backend : AfriCommerce, Dakar Transit et OpenPay Africa.',
    at: hoursAgo(2),
    read: false,
    href: 'help',
    demo: true,
  },
  {
    id: 'n5',
    to: 'moussa',
    category: 'communities',
    kind: 'community',
    title: 'Nouvelle discussion dans Go',
    body: 'Zeinab : « Vos patterns pour les transactions SQLite en Go ? »',
    at: hoursAgo(9),
    read: true,
    href: 'community/go',
    demo: true,
  },
  {
    id: 'n6',
    to: 'awa',
    category: 'projects',
    kind: 'pull-request',
    title: 'La PR #31 attend une review',
    body: '« Tile cache for offline mode » sur Senegal Maps.',
    at: hoursAgo(20),
    read: false,
    href: 'project/senegal-maps/prs',
    demo: true,
  },
  {
    id: 'n7',
    to: 'zeinab',
    category: 'system',
    kind: 'moderation',
    title: 'Tu es modératrice de la communauté Go',
    body: 'La file de modération est vide pour l’instant.',
    at: daysAgo(5),
    read: false,
    href: 'moderation',
    demo: true,
  },
  {
    id: 'n8',
    to: 'amina',
    category: 'for-you',
    kind: 'promising',
    title: 'Ton profil est mis en avant comme prometteur',
    body:
      'Une place par vague de matching est réservée aux nouveaux profils bien alignés.',
    at: daysAgo(1),
    read: false,
    href: 'help',
    demo: true,
  },
]

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
