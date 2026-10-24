// Controlled vocabularies of the onboarding (§6.1), shared by the server and
// the web: a developer chooses in these lists, never creates an entry.

type Technology = { name: string; aliases?: string[] }

// Technologies; `aliases` are other spellings and GitHub language names
// (lowercase), which point to the same skill through SkillAlias
const technologies: Technology[] = [
  { name: 'Go', aliases: ['golang'] },
  { name: 'TypeScript', aliases: ['ts'] },
  { name: 'JavaScript', aliases: ['js', 'node', 'nodejs'] },
  { name: 'Deno' },
  { name: 'SQLite' },
  { name: 'PostgreSQL', aliases: ['postgres', 'pg', 'plpgsql'] },
  { name: 'SQL', aliases: ['tsql', 'plsql'] },
  { name: 'React', aliases: ['reactjs'] },
  { name: 'Vue', aliases: ['vuejs'] },
  { name: 'Svelte' },
  { name: 'HTML' },
  { name: 'CSS', aliases: ['scss', 'sass', 'less'] },
  { name: 'UI' },
  { name: 'Python', aliases: ['jupyter notebook'] },
  { name: 'Java' },
  { name: 'Kotlin' },
  { name: 'Swift' },
  { name: 'Flutter' },
  { name: 'Dart' },
  { name: 'C' },
  { name: 'C++', aliases: ['cpp'] },
  { name: 'C#', aliases: ['csharp'] },
  { name: 'PHP' },
  { name: 'Ruby' },
  { name: 'Rust' },
  { name: 'Elixir' },
  { name: 'Solidity' },
  { name: 'Shell', aliases: ['bash', 'powershell'] },
  { name: 'Docker', aliases: ['dockerfile'] },
  { name: 'Kubernetes', aliases: ['k8s'] },
  { name: 'Terraform', aliases: ['hcl'] },
  { name: 'CI' },
  { name: 'Security' },
  { name: 'Concurrency' },
  { name: 'Backend' },
  { name: 'Code review' },
]

// Domains of the onboarding (§6.1)
export const domains = [
  'Backend',
  'Frontend',
  'Mobile',
  'DevOps',
  'Cloud',
  'IA / ML',
  'Blockchain',
  'Data',
  'Cybersécurité',
  'Jeu vidéo',
  'UI Engineering',
]

export const skills = technologies.map((t) => t.name)

// The only list of intents: shown on developer cards, filtered in Explore,
// used by the matching (§6.1)
export const intents = [
  'Trouver des projets',
  'Trouver des contributeurs',
  'Faire des reviews',
  'Recevoir des reviews',
  'Aider des développeurs',
  'Contribuer à l’open source',
  'Mentorer',
  'Trouver un mentor',
  'Construire des projets',
  'Trouver des collaborateurs',
]

// Matching modes (§7.4): stored value and label
export const matchingModes = {
  instant: 'Instantané',
  digest: 'Résumé quotidien',
  off: 'Désactivé',
} as const
export type MatchingMode = keyof typeof matchingModes

// Help requests (§7.1): the stored type and its label, the level expected,
// and the durations offered, in minutes
export const helpCategories = {
  code_review: 'Review de code',
  debugging: 'Debug',
  architecture: 'Architecture',
  security: 'Sécurité',
  testing: 'Tests',
  devops: 'DevOps',
  ui_ux: 'UI/UX',
  documentation: 'Documentation',
  pair_programming: 'Pair programming',
  mentorship: 'Mentorat',
  contributor_search: 'Recherche de contributeur',
} as const
export type HelpCategory = keyof typeof helpCategories

export const helpLevels = {
  beginner: 'Débutant',
  intermediate: 'Intermédiaire',
  intermediate_plus: 'Intermédiaire+',
  senior: 'Confirmé',
} as const
export type HelpLevel = keyof typeof helpLevels

export const helpDurations = [20, 30, 60, 120]

// Why a content is reported (§10.5)
export const reportReasons = {
  spam: 'Spam',
  harassment: 'Harcèlement',
  inappropriate: 'Contenu inapproprié',
  impersonation: 'Usurpation',
  reputation_fraud: 'Triche à la réputation',
  other: 'Autre',
} as const
export type ReportReason = keyof typeof reportReasons

/** The stored key of a label shown in the app */
export const keyOf = <K extends string>(
  labels: Record<K, string>,
  label: string,
) => (Object.keys(labels) as K[]).find((key) => labels[key] === label)

/** The stored mode of a label shown in the app */
export const matchingModeOf = (label: string) =>
  (Object.keys(matchingModes) as MatchingMode[])
    .find((key) => matchingModes[key] === label) ?? 'instant'

export const slugOf = (name: string) =>
  name.toLowerCase().replace('++', 'pp').replace('#', 'sharp')
    .normalize('NFD').replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '')

/** Every skill of the vocabulary, with its category and its aliases */
export const vocabulary = [
  ...technologies.map((t) => ({
    slug: slugOf(t.name),
    name: t.name,
    category: 'technology',
    aliases: [t.name.toLowerCase(), ...(t.aliases ?? [])],
  })),
  ...domains.map((name) => ({
    slug: `domain-${slugOf(name)}`,
    name,
    category: 'domain',
    aliases: [] as string[],
  })),
]

