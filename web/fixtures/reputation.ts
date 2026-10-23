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
import { plural } from '/web/lib/plural.ts'
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
  /** The community of an accepted answer */
  community?: string
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
/**
 * The proofs of Wanjiru, a very active developer: about 260 over two years,
 * with 70 collaborators in 14 countries, on 24 projects and in 4
 * communities. Drawn from a fixed seed, so every load gives the same profile;
 * a few people and projects carry most of the work, as in a real network.
 */
function busyProofs(): Proof[] {
  let seed = 2026
  const random = () => (seed = (seed * 16807) % 2147483647) / 2147483647
  // Skewed towards the start of the list: a few strong links, a long tail
  const often = <T>(list: T[]) =>
    list[Math.floor(random() * random() * list.length)]
  const first = [
    'Amani',
    'Chidi',
    'Kwame',
    'Aïcha',
    'Tendai',
    'Lindiwe',
    'Youssef',
    'Fatima',
    'Kofi',
    'Nia',
    'Babajide',
    'Mariam',
    'Thabo',
    'Imani',
    'Seun',
    'Rokia',
    'Jabari',
    'Zawadi',
    'Ousmane',
    'Hana',
  ]
  const last = [
    'Otieno',
    'Okafor',
    'Mensah',
    'Diallo',
    'Moyo',
    'Dlamini',
    'Benali',
    'Haile',
    'Uwase',
    'Traoré',
    'Mwangi',
    'Adeyemi',
    'Ndlovu',
    'Kamara',
  ]
  const countryCodes = [
    'NG',
    'GH',
    'SN',
    'CI',
    'CM',
    'RW',
    'ZA',
    'EG',
    'MA',
    'TZ',
    'UG',
    'ET',
    'BJ',
    'KE',
  ]
  const mates = Array.from({ length: 70 }, (_, i) => {
    const login = `wk-dev-${i + 1}`
    hearOf(
      login,
      `${first[i % first.length]} ${
        last[(i * 3 + Math.floor(i / first.length)) % last.length]
      }`,
      countryCodes[i % countryCodes.length],
    )
    return login as Login
  })
  const projectNames = [
    'Nairobi Pay',
    'Matatu Routes',
    'Shamba Data',
    'M-Afya',
    'Jua Grid',
    'Soko API',
    'Lugha NLP',
    'Tuma SMS',
    'Kilimo Weather',
    'Duka POS',
    'Safari Maps',
    'Elimu LMS',
    'Bima Claims',
    'Haraka CI',
    'Pesa Ledger',
    'Afya Records',
    'Maji Meter',
    'Kazi Jobs',
    'Habari Feed',
    'Nyumba Rent',
    'Usafiri Track',
    'Chakula Market',
    'Sauti Voice',
    'Mtandao Mesh',
  ]
  const places = projectNames.map((name, i) => ({
    slug: name.toLowerCase().replace(/ /g, '-') as ProjectSlug,
    name,
    // Her own projects come first: they gather the most work
    own: i < 4,
  }))
  const spaces = ['go', 'devops', 'open-source', 'code-review']
  const kinds: Dimension[] = [
    'review',
    'review',
    'review',
    'review',
    'help',
    'help',
    'oss',
    'oss',
    'mentor',
    'help',
  ]
  return Array.from({ length: 260 }, (_, i): Proof => {
    const other = often(mates)
    const at = daysAgo(1 + Math.floor(random() * 720))
    const base = { id: `wk${i + 1}`, at, demo: true, verified: random() < 0.35 }
    // One proof in twelve is an answer accepted in a community
    if (i % 12 === 0) {
      return {
        ...base,
        who: 'wanjiru',
        by: other,
        dimension: 'help',
        title: 'Réponse acceptée',
        community: often(spaces),
      }
    }
    const place = often(places)
    const dimension = place.own && random() < 0.6 ? 'review' : pick(kinds)
    const pr = 10 + Math.floor(random() * 400)
    // On her own projects, the others mostly help her; elsewhere she helps
    const received = place.own && random() < 0.7
    return {
      ...base,
      who: received ? other : 'wanjiru',
      by: received ? 'wanjiru' : other,
      dimension,
      title: dimension === 'review'
        ? `Review de la PR #${pr}`
        : dimension === 'oss'
        ? `PR #${pr} mergée chez ${place.name}`
        : dimension === 'mentor'
        ? 'Mentorat'
        : 'Aide confirmée',
      project: place.slug,
      projectName: place.name,
      // Demo repos, like those of the other projects of the fixtures
      ...(dimension === 'review' || dimension === 'oss'
        ? {
          pullRequest: pr,
          url: `https://github.com/wanjiru-kamau/${place.slug}/pull/${pr}`,
        }
        : {}),
    }
  })

  function pick<T>(list: T[]) {
    return list[Math.floor(random() * list.length)]
  }
}

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
  .concat(busyProofs())

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
  unit: ['pays différent', 'pays différents'],
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
  /** Key of the badge on the server (§8.2) */
  key: string
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
    plural(missing, badge.unit[0], badge.unit[1])
  } avant le niveau ${level}`
}

type ApiBadge = ApiOutput['GET/api/user/badges'][number]

// Badges read from the server, by login
const serverBadges = new Map<string, ApiBadge[]>()

/** A badge of the server: its levels go from 0 (none) to 4 (Platinum) */
const fromServer = ({ badge, level, count, next }: ApiBadge): Badge => {
  const definition = definitions.find((b) => b.key === badge)!
  return {
    key: badge,
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
    // The countries of the Collaboration Map: people helped or who helped
    linksOf(login).map((link) => personOf(link.login).countryCode)
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
        key: badge.key,
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

/** A badge not started yet, with what unlocks its Bronze level */
export type LockedBadge = {
  key: string
  name: string
  dimension?: Dimension
  hint: string
}

export const lockedBadgesOf = (login: Login): LockedBadge[] => {
  const earned = new Set(badgesOf(login).map((b) => b.key))
  // The badges only the server computes show for a developer it knows
  const all = serverBadges.has(login)
    ? definitions
    : [...badgeDefinitions, crossBorder]
  return all.filter((b) => !earned.has(b.key)).map((badge) => {
    const [first] = badge.thresholds
    return {
      key: badge.key,
      name: badge.name,
      dimension: badge.dimension,
      hint: t`${first} ${
        translate(badge.unit[first > 1 ? 1 : 0])
      } pour le niveau ${translate(levelNames[0])}`,
    }
  })
}

/**
 * The proof that unlocked the current level of a badge of the fixtures: the
 * one that reached its threshold, the proofs taken in the order they were
 * earned. The server counts its own way, so its badges have none.
 */
export const unlockOf = (login: Login, badge: Badge): Proof | undefined => {
  if (badge.level < 0 || !badge.dimension || serverBadges.has(login)) return
  const definition = badgeDefinitions.find((b) => b.key === badge.key)
  if (!definition) return
  const earned = proofsOf(login)
    .filter((p) => p.dimension === badge.dimension)
    .sort((a, b) => a.at - b.at)
  return earned[definition.thresholds[badge.level] - 1]
}

/**
 * The badge to put forward: the highest level that still has one to reach,
 * then the one with the fewest proofs missing.
 */
export const nextBadgeOf = (login: Login): Badge | undefined =>
  badgesOf(login)
    .filter((b) => b.next)
    .sort((a, b) =>
      b.level - a.level || (a.next! - a.count) - (b.next! - b.count)
    )[0]

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
