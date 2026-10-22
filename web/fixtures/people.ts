import { signal } from '@preact/signals'
import {
  countries as vocabularyCountries,
  countryName,
  helpCategories,
  type HelpCategory,
} from '/api/vocabulary.ts'
import type { ApiOutput } from '/web/lib/api.ts'
import { translate } from '/web/lib/language.ts'
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
    | 'displayName'
    | 'avatarUrl'
    | 'headline'
    | 'bio'
    | 'country'
    | 'city'
    | 'website'
    | 'skills'
    | 'domains'
    | 'intents'
  >
  & Partial<{ available: boolean; helpTypes: string[]; communities: string[] }>

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
      role: user.domains[0] ?? 'Développeur',
      skills: user.skills.map((skill) => skill.name),
      headline: user.headline,
      bio: user.bio,
      website: user.website || undefined,
      domains: user.domains,
      intents: user.intents,
      avatarUrl: user.avatarUrl,
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

/** « Dakar, Sénégal », or what is known of it */
export const placeOf = (person: Person) =>
  [person.city, translate(person.country)].filter(Boolean).join(', ')

/** A website as written on a profile, with or without its protocol */
export const websiteHref = (website: string) =>
  /^https?:\/\//.test(website) ? website : `https://${website}`

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

// Session changes until POST/api/follow/toggle exists (PAM-505)
export const peopleChanged = signal(0)

/** Follow or unfollow a developer: their posts and reposts reach the feed */
export const toggleFollowing = (login: string) => {
  const follows = me.follows ?? []
  me.follows = follows.includes(login)
    ? follows.filter((l) => l !== login)
    : [...follows, login]
  peopleChanged.value++
}
