import { daysAgo, hoursAgo } from '/web/fixtures/clock.ts'
import type { Login } from '/web/fixtures/people.ts'
import type { ProjectSlug } from '/web/fixtures/projects.ts'

export type Issue = {
  number: number
  project: ProjectSlug
  title: string
  labels: string[]
  author: Login
  comments: number
  state: 'open' | 'closed'
  at: number
  demo: boolean
}

type Draft = Omit<Issue, 'state' | 'demo'>
const issue = (draft: Draft): Issue => ({ ...draft, state: 'open', demo: true })

export const issues: Issue[] = [
  issue({
    number: 44,
    project: 'openpay-africa',
    title: 'Verrou SQLite sous charge concurrente',
    labels: ['blocked', 'bug'],
    author: 'abdou',
    comments: 7,
    at: daysAgo(3),
  }),
  issue({
    number: 46,
    project: 'openpay-africa',
    title: 'Documenter les codes d’erreur Orange Money',
    labels: ['good first issue', 'documentation'],
    author: 'abdou',
    comments: 2,
    at: hoursAgo(30),
  }),
  issue({
    number: 47,
    project: 'openpay-africa',
    title: 'Test unitaire du formatage XOF',
    labels: ['good first issue', 'tests'],
    author: 'fatou',
    comments: 1,
    at: hoursAgo(52),
  }),
  issue({
    number: 49,
    project: 'openpay-africa',
    title: 'Support de MTN MoMo Cameroun',
    labels: ['enhancement'],
    author: 'abdou',
    comments: 4,
    at: daysAgo(5),
  }),
  issue({
    number: 51,
    project: 'openpay-africa',
    title: 'Timeout des callbacks Wave en production',
    labels: ['bug'],
    author: 'fatou',
    comments: 3,
    at: hoursAgo(20),
  }),
  issue({
    number: 12,
    project: 'senegal-maps',
    title: 'Traduire la légende en wolof',
    labels: ['good first issue'],
    author: 'awa',
    comments: 2,
    at: daysAgo(3),
  }),
  issue({
    number: 18,
    project: 'senegal-maps',
    title: 'Points d’eau de Kaolack manquants',
    labels: ['good first issue', 'data'],
    author: 'awa',
    comments: 0,
    at: daysAgo(6),
  }),
  issue({
    number: 20,
    project: 'senegal-maps',
    title: 'Mode sombre de la carte',
    labels: ['enhancement'],
    author: 'awa',
    comments: 5,
    at: daysAgo(9),
  }),
  issue({
    number: 5,
    project: 'dakar-transit',
    title: 'Importer les horaires Dakar Dem Dikk au format GTFS',
    labels: ['enhancement'],
    author: 'fatou',
    comments: 1,
    at: daysAgo(4),
  }),
  issue({
    number: 7,
    project: 'dakar-transit',
    title: 'Choisir le backend des horaires',
    labels: ['question'],
    author: 'fatou',
    comments: 3,
    at: hoursAgo(22),
  }),
  issue({
    number: 9,
    project: 'africommerce',
    title: 'Rédiger le guide d’installation',
    labels: ['good first issue', 'documentation'],
    author: 'kofi',
    comments: 0,
    at: daysAgo(2),
  }),
]
