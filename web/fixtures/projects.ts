import { signal } from '@preact/signals'
import { logActivity } from '/web/fixtures/activity.ts'
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
  /** Live via the GitHub App, polled every 15 min, or no repo yet */
  sync: 'live' | 'poll' | 'none'
  /** The GitHub App is installed: live sync comes back without a dialog */
  appInstalled?: boolean
  /** Name of the GitHub repo when it differs from the slug */
  repo?: string
  /** Owner of the GitHub repo when it is not the owner of the project */
  repoOwner?: string
  /** Languages read from GitHub, percent of the code (§6.5) */
  languages?: [string, number][]
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
  /** Older entries of the project journal (Activité tab) */
  journal?: { text: string; at: number }[]
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
    appInstalled: true,
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
        text: 'CI en échec sur la PR #79 : job test (go 1.22)',
        at: hoursAgo(1),
      },
      {
        text: 'Issue #44 marquée blocked : verrou SQLite sous charge',
        at: daysAgo(3),
      },
    ],
    journal: [
      {
        text: 'Release v0.3 publiée : Wave et Orange Money en sandbox',
        at: daysAgo(9),
      },
      { text: 'Fatou devient Mainteneur', at: daysAgo(20) },
      { text: 'Review reçue sur la PR #62 par Moussa', at: daysAgo(12) },
      {
        text: 'Carte « Lever le verrou SQLite » déplacée vers En cours',
        at: daysAgo(2),
      },
      {
        text: 'Demande d’aide publiée : verrou SQLite sous charge',
        at: hoursAgo(30),
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

// Needs offered when editing a project
export const needSuggestions = [
  'Backend',
  'Frontend',
  'Tests',
  'DevOps',
  'Documentation',
  'Review de code',
  'Design',
  'good first issue',
]

// Session changes until the project routes exist (PAM-401)
export const projectsChanged = signal(0)

/** POST/api/follow/toggle on a project */
export const toggleFollow = (project: Project, login: Login) => {
  project.followers = project.followers.includes(login)
    ? project.followers.filter((l) => l !== login)
    : [...project.followers, login]
  projectsChanged.value++
}

/** POST/api/project/update, journaled */
export const updateProject = (
  project: Project,
  patch: Partial<
    Pick<
      Project,
      'name' | 'description' | 'vision' | 'needs' | 'sync' | 'appInstalled'
    >
  >,
  journal: string,
) => {
  Object.assign(project, patch)
  logActivity(project.slug as ProjectSlug, journal)
  projectsChanged.value++
}

// Skills that answer each project need, until AI extraction (PAM-310).
// A need absent from this list (tests, documentation) asks for the stack.
export const needSkills: Record<string, string[]> = {
  'Review de code Go': ['Go', 'Code review'],
  'Frontend React': ['React'],
  'Backend': ['Backend', 'Go', 'PostgreSQL', 'SQL'],
  'DevOps': ['Docker', 'Kubernetes', 'CI'],
  'Review de code': ['Code review'],
  'Frontend': ['React', 'UI'],
  'Design': ['UI'],
}

/** Projects someone owns or is a member of */
export const projectsOf = (login: Login): Project[] =>
  Object.values(projects).filter((project) =>
    project.owner === login ||
    project.members.some((member) => member.login === login)
  )

/** A project as a profile shows it: « En train de construire » (§9.1) */
export type ProfileProject = {
  slug: string
  name: string
  description: string
  stack: string[]
  role: ProjectRole
}

// The public projects of the profiles read from GET/api/user, by login
const profileProjects = new Map<string, ProfileProject[]>()
export const profileProjectsChanged = signal(0)

export const adoptProfileProjects = (login: string, list: ProfileProject[]) => {
  profileProjects.set(login, list)
  profileProjectsChanged.value++
}

/**
 * The projects shown on a profile: those the server gave for it, else those
 * of the pages. A component that reads them follows them.
 */
export const projectsShownOf = (login: string): ProfileProject[] => {
  profileProjectsChanged.value
  return profileProjects.get(login) ??
    projectsOf(login as Login).map((project) => ({
      slug: project.slug,
      name: project.name,
      description: project.description,
      stack: project.stack,
      role: project.owner === login
        ? 'Propriétaire'
        : project.members.find((m) => m.login === login)?.role ??
          'Contributeur',
    }))
}
