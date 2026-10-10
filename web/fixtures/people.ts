import { signal } from '@preact/signals'
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
}

export const people = {
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

export type Login = keyof typeof people

// The signed-in developer until the session exists (PAM-110): the same
// record as in `people`, so a change shows everywhere
const myLogin: Login = 'abdou'
export const me = people[myLogin] as Person & { login: Login }

// The 54 countries of Africa offered at onboarding, with their ISO code.
// « Autre » lets anyone else write their own.
export const countries: Record<string, string> = {
  'Afrique du Sud': 'ZA',
  'Algérie': 'DZ',
  'Angola': 'AO',
  'Bénin': 'BJ',
  'Botswana': 'BW',
  'Burkina Faso': 'BF',
  'Burundi': 'BI',
  'Cameroun': 'CM',
  'Cap-Vert': 'CV',
  'Centrafrique': 'CF',
  'Comores': 'KM',
  'Congo': 'CG',
  'Côte d’Ivoire': 'CI',
  'Djibouti': 'DJ',
  'Égypte': 'EG',
  'Érythrée': 'ER',
  'Eswatini': 'SZ',
  'Éthiopie': 'ET',
  'Gabon': 'GA',
  'Gambie': 'GM',
  'Ghana': 'GH',
  'Guinée': 'GN',
  'Guinée équatoriale': 'GQ',
  'Guinée-Bissau': 'GW',
  'Kenya': 'KE',
  'Lesotho': 'LS',
  'Libéria': 'LR',
  'Libye': 'LY',
  'Madagascar': 'MG',
  'Malawi': 'MW',
  'Mali': 'ML',
  'Maroc': 'MA',
  'Maurice': 'MU',
  'Mauritanie': 'MR',
  'Mozambique': 'MZ',
  'Namibie': 'NA',
  'Niger': 'NE',
  'Nigeria': 'NG',
  'Ouganda': 'UG',
  'RD Congo': 'CD',
  'Rwanda': 'RW',
  'Sao Tomé-et-Principe': 'ST',
  'Sénégal': 'SN',
  'Seychelles': 'SC',
  'Sierra Leone': 'SL',
  'Somalie': 'SO',
  'Soudan': 'SD',
  'Soudan du Sud': 'SS',
  'Tanzanie': 'TZ',
  'Tchad': 'TD',
  'Togo': 'TG',
  'Tunisie': 'TN',
  'Zambie': 'ZM',
  'Zimbabwe': 'ZW',
}

export const isMe = (login: string) => login === me.login

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
