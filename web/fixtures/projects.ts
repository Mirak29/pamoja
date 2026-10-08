import { daysAgo, hoursAgo } from '/web/fixtures/clock.ts'
import type { Login } from '/web/fixtures/people.ts'

export type ProjectRole =
  | 'Propriétaire'
  | 'Mainteneur'
  | 'Contributeur'
  | 'Reviewer'
  | 'Observateur'

export type Project = {
  slug: string
  name: string
  owner: Login
  stack: string[]
  /** live: GitHub App installed, poll: refreshed every 15 minutes */
  sync: 'live' | 'poll'
  description: string
  contributors: number
  openIssues: number
  release: string
  members: { login: Login; role: ProjectRole }[]
  followers: Login[]
  needs: string[]
  blockers: number[]
  stage: 'Idée' | 'Prototype' | 'Bêta' | 'Production'
  activity: 'Très actif' | 'Actif' | 'Calme'
  about?: string
  vision?: string
  releasedAt: number
  milestones: Milestone[]
  gallery: string[]
  /** Embedded by link only (cahier des charges §17.3) */
  demoVideo?: { provider: 'YouTube' | 'Loom' | 'Vimeo'; duration: string }
  /** Events imported with the project, before any live entry */
  events: { text: string; at: number }[]
  demo: boolean
}

export type Milestone = {
  title: string
  description: string
  done: number
  total: number
  state: 'done' | 'active' | 'planned'
  date: string
}

const defaultGallery = ['Écran principal', 'Détail', 'Version mobile']

export const projects = {
  'openpay-africa': {
    slug: 'openpay-africa',
    name: 'OpenPay Africa',
    owner: 'abdou',
    stack: ['Go', 'SQLite', 'Deno'],
    sync: 'live',
    description:
      'API de paiement mobile ouverte pour les marchands d’Afrique de l’Ouest.',
    contributors: 12,
    openIssues: 9,
    release: 'v0.3',
    members: [
      { login: 'abdou', role: 'Propriétaire' },
      { login: 'fatou', role: 'Mainteneur' },
    ],
    followers: ['moussa', 'awa', 'zeinab'],
    needs: ['Review de code Go', 'Tests'],
    blockers: [44],
    stage: 'Bêta',
    activity: 'Très actif',
    about:
      'OpenPay Africa unifie Wave, Orange Money et MTN MoMo derrière une seule API. Les marchands encaissent sans réécrire leur intégration pour chaque opérateur.',
    vision:
      'Qu’un développeur d’Afrique de l’Ouest puisse accepter un paiement mobile en dix lignes.',
    releasedAt: daysAgo(9),
    milestones: [
      {
        title: 'v0.2 · Fondations',
        description: 'API marchands et modèle de transactions',
        done: 8,
        total: 8,
        state: 'done',
        date: 'juin 2026',
      },
      {
        title: 'v0.3 · Wave et Orange Money',
        description: 'Paiements en sandbox chez les deux opérateurs',
        done: 12,
        total: 12,
        state: 'done',
        date: 'sept. 2026',
      },
      {
        title: 'v0.4 · Réconciliation et webhooks',
        description: 'Ledger, idempotence, signature des webhooks',
        done: 7,
        total: 11,
        state: 'active',
        date: 'nov. 2026',
      },
      {
        title: 'v0.5 · MTN MoMo et production',
        description: 'Troisième opérateur, passage en production',
        done: 0,
        total: 9,
        state: 'planned',
        date: 'janv. 2027',
      },
    ],
    gallery: [
      'Tableau de bord marchand',
      'Flux de paiement Wave',
      'Logs de réconciliation',
    ],
    demoVideo: { provider: 'Loom', duration: '2:40' },
    events: [
      {
        text: 'PR #77 mergée : gestion des devises XOF et XAF',
        at: daysAgo(2),
      },
      {
        text: 'Fatou ouvre la PR #84 sur la réconciliation du ledger',
        at: hoursAgo(6),
      },
      {
        text: 'Issue #44 marquée blocked : verrou SQLite sous charge',
        at: daysAgo(3),
      },
    ],
    demo: true,
  },
  'senegal-maps': {
    slug: 'senegal-maps',
    name: 'Senegal Maps',
    owner: 'awa',
    stack: ['TypeScript', 'React'],
    sync: 'poll',
    description:
      'Cartes open data du Sénégal : quartiers, transports, points d’eau.',
    contributors: 7,
    openIssues: 14,
    release: 'v1.2',
    members: [{ login: 'awa', role: 'Propriétaire' }],
    followers: ['abdou'],
    needs: ['Frontend React', 'good first issue'],
    blockers: [],
    stage: 'Production',
    activity: 'Actif',
    releasedAt: daysAgo(9),
    milestones: [
      {
        title: 'v1.1 · Transports',
        description: 'Lignes de bus et cars rapides',
        done: 9,
        total: 9,
        state: 'done',
        date: 'août 2026',
      },
      {
        title: 'v1.2 · Points d’eau',
        description: 'Forages et bornes fontaines',
        done: 6,
        total: 6,
        state: 'done',
        date: 'sept. 2026',
      },
      {
        title: 'v1.3 · Mode hors ligne',
        description: 'Cache des tuiles sur mobile',
        done: 3,
        total: 8,
        state: 'active',
        date: 'nov. 2026',
      },
    ],
    gallery: defaultGallery,
    demoVideo: { provider: 'Loom', duration: '2:40' },
    events: [],
    demo: true,
  },
  'dakar-transit': {
    slug: 'dakar-transit',
    name: 'Dakar Transit',
    owner: 'fatou',
    stack: ['TypeScript', 'PostgreSQL'],
    sync: 'poll',
    description:
      'Horaires et trajets des bus Dakar Dem Dikk et des cars rapides.',
    contributors: 4,
    openIssues: 6,
    release: 'v0.1',
    members: [{ login: 'fatou', role: 'Propriétaire' }],
    followers: [],
    needs: ['Backend'],
    blockers: [],
    stage: 'Prototype',
    activity: 'Calme',
    releasedAt: daysAgo(9),
    milestones: [],
    gallery: defaultGallery,
    demoVideo: { provider: 'Loom', duration: '2:40' },
    events: [],
    demo: true,
  },
  africommerce: {
    slug: 'africommerce',
    name: 'AfriCommerce',
    owner: 'kofi',
    stack: ['Flutter', 'Go'],
    sync: 'poll',
    description:
      'Boutique mobile pour vendeurs informels, paiement à la livraison.',
    contributors: 5,
    openIssues: 11,
    release: 'v0.2',
    members: [{ login: 'kofi', role: 'Propriétaire' }],
    followers: [],
    needs: ['Documentation'],
    blockers: [],
    stage: 'Prototype',
    activity: 'Actif',
    releasedAt: daysAgo(9),
    milestones: [],
    gallery: defaultGallery,
    demoVideo: { provider: 'Loom', duration: '2:40' },
    events: [],
    demo: true,
  },
} satisfies Record<string, Project>

export type ProjectSlug = keyof typeof projects

/** Projects someone owns or is a member of */
export const projectsOf = (login: Login): Project[] =>
  Object.values(projects).filter((project) =>
    project.owner === login ||
    project.members.some((member) => member.login === login)
  )
