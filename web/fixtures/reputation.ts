import { signal } from '@preact/signals'
import { daysAgo } from '/web/fixtures/clock.ts'
import { helpRequests } from '/web/fixtures/help.ts'
import { hearOf, type Login, people, personOf } from '/web/fixtures/people.ts'
import {
  projects,
  type ProjectSlug,
  projectsShownOf,
} from '/web/fixtures/projects.ts'
import type { ApiOutput } from '/web/lib/api.ts'
import { t, translate } from '/web/lib/language.ts'

// Reputation is computed from frozen proofs only (cahier des charges §8).
// A developer the server knows shows the proofs of GET/api/user/proofs and
// the badges of GET/api/user/badges (PAM-303, web/lib/reputation.ts); the
// demo people keep those of the fixtures, computed here, until the seed
// gives them their proofs (PAM-901).

export type Dimension = 'review' | 'build' | 'mentor' | 'oss' | 'help'

export const dimensions: [Dimension, string][] = [
  ['review', 'Review de code'],
  ['build', 'Construction de projets'],
  ['mentor', 'Mentorat'],
  ['oss', 'Open source'],
  ['help', 'Entraide'],
]

export type Proof = {
  id: string
  who: Login
  dimension: Dimension
  title: string
  /** Absent for an answer accepted in a community */
  project?: ProjectSlug
  /** The developer who was helped, absent for one's own project */
  by?: Login
  at: number
  verified: boolean
  pullRequest?: number
  help?: string
  /** The question whose answer was accepted */
  post?: string
  demo: boolean
  /** Name of the project, for a project the pages do not know */
  projectName?: string
  /** The proof on GitHub: the PR, the release */
  url?: string
}

// A title written by the platform is a function: read in the language of
// the page each time it shows (QA-29)
const proof = (
  who: Login,
  dimension: Dimension,
  title: string | (() => string),
  project: ProjectSlug,
  extra: Partial<Proof> = {},
): Proof => {
  const owner = projects[project].owner
  const made: Proof = {
    id: '',
    who,
    dimension,
    title: '',
    project,
    by: owner === who ? undefined : owner,
    at: 0,
    verified: false,
    demo: true,
    ...extra,
  }
  return Object.defineProperty(made, 'title', {
    get: typeof title === 'string' ? () => title : title,
    enumerable: true,
  })
}

const reviews = (
  who: Login,
  list: [ProjectSlug, number][],
  title = (pr: number) => () => t`Review de la PR #${pr}`,
) =>
  list.map(([project, pr]) =>
    proof(who, 'review', title(pr), project, {
      pullRequest: pr,
      ...(who === 'moussa' && pr === 62 ? { help: 'h5' } : {}),
    })
  )

const merged = (who: Login, list: [ProjectSlug, number][]) =>
  list.map(([project, pr]) =>
    proof(
      who,
      'oss',
      () => t`PR #${pr} mergée chez ${projects[project].name}`,
      project,
      { pullRequest: pr },
    )
  )

