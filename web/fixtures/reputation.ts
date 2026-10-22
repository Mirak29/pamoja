import { daysAgo } from '/web/fixtures/clock.ts'
import { helpRequests } from '/web/fixtures/help.ts'
import { type Login, people } from '/web/fixtures/people.ts'
import {
  projects,
  type ProjectSlug,
  projectsOf,
} from '/web/fixtures/projects.ts'
import { t, translate } from '/web/lib/language.ts'

// Reputation is computed from frozen proofs only (cahier des charges §8):
// what GET/api/user, GET/api/user/badges and the badge evaluator
// (PAM-213, PAM-303) will return, computed here on the fixtures

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
}

const proof = (
  who: Login,
  dimension: Dimension,
  title: string,
  project: ProjectSlug,
  extra: Partial<Proof> = {},
): Proof => {
  const owner = projects[project].owner
  return {
    id: '',
    who,
    dimension,
    title,
    project,
    by: owner === who ? undefined : owner,
    at: 0,
    verified: false,
    demo: true,
    ...extra,
  }
}

const reviews = (
  who: Login,
  list: [ProjectSlug, number][],
  title = (pr: number) => `Review de la PR #${pr}`,
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
      `PR #${pr} mergée chez ${projects[project].name}`,
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
  proof('abdou', 'build', 'A créé OpenPay Africa', 'openpay-africa'),
  ...reviews('abdou', [
    ['senegal-maps', 18],
    ['dakar-transit', 5],
    ['africommerce', 9],
  ]),
  proof('abdou', 'help', 'Aide sur Deno KV', 'senegal-maps'),
  proof('awa', 'build', 'A créé Senegal Maps', 'senegal-maps'),
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
  proof('fatou', 'build', 'A créé Dakar Transit', 'dakar-transit'),
  ...reviews('fatou', [
    ['openpay-africa', 66],
    ['senegal-maps', 24],
    ['africommerce', 10],
    ['openpay-africa', 71],
  ]),
  proof('kofi', 'build', 'A créé AfriCommerce', 'africommerce'),
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
    (pr) => `Audit sécurité de la PR #${pr}`,
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
].map((p, i) => ({ ...p, id: `p${i + 1}`, at: daysAgo((i + 1) * 2 + 3) }))

export const proofsOf = (login: Login) =>
  proofs.filter((p) => p.who === login).sort((a, b) => b.at - a.at)

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
  name: string
  dimension?: Dimension
  thresholds: number[]
  /** Singular and plural of what is counted */
  unit: [string, string]
}

// Thresholds of §8.2, initial values to tune after the seed
const badgeDefinitions: BadgeDefinition[] = [
  {
    name: 'Reviewer de confiance',
    dimension: 'review',
    thresholds: [3, 10, 20, 50],
    unit: ['review confirmée', 'reviews confirmées'],
  },
  {
    name: 'Premier à répondre',
    dimension: 'help',
    thresholds: [3, 10, 25, 50],
    unit: ['aide', 'aides'],
  },
  {
    name: 'Mentor',
    dimension: 'mentor',
    thresholds: [2, 5, 15, 30],
    unit: ['mentorat', 'mentorats'],
  },
  {
    name: 'Contributeur open source',
    dimension: 'oss',
    thresholds: [3, 10, 25, 50],
    unit: ['PR mergée', 'PRs mergées'],
  },
  {
    name: 'Bâtisseur',
    dimension: 'build',
    thresholds: [1, 3, 5, 10],
    unit: ['projet', 'projets'],
  },
]

const crossBorder: BadgeDefinition = {
  name: 'Bâtisseur sans frontières',
  thresholds: [2, 3, 5, 8],
  unit: ['pays', 'pays'],
}

export type Badge = {
  name: string
  dimension?: Dimension
  count: number
  /** -1 while on the way to Bronze */
  level: number
  next?: number
  nextLabel: string
}

export const badgesOf = (login: Login): Badge[] => {
  const mine = proofsOf(login)
  const home = people[login].countryCode
  const countries = new Set(
    mine.map((p) => p.by && people[p.by].countryCode)
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
      const missing = next ? next - count : 0
      return {
        name: badge.name,
        dimension: badge.dimension,
        count,
        level: i === -1 ? 3 : i - 1,
        next,
        nextLabel: next
          ? t`${missing} ${
            translate(badge.unit[missing > 1 ? 1 : 0])
          } avant le niveau ${translate(levelNames[i])}`
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
    projects: projectsOf(login).length,
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
