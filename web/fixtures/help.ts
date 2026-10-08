import { daysAgo, hoursAgo } from '/web/fixtures/clock.ts'
import type { Login } from '/web/fixtures/people.ts'
import type { ProjectSlug } from '/web/fixtures/projects.ts'

/** Lifecycle of a help request (cahier des charges §7.2) */
export type HelpStatus =
  | 'open'
  | 'accepted'
  | 'review_submitted'
  | 'delivered'
  | 'completed'
  | 'closed_unhelpful'
  | 'closed_unconfirmed'
  | 'expired'
  | 'cancelled'

export type HelpRequest = {
  id: string
  author: Login
  helper?: Login
  project?: ProjectSlug
  type: string
  title: string
  description: string
  skills: string[]
  level: string
  duration: string
  status: HelpStatus
  at: number
  issue?: number
  pullRequest?: number
  demo: boolean
}

export const helpRequests: HelpRequest[] = [
  {
    id: 'h1',
    author: 'kofi',
    project: 'africommerce',
    type: 'Review de code',
    title: 'Relire l’API Go de paiement à la livraison',
    description:
      'L’API Go qui gère le paiement à la livraison est prête. Je voudrais un second avis sur la gestion des erreurs et la validation des montants avant de la brancher à l’app mobile.',
    skills: ['Go', 'Backend'],
    level: 'Intermédiaire',
    duration: '~30 min',
    status: 'open',
    at: hoursAgo(5),
    demo: true,
  },
  {
    id: 'h2',
    author: 'fatou',
    project: 'dakar-transit',
    type: 'Architecture',
    title: 'Choisir l’architecture du backend des horaires',
    description:
      'Les horaires changent souvent et les données arrivent en CSV. Je cherche à choisir entre un import planifié et une API qui sert directement les fichiers. Un avis sur la structure serait précieux.',
    skills: ['Backend', 'Go', 'SQL'],
    level: 'Confirmé',
    duration: '~45 min',
    status: 'open',
    at: hoursAgo(20),
    demo: true,
  },
  {
    id: 'h3',
    author: 'abdou',
    project: 'openpay-africa',
    type: 'Debug',
    title: 'Verrou SQLite sous charge concurrente (issue #44)',
    description:
      'Sous charge, plusieurs callbacks Wave écrivent en même temps dans SQLite et on obtient « database is locked ». Le mode WAL n’a pas suffi. J’aimerais une piste sur les transactions ou le pool de connexions.',
    skills: ['SQLite', 'Go', 'Concurrency'],
    level: 'Confirmé',
    duration: '~1 h',
    status: 'open',
    at: hoursAgo(30),
    issue: 44,
    demo: true,
  },
  {
    id: 'h4',
    author: 'awa',
    project: 'senegal-maps',
    type: 'Debug',
    title: 'Les tuiles de la carte clignotent sur mobile',
    description:
      'Sur mobile, les tuiles clignotent quand on zoome rapidement. Le problème apparaît surtout sur Android avec une connexion lente.',
    skills: ['React', 'TypeScript'],
    level: 'Intermédiaire',
    duration: '~30 min',
    status: 'open',
    at: hoursAgo(3),
    demo: true,
  },
  {
    id: 'h5',
    author: 'abdou',
    helper: 'moussa',
    project: 'openpay-africa',
    type: 'Review de code',
    title: 'Relire la migration SQLite de la PR #62',
    description:
      'La PR #62 migre le schéma des transactions. Je veux être sûr que la migration est réversible et ne bloque pas la base en production.',
    skills: ['Go', 'SQLite'],
    level: 'Intermédiaire',
    duration: '~20 min',
    status: 'completed',
    at: daysAgo(12),
    pullRequest: 62,
    demo: true,
  },
]
