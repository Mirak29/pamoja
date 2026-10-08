import { signal } from '@preact/signals'
import { daysAgo, hoursAgo } from '/web/fixtures/clock.ts'
import type { Login } from '/web/fixtures/people.ts'

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
  /** A join request, accepted or refused from the notification (§6.6) */
  application?: 'pending' | 'accepted' | 'refused'
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
    href: 'projet/openpay-africa/equipe',
    application: 'pending',
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
    href: 'projet/openpay-africa/prs',
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
    href: 'projet/openpay-africa/canaux/suivi',
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
    href: 'aide',
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
    href: 'communaute/go',
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
    href: 'projet/senegal-maps/prs',
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
    href: 'aide',
    demo: true,
  },
]

// Session changes until the notification routes exist (PAM-210)
export const notificationsChanged = signal(0)

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
  notifications.unshift({
    ...notification,
    id: `n${notifications.length + 1}`,
    at: Date.now(),
    read: false,
    demo: false,
  })
  notificationsChanged.value++
}

/** POST/api/project/join-request/decide, from the notification */
export const decideApplication = (
  notification: Notification,
  accept: boolean,
) => {
  notification.application = accept ? 'accepted' : 'refused'
  markRead(notification)
}