// Each proof is two days older than the previous one
export const proofs: Proof[] = [
  ...reviews('moussa', [
    ['openpay-africa', 62],
    ['senegal-maps', 22],
    ['africommerce', 12],
    ['dakar-transit', 8],
    ['openpay-africa', 55],
    ['senegal-maps', 27],
    ['africommerce', 15],
    ['openpay-africa', 48],
    ['dakar-transit', 11],
    ['senegal-maps', 29],
    ['openpay-africa', 70],
    ['africommerce', 19],
    ['dakar-transit', 14],
    ['openpay-africa', 74],
  ]),
  proof(
    'moussa',
    'help',
    'Debug d’un deadlock dans les workers de paiement',
    'africommerce',
  ),
  proof('moussa', 'help', 'Aide sur les migrations SQLite', 'dakar-transit'),
  ...merged('moussa', [
    ['africommerce', 40],
    ['senegal-maps', 41],
    ['dakar-transit', 42],
    ['senegal-maps', 43],
  ]),
  proof('moussa', 'mentor', 'Mentorat Go pour Yao', 'dakar-transit', {
    by: 'yao',
  }),
  proof(
    'abdou',
    'build',
    () => t`A créé ${'OpenPay Africa'}`,
    'openpay-africa',
  ),
  ...reviews('abdou', [
    ['senegal-maps', 18],
    ['dakar-transit', 5],
    ['africommerce', 9],
  ]),
  proof('abdou', 'help', 'Aide sur Deno KV', 'senegal-maps'),
  proof('awa', 'build', () => t`A créé ${'Senegal Maps'}`, 'senegal-maps'),
  ...reviews('awa', [
    ['openpay-africa', 50],
    ['openpay-africa', 60],
    ['dakar-transit', 3],
    ['dakar-transit', 6],
    ['africommerce', 7],
  ]),
  ...merged('awa', [
    ['openpay-africa', 20],
    ['dakar-transit', 21],
    ['africommerce', 22],
  ]),
  proof('fatou', 'build', () => t`A créé ${'Dakar Transit'}`, 'dakar-transit'),
  ...reviews('fatou', [
    ['openpay-africa', 66],
    ['senegal-maps', 24],
    ['africommerce', 10],
    ['openpay-africa', 71],
  ]),
  proof('kofi', 'build', () => t`A créé ${'AfriCommerce'}`, 'africommerce'),
  proof('kofi', 'help', 'Aide sur la navigation Flutter', 'senegal-maps'),
  ...reviews(
    'zeinab',
    [
      ['openpay-africa', 58],
      ['senegal-maps', 25],
      ['dakar-transit', 9],
      ['africommerce', 13],
      ['openpay-africa', 68],
      ['senegal-maps', 30],
    ],
    (pr) => () => t`Audit sécurité de la PR #${pr}`,
  ),
  ...([
    'openpay-africa',
    'africommerce',
    'senegal-maps',
    'dakar-transit',
  ] as const)
    .map((project) =>
      proof('zeinab', 'help', 'Revue des secrets et des tokens', project)
    ),
  proof('amina', 'help', 'Pipeline CI pour Senegal Maps', 'senegal-maps'),
].map((p, i) =>
  Object.assign(p, { id: `p${i + 1}`, at: daysAgo((i + 1) * 2 + 3) })
)

// A component that reads the proofs follows them: a confirmed help shows
// on the profile without a refresh
export const reputationChanged = signal(0)

export const proofsOf = (login: Login) => {
  reputationChanged.value
  return proofs.filter((p) => p.who === login).sort((a, b) => b.at - a.at)
}

/** Name of the project of a proof */
export const projectNameOf = (proof: Proof) =>
  proof.projectName ||
  (proof.project && projects[proof.project]?.name) || ''

/**
 * Reviews and help confirmed by someone else: the « aides confirmées » of
 * the cards and of the matching, one dimension or both.
 */
export const confirmedHelpsOf = (
  login: Login,
  dimension?: 'review' | 'help',
) =>
  proofs.filter((p) =>
    p.who === login && p.by &&
    (dimension
      ? p.dimension === dimension
      : p.dimension === 'review' || p.dimension === 'help')
  ).length

export const levelNames = ['Bronze', 'Argent', 'Or', 'Platine']

type BadgeDefinition = {
  /** Key of the badge on the server (§8.2) */
  key: string
  name: string
  dimension?: Dimension
  thresholds: number[]
  /** Singular and plural of what is counted */
  unit: [string, string]
}

// Thresholds of §8.2, initial values to tune after the seed
const badgeDefinitions: BadgeDefinition[] = [
  {
    key: 'trusted_reviewer',
    name: 'Reviewer de confiance',
    dimension: 'review',
    thresholds: [3, 10, 20, 50],
    unit: ['review confirmée', 'reviews confirmées'],
  },
  {
    key: 'first_responder',
    name: 'Premier à répondre',
    dimension: 'help',
    thresholds: [3, 10, 25, 50],
    unit: ['aide', 'aides'],
  },
  {
    key: 'mentor',
    name: 'Mentor',
    dimension: 'mentor',
    thresholds: [2, 5, 15, 30],
    unit: ['mentorat', 'mentorats'],
  },
  {
    key: 'open_source',
    name: 'Contributeur open source',
    dimension: 'oss',
    thresholds: [3, 10, 25, 50],
    unit: ['PR mergée', 'PRs mergées'],
  },
  {
    key: 'builder',
    name: 'Bâtisseur',
    dimension: 'build',
    thresholds: [1, 3, 5, 10],
    unit: ['projet', 'projets'],
  },
]

