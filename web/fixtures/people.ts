import { signal } from '@preact/signals'
import {
  countries as vocabularyCountries,
  countryName,
  helpCategories,
  type HelpCategory,
} from '/api/vocabulary.ts'
import type { ApiOutput } from '/web/lib/api.ts'
import { translate } from '/web/lib/language.ts'
import type { Media } from '/web/lib/messages.ts'
import { webHref } from '/web/lib/member-links.ts'
export type Person = {
  login: string
  name: string
  country: string
  countryCode: string
  city: string
  role: string
  skills: string[]
  headline: string
  bio: string
  website?: string
  helpTypes: string[]
  available: boolean
  /** Shown in « Pourquoi ce match ? » when available */
  openTo?: string
  promising?: boolean
  moderator?: boolean
  /** Suspended 7 days by a moderator */
  suspended?: boolean
  /** Hidden from search by a moderator */
  hiddenFromSearch?: boolean
  communities: string[]
  /** Domains and intents of the onboarding, from the vocabularies (§6.1) */
  domains?: string[]
  intents: string[]
  follows?: string[]
  /** GitHub photo; without it, the initials (§17.3) */
  avatarUrl?: string
  /** The photo of the cover, when one was uploaded (§9.2) */
  cover?: Media[]
  /** Login on GitHub when it differs from the one of Pamoja (§14) */
  github?: string
  /**
   * The GitHub account, read from the API: a link to write to someone
   * carries it, never the login, which can change (PAM-125)
   */
  githubId?: number
}

