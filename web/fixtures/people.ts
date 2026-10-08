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
  confirmedHelps: number
  /** Shown in « Pourquoi ce match ? » when available */
  openTo?: string
  promising?: boolean
  moderator?: boolean
  communities: string[]
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
    confirmedHelps: 3,
    communities: ['go', 'senegal-developers', 'open-source'],
    intents: ['Cherche des contributeurs', 'Ouvert aux reviews'],
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
    confirmedHelps: 14,
    openTo: 'Ouvert aux reviews',
    communities: ['go', 'code-review', 'cote-divoire-developers'],
    intents: ['Ouvert aux reviews', 'Mentorat'],
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
    confirmedHelps: 5,
    communities: ['react', 'senegal-developers', 'open-source'],
    intents: ['Cherche des contributeurs', 'Mentorat'],
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
    confirmedHelps: 4,
    communities: ['senegal-developers'],
    intents: ['Cherche un projet'],
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
    confirmedHelps: 1,
    promising: true,
    communities: ['devops', 'cameroon-developers'],
    intents: ['Cherche un projet', 'Ouvert aux reviews'],
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
    confirmedHelps: 2,
    communities: ['open-source'],
    intents: ['Cherche des contributeurs'],
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
    confirmedHelps: 0,
    communities: ['cote-divoire-developers'],
    intents: ['Cherche un projet', 'Cherche un mentor'],
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
    confirmedHelps: 6,
    moderator: true,
    communities: ['go'],
    intents: ['Ouvert aux reviews', 'Mentorat'],
  },
} satisfies Record<string, Person>

export type Login = keyof typeof people

// The signed-in developer until the session exists (PAM-110)
const myLogin: Login = 'abdou'
export const me: Person & { login: Login } = {
  ...people[myLogin],
  login: myLogin,
}

export const isMe = (login: string) => login === me.login