const crossBorder: BadgeDefinition = {
  key: 'cross_border',
  name: 'Bâtisseur sans frontières',
  thresholds: [2, 3, 5, 8],
  unit: ['pays', 'pays'],
}

// Badges only the server computes: they need the GitHub activity and the
// communities
const serverOnly: BadgeDefinition[] = [
  {
    key: 'maintainer',
    name: 'Mainteneur',
    thresholds: [1, 3, 6, 12],
    unit: ['mois d’affilée', 'mois d’affilée'],
  },
  {
    key: 'community_pillar',
    name: 'Pilier de communauté',
    dimension: 'help',
    thresholds: [5, 15, 40, 100],
    unit: ['réponse acceptée', 'réponses acceptées'],
  },
]

const definitions = [...badgeDefinitions, crossBorder, ...serverOnly]

/** Name of a badge of the server, as the notifications say it */
export const badgeName = (key: string) =>
  definitions.find((b) => b.key === key)?.name ?? key

export type Badge = {
  name: string
  dimension?: Dimension
  count: number
  /** -1 while on the way to Bronze */
  level: number
  next?: number
  nextLabel: string
}

const nextLabel = (badge: BadgeDefinition, count: number, next: number) => {
  const missing = next - count
  const level = translate(levelNames[badge.thresholds.indexOf(next)])
  // Enough proofs, not yet with enough different people (§8.4)
  if (missing <= 0) {
    return t`Aide des personnes plus variées pour le niveau ${level}`
  }
  return t`${missing} ${
    translate(badge.unit[missing > 1 ? 1 : 0])
  } avant le niveau ${level}`
}

type ApiBadge = ApiOutput['GET/api/user/badges'][number]

// Badges read from the server, by login
const serverBadges = new Map<string, ApiBadge[]>()

/** A badge of the server: its levels go from 0 (none) to 4 (Platinum) */
const fromServer = ({ badge, level, count, next }: ApiBadge): Badge => {
  const definition = definitions.find((b) => b.key === badge)!
  return {
    name: definition.name,
    dimension: definition.dimension,
    count,
    level: level - 1,
    next: next || undefined,
    nextLabel: next
      ? nextLabel(definition, count, next)
      : translate('Niveau maximal atteint'),
  }
}

export const badgesOf = (login: Login): Badge[] => {
  const mine = proofsOf(login)
  const saved = serverBadges.get(login)
  if (saved) {
    return saved
      .filter((b) => b.count > 0 && definitions.some((d) => d.key === b.badge))
      .map(fromServer)
  }
  const home = people[login].countryCode
  const countries = new Set(
    mine.map((p) => p.by && personOf(p.by).countryCode)
      .filter((code) => code && code !== home),
  )
  return [
    ...badgeDefinitions.map((badge) => ({
      badge,
      count: mine.filter((p) => p.dimension === badge.dimension).length,
    })),
    { badge: crossBorder, count: countries.size },
  ]
    .filter(({ count }) => count > 0)
    .map(({ badge, count }) => {
      const i = badge.thresholds.findIndex((threshold) => count < threshold)
      const next = i === -1 ? undefined : badge.thresholds[i]
      return {
        name: badge.name,
        dimension: badge.dimension,
        count,
        level: i === -1 ? 3 : i - 1,
        next,
        nextLabel: next
          ? nextLabel(badge, count, next)
          : translate('Niveau maximal atteint'),
      }
    })
}

/** Next threshold of the badge of a dimension, to draw its bar */
export const nextThreshold = (dimension: Dimension, count: number) => {
  const { thresholds } = badgeDefinitions.find((b) =>
    b.dimension === dimension
  )!
  return thresholds.find((t) => count < t) ?? thresholds[3]
}