const fixturePeople = {
  abdou: {
    login: 'abdou',
    name: 'Abdou Sow',
    country: 'Sénégal',
    countryCode: 'SN',
    city: 'Dakar',
    role: 'Ingénieur backend',
    skills: ['Go', 'TypeScript', 'Deno', 'SQLite'],
    headline:
      'Je construis OpenPay Africa, des paiements ouverts pour l’Afrique de l’Ouest.',
    bio:
      'Ingénieur backend à Dakar. Je construis des outils de paiement ouverts parce que le code écrit en Afrique mérite d’être vu.',
    website: 'abdousow.dev',
    helpTypes: ['Review de code', 'Architecture', 'Debug'],
    available: true,
    communities: ['go', 'senegal-developers', 'open-source'],
    intents: ['Trouver des contributeurs', 'Faire des reviews'],
    follows: ['moussa', 'awa', 'fatou'],
  },
  moussa: {
    login: 'moussa',
    name: 'Moussa Diallo',
    country: 'Côte d’Ivoire',
    countryCode: 'CI',
    city: 'Abidjan',
    role: 'Développeur backend',
    skills: ['Go', 'SQLite', 'Backend', 'Code review'],
    headline: 'Backend Go, j’aime les reviews qui font grandir.',
    bio:
      'Backend Go à Abidjan. Je relis du code presque tous les jours, et j’aime quand une review fait grandir quelqu’un.',
    website: 'moussa.dev',
    helpTypes: ['Review de code', 'Debug', 'Architecture'],
    available: true,
    openTo: 'Faire des reviews',
    communities: ['go', 'code-review', 'cote-divoire-developers'],
    intents: ['Faire des reviews', 'Mentorer'],
  },
  awa: {
    login: 'awa',
    name: 'Awa Diop',
    country: 'Sénégal',
    countryCode: 'SN',
    city: 'Thiès',
    role: 'Ingénieure frontend',
    skills: ['React', 'TypeScript', 'UI'],
    headline: 'Je cartographie le Sénégal en open data.',
    bio:
      'Frontend à Thiès. Je maintiens Senegal Maps et j’accueille volontiers les premières contributions.',
    website: 'awadiop.sn',
    helpTypes: ['UI/UX', 'Review de code'],
    available: true,
    communities: ['react', 'senegal-developers', 'open-source'],
    intents: ['Trouver des contributeurs', 'Mentorer'],
  },
  fatou: {
    login: 'fatou',
    name: 'Fatou Ndiaye',
    country: 'Sénégal',
    countryCode: 'SN',
    city: 'Dakar',
    role: 'Full-stack',
    skills: ['TypeScript', 'PostgreSQL'],
    headline: 'Full-stack, transports et paiements.',
    bio: 'Full-stack à Dakar, entre transports publics et paiements.',
    helpTypes: ['Review de code', 'Tests'],
    available: false,
    communities: ['senegal-developers'],
    intents: ['Trouver des projets'],
  },
  amina: {
    login: 'amina',
    name: 'Amina Tchoupo',
    country: 'Cameroun',
    countryCode: 'CM',
    city: 'Douala',
    role: 'DevOps',
    skills: ['Docker', 'Kubernetes', 'CI'],
    headline: 'DevOps, pipelines et conteneurs.',
    bio:
      'DevOps à Douala. Pipelines, conteneurs, et l’envie d’aider sur des projets open source.',
    helpTypes: ['DevOps', 'Debug'],
    available: true,
    promising: true,
    communities: ['devops', 'cameroon-developers'],
    intents: ['Trouver des projets', 'Faire des reviews'],
  },
  kofi: {
    login: 'kofi',
    name: 'Kofi Mensah',
    country: 'Ghana',
    countryCode: 'GH',
    city: 'Accra',
    role: 'Mobile',
    skills: ['Flutter', 'Dart'],
    headline: 'Apps mobiles pour le commerce de rue.',
    bio: 'Développeur mobile à Accra, Flutter avant tout.',
    helpTypes: ['UI/UX'],
    available: true,
    communities: ['open-source'],
    intents: ['Trouver des contributeurs'],
  },
  yao: {
    login: 'yao',
    name: 'Yao Koffi',
    country: 'Côte d’Ivoire',
    countryCode: 'CI',
    city: 'Yamoussoukro',
    role: 'Data',
    skills: ['Python', 'SQL'],
    headline: 'Nouveau sur Pamoja, data et SQL.',
    bio:
      'Data à Yamoussoukro. Je découvre Pamoja et je cherche un premier projet.',
    helpTypes: [],
    available: true,
    communities: ['cote-divoire-developers'],
    intents: ['Trouver des projets', 'Trouver un mentor'],
  },
  zeinab: {
    login: 'zeinab',
    name: 'Zeinab Sylla',
    country: 'Guinée',
    countryCode: 'GN',
    city: 'Conakry',
    role: 'Security',
    skills: ['Security', 'Go'],
    headline: 'Sécurité applicative, modératrice de la communauté Go.',
    bio: 'Sécurité applicative à Conakry. Modératrice de la communauté Go.',
    helpTypes: ['Sécurité', 'Review de code'],
    available: true,
    moderator: true,
    communities: ['go'],
    intents: ['Faire des reviews', 'Mentorer'],
  },
  // A very active developer, to see the profile at the scale of a social
  // network (her proofs are generated in web/fixtures/reputation.ts)
  wanjiru: {
    login: 'wanjiru',
    name: 'Wanjiru Kamau',
    country: 'Kenya',
    countryCode: 'KE',
    city: 'Nairobi',
    role: 'Backend & DevOps',
    skills: ['Go', 'Kubernetes', 'PostgreSQL'],
    headline: 'Backend et DevOps, je relis du code dans tout le continent.',
    bio:
      'Backend et DevOps à Nairobi. Mainteneuse de plusieurs projets open source, je fais des reviews et du mentorat chaque semaine.',
    helpTypes: ['Review de code', 'Debug', 'Mentorat'],
    available: true,
    communities: ['go', 'devops', 'open-source', 'code-review'],
    intents: ['Faire des reviews', 'Mentorer', 'Contribuer en open source'],
  },
} satisfies Record<string, Person>

export type Login = keyof typeof fixturePeople
export const people: Record<Login, Person> = fixturePeople

// The signed-in developer: `abdou` of the fixtures until the session is
// known, then the real developer, with the profile prefilled from GitHub.
// The same record as in `people`, so a change shows everywhere. Another
// developer joins `people` once their profile is read (GET/api/user).
export let me = people.abdou as Person & { login: Login }

type ApiPerson =
  & Pick<
    ApiOutput['GET/api/user/me'],
    | 'login'
    | 'githubLogin'
    | 'displayName'
    | 'avatarUrl'
    | 'cover'
    | 'headline'
    | 'bio'
    | 'country'
    | 'city'
    | 'website'
    | 'skills'
    | 'domains'
    | 'intents'
  >
  & Partial<
    {
      available: boolean
      helpTypes: string[]
      communities: string[]
      githubId: number
    }
  >

/**
 * A developer read from the API joins `people`, or updates the record of
 * the pages: what only the pages know (follows, openTo…) is kept
 */
