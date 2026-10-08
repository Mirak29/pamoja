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
  demo: boolean
}

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
    demo: true,
  },
} satisfies Record<string, Project>

export type ProjectSlug = keyof typeof projects