// The 54 countries of Africa offered at onboarding: ISO code, French name
// shown in the app, English name GitHub profiles often use
export const countries: [code: string, fr: string, en: string][] = [
  ['ZA', 'Afrique du Sud', 'South Africa'],
  ['DZ', 'Algérie', 'Algeria'],
  ['AO', 'Angola', 'Angola'],
  ['BJ', 'Bénin', 'Benin'],
  ['BW', 'Botswana', 'Botswana'],
  ['BF', 'Burkina Faso', 'Burkina Faso'],
  ['BI', 'Burundi', 'Burundi'],
  ['CM', 'Cameroun', 'Cameroon'],
  ['CV', 'Cap-Vert', 'Cape Verde'],
  ['CF', 'Centrafrique', 'Central African Republic'],
  ['KM', 'Comores', 'Comoros'],
  ['CG', 'Congo', 'Republic of the Congo'],
  ['CI', 'Côte d’Ivoire', 'Ivory Coast'],
  ['DJ', 'Djibouti', 'Djibouti'],
  ['EG', 'Égypte', 'Egypt'],
  ['ER', 'Érythrée', 'Eritrea'],
  ['SZ', 'Eswatini', 'Eswatini'],
  ['ET', 'Éthiopie', 'Ethiopia'],
  ['GA', 'Gabon', 'Gabon'],
  ['GM', 'Gambie', 'Gambia'],
  ['GH', 'Ghana', 'Ghana'],
  ['GN', 'Guinée', 'Guinea'],
  ['GQ', 'Guinée équatoriale', 'Equatorial Guinea'],
  ['GW', 'Guinée-Bissau', 'Guinea-Bissau'],
  ['KE', 'Kenya', 'Kenya'],
  ['LS', 'Lesotho', 'Lesotho'],
  ['LR', 'Libéria', 'Liberia'],
  ['LY', 'Libye', 'Libya'],
  ['MG', 'Madagascar', 'Madagascar'],
  ['MW', 'Malawi', 'Malawi'],
  ['ML', 'Mali', 'Mali'],
  ['MA', 'Maroc', 'Morocco'],
  ['MU', 'Maurice', 'Mauritius'],
  ['MR', 'Mauritanie', 'Mauritania'],
  ['MZ', 'Mozambique', 'Mozambique'],
  ['NA', 'Namibie', 'Namibia'],
  ['NE', 'Niger', 'Niger'],
  ['NG', 'Nigeria', 'Nigeria'],
  ['UG', 'Ouganda', 'Uganda'],
  ['CD', 'RD Congo', 'DR Congo'],
  ['RW', 'Rwanda', 'Rwanda'],
  ['ST', 'Sao Tomé-et-Principe', 'Sao Tome and Principe'],
  ['SN', 'Sénégal', 'Senegal'],
  ['SC', 'Seychelles', 'Seychelles'],
  ['SL', 'Sierra Leone', 'Sierra Leone'],
  ['SO', 'Somalie', 'Somalia'],
  ['SD', 'Soudan', 'Sudan'],
  ['SS', 'Soudan du Sud', 'South Sudan'],
  ['TZ', 'Tanzanie', 'Tanzania'],
  ['TD', 'Tchad', 'Chad'],
  ['TG', 'Togo', 'Togo'],
  ['TN', 'Tunisie', 'Tunisia'],
  ['ZM', 'Zambie', 'Zambia'],
  ['ZW', 'Zimbabwe', 'Zimbabwe'],
]

const plain = (text: string) =>
  text.normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/’/g, "'")
    .toLowerCase().trim()

// Other names GitHub profiles use for a country
const countryAliases: Record<string, string> = {
  "cote d'ivoire": 'CI',
  'drc': 'CD',
  'democratic republic of the congo': 'CD',
  'congo-kinshasa': 'CD',
  'congo-brazzaville': 'CG',
  'cabo verde': 'CV',
  'swaziland': 'SZ',
  'the gambia': 'GM',
}

const countryByName = new Map<string, string>([
  ...countries.flatMap(([code, fr, en]) =>
    [[plain(fr), code], [plain(en), code]] as [string, string][]
  ),
  ...Object.entries(countryAliases),
])

/** ISO code of an African country named in French or English */
export const countryCodeOf = (name: string) => countryByName.get(plain(name))

/** French name of a country code; another country stays as written */
export const countryName = (country: string) =>
  countries.find(([code]) => code === country)?.[1] ?? country

/**
 * Reads the free-text location of a GitHub profile: « Dakar, Senegal » gives
 * the city and the country code; an unknown country stays as written.
 */
export const parseLocation = (location: string | null | undefined) => {
  const parts = (location ?? '').split(/[,/·|]/).map((p) => p.trim())
    .filter(Boolean)
  if (!parts.length) return { city: null, country: null }
  const code = countryCodeOf(parts.at(-1)!)
  if (code) {
    return { city: parts.length > 1 ? parts[0] : null, country: code }
  }
  if (parts.length === 1) return { city: parts[0], country: null }
  return { city: parts[0], country: parts.at(-1)! }
}