export type Link = { login: Login; count: number; verified: boolean }

/** Figures of a profile, the same on the profile, passport and card */
export const profileStats = (login: Login) => {
  const mine = proofsOf(login)
  const count = (dimension: Dimension) =>
    mine.filter((p) => p.dimension === dimension).length
  return {
    projects: projectsShownOf(login).length,
    reviews: count('review'),
    contributions: count('oss') + count('build'),
    helped: new Set(
      mine.filter((p) => p.by && p.dimension !== 'build').map((p) => p.by),
    ).size,
    collaborations: linksOf(login).length,
    verified: mine.filter((p) => p.verified).length,
  }
}

/** Working links only: proofs and help, never follows (§9.3) */
export const linksOf = (login: Login): Link[] => {
  reputationChanged.value
  const links = new Map<Login, Link>()
  const add = (other: Login | undefined, verified: boolean) => {
    if (!other || other === login) return
    const link = links.get(other) ?? { login: other, count: 0, verified }
    link.count++
    link.verified ||= verified
    links.set(other, link)
  }
  for (const p of proofs) {
    if (p.who === login) add(p.by, p.verified)
    if (p.by === login) add(p.who, p.verified)
  }
  for (const h of helpRequests) {
    if (h.helper === login) add(h.author, false)
    if (h.author === login && h.helper) add(h.helper, false)
  }
  return [...links.values()].sort((a, b) => b.count - a.count)
}

/*
 * Proofs read from the server (GET/api/user/proofs)
 */

type ApiProof = ApiOutput['GET/api/user/proofs'][number]

// The demo people of the fixtures, before the session adds its developer
const demoPeople = new Set<string>(Object.keys(people))

const helpTypes: Record<string, string> = {
  mentorship: 'Mentorat',
  pair_programming: 'Pair programming',
}

/** What a proof says, in the language of the page */
const titleOf = (p: ApiProof) => {
  switch (p.kind) {
    case 'review':
      return t`Review de la PR #${p.prNumber}`
    case 'merged':
      return p.dimension === 'oss'
        ? t`PR #${p.prNumber} mergée chez ${p.projectName}`
        : t`PR #${p.prNumber} mergée`
    case 'release':
      return t`Release ${p.tag} de ${p.projectName}`
    case 'created':
      return t`A créé ${p.projectName}`
    case 'answer':
      return translate('Réponse acceptée')
    default:
      // The title of the help request, as its author wrote it
      return p.title || translate(helpTypes[p.category] ?? 'Aide confirmée')
  }
}

const proofOf = (login: string, p: ApiProof): Proof => ({
  id: `e${p.id}`,
  who: login as Login,
  dimension: p.dimension as Dimension,
  get title() {
    return titleOf(p)
  },
  project: (p.project || undefined) as ProjectSlug | undefined,
  projectName: p.projectName || undefined,
  by: (p.by || undefined) as Login | undefined,
  at: p.at * 1000,
  // Only an action seen on GitHub is « vérifié par GitHub » (§8.3)
  verified: p.source === 'github',
  demo: p.source === 'demo',
  pullRequest: p.prNumber || undefined,
  url: p.url || undefined,
  help: p.helpRequestId ? String(p.helpRequestId) : undefined,
  post: p.postId ? String(p.postId) : undefined,
})

/**
 * The proofs and badges of a developer read from the server take the place
 * of those of the pages. A demo person keeps their fixtures, which the seed
 * mirrors, and gains what they really did on Pamoja or GitHub.
 */
export const adoptReputation = (
  login: string,
  list: ApiProof[],
  badges: ApiBadge[],
) => {
  const demo = demoPeople.has(login)
  const kept = proofs.filter((p) =>
    p.who !== login || (demo && !p.id.startsWith('e'))
  )
  const adopted = list.filter((p) => !demo || p.source !== 'demo')
    .map((p) => proofOf(login, p))
  for (const p of list) p.by && hearOf(p.by, p.byName, p.byCountry)
  proofs.splice(0, proofs.length, ...kept, ...adopted)
  demo || serverBadges.set(login, badges)
  reputationChanged.value++
}