const adoptPerson = (user: ApiPerson) => {
  const known = (people as Record<string, Person>)[user.login]
  const person: Person = Object.assign(
    known ?? {
      helpTypes: [],
      available: true,
      communities: [],
      follows: [],
    },
    {
      login: user.login,
      name: user.displayName,
      country: countryName(user.country),
      countryCode: vocabularyCountries.some(([code]) => code === user.country)
        ? user.country
        : '',
      city: user.city,
      // Without a domain on the server, the role the pages know (QA-28)
      role: user.domains[0] ?? known?.role ?? 'Développeur',
      skills: user.skills.map((skill) => skill.name),
      headline: user.headline,
      bio: user.bio,
      website: user.website || undefined,
      domains: user.domains,
      intents: user.intents,
      avatarUrl: user.avatarUrl,
      cover: user.cover,
      github: user.githubLogin,
    },
    user.available === undefined ? {} : { available: user.available },
    user.helpTypes
      ? {
        helpTypes: user.helpTypes.map((key) =>
          helpCategories[key as HelpCategory] ?? key
        ),
      }
      : {},
    user.communities ? { communities: user.communities } : {},
    user.githubId ? { githubId: user.githubId } : {},
  )
  ;(people as Record<string, Person>)[user.login] = person
  peopleChanged.value++
  return person
}

/** Makes the signed-in developer `me`, from GET/api/user/me */
export const adoptUser = (user: ApiOutput['GET/api/user/me']) => {
  me = adoptPerson(user) as Person & { login: Login }
  peopleChanged.value++
}

/** A profile read from GET/api/user */
export const adoptProfile = (user: ApiOutput['GET/api/user']) =>
  adoptPerson(user)

/**
 * Developers read from the server for Explore (§10.3), added to the ones the
 * page knows; a fixture or an already-adopted profile, richer, is kept
 */
export const adoptDevelopers = (
  list: ApiOutput['GET/api/explore/developers'],
) => {
  const map = people as Record<string, Person>
  for (const dev of list) {
    if (map[dev.login]) continue
    map[dev.login] = {
      login: dev.login,
      name: dev.name,
      country: dev.country,
      countryCode: '',
      city: dev.city,
      role: '',
      skills: dev.skills,
      headline: dev.headline,
      bio: '',
      helpTypes: [],
      available: dev.available,
      communities: [],
      intents: dev.intents,
    }
  }
  peopleChanged.value++
}

/** « Dakar, Sénégal », or what is known of it */
export const placeOf = (person: Person) =>
  [person.city, translate(person.country)].filter(Boolean).join(', ')

/** A website as written on a profile, with or without its protocol */
export const websiteHref = (website: string) =>
  webHref(/^https?:\/\//i.test(website) ? website : `https://${website}`)

export const websiteLabel = (website: string) =>
  website.replace(/^https?:\/\//, '').replace(/\/$/, '')

// The 54 countries of Africa offered at onboarding, with their ISO code.
// « Autre » lets anyone else write their own.
export const countries: Record<string, string> = Object.fromEntries(
  vocabularyCountries.map(([code, name]) => [name, code]),
)

export const isMe = (login: string) => login === me.login

/**
 * Name of a developer; an author read from GitHub who is not on Pamoja keeps
 * their GitHub login
 */
export const nameOf = (login: string) => personOf(login).name

// Developers the API named without their profile (the person helped by a
// proof): their name and country, until GET/api/user reads them (PAM-301)
const heard = new Map<string, { name: string; countryCode: string }>()

/** Remembers the name and country the API gave for a developer */
export const hearOf = (login: string, name: string, countryCode: string) =>
  heard.set(login, { name: name || login, countryCode })

/** A developer of the pages; one read from the API alone is known by login */
export const personOf = (login: string): Person =>
  (people as Record<string, Person>)[login] ?? {
    login,
    name: heard.get(login)?.name ?? login,
    country: countryName(heard.get(login)?.countryCode ?? ''),
    countryCode: heard.get(login)?.countryCode ?? '',
    city: '',
    role: 'Développeur',
    skills: [],
    headline: '',
    bio: '',
    helpTypes: [],
    available: false,
    communities: [],
    intents: [],
  }

// Changes of the people the pages read: a follow, a profile read
export const peopleChanged = signal(0)

/** Whether the developer follows someone, as the page shows it */
export const isFollowing = (login: string) => (me.follows ?? []).includes(login)

/** Sets a follow of a developer: their posts and reposts reach the feed */
export const setFollowing = (login: string, follow: boolean) => {
  const others = (me.follows ?? []).filter((l) => l !== login)
  me.follows = follow ? [...others, login] : others
  peopleChanged.value++
}

/** The developers followed, as the server holds them (GET/api/follows) */
export const adoptFollowing = (logins: string[]) => {
  me.follows = [...logins]
  peopleChanged.value++
}
