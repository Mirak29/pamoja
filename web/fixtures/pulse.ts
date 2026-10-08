import { issues } from '/web/fixtures/issues.ts'
import type { Project } from '/web/fixtures/projects.ts'
import { pullRequests } from '/web/fixtures/pull-requests.ts'

// What GET/api/project/pulse, health and story will return (PAM-306 to
// PAM-308), computed here from the fixtures

type Weekly = {
  merged: number
  issuesClosed: number
  newContributors: number
  reviewsAsked: number
  releases: number
}

const weekly: Partial<Record<string, Weekly>> = {
  'openpay-africa': {
    merged: 6,
    issuesClosed: 4,
    newContributors: 2,
    reviewsAsked: 5,
    releases: 0,
  },
}

const quietWeek: Weekly = {
  merged: 2,
  issuesClosed: 1,
  newContributors: 0,
  reviewsAsked: 1,
  releases: 0,
}

const languages: Partial<Record<string, [string, number][]>> = {
  'openpay-africa': [['Go', 68], ['TypeScript', 17], ['SQL', 10], [
    'Shell',
    5,
  ]],
}

const domains: Partial<Record<string, string[]>> = {
  'openpay-africa': ['Backend', 'Testing', 'DevOps', 'Documentation'],
}

const stories: Partial<Record<string, [string, string][]>> = {
  'openpay-africa': [
    ['mars 2026', 'Création du projet par Abdou'],
    ['avril 2026', 'Premier contributeur : Fatou'],
    [
      'sept. 2026',
      'Première collaboration transfrontalière : Moussa, depuis Abidjan, relit la PR #62',
    ],
    ['sept. 2026', 'Release v0.3 : Wave et Orange Money en sandbox'],
    ['oct. 2026', '12 contributeurs'],
  ],
}

// AI summaries are stored, never computed while a page displays (§11)
const summaries: Partial<Record<string, string>> = {
  'openpay-africa':
    'Le développement est actif : 6 PRs mergées cette semaine. Le principal goulot est la review : 3 PRs attendent un regard extérieur. Un bloqueur reste ouvert : l’issue #44 sur le verrou SQLite empêche de tester la charge. Le projet a surtout besoin de reviewers Go et de tests.',
  'senegal-maps':
    'Le développement est actif : 2 PRs mergées cette semaine. Le principal goulot est la review : 1 PR attend un regard extérieur. Le projet a surtout besoin de reviewers Go et de tests.',
  'dakar-transit':
    'Semaine calme : 2 PRs mergées et aucune PR en attente de review. Le projet cherche un développeur backend pour les horaires.',
  africommerce:
    'Semaine calme : 2 PRs mergées et aucune PR en attente de review. Le projet a surtout besoin de documentation.',
}

export type Tone = 'ok' | 'warning' | 'danger'

export type HealthIndicator = {
  label: string
  value: string
  state: string
  rule: string
  tone: Tone
}

export const projectPulse = (project: Project) => {
  const open = pullRequests.filter((pr) =>
    pr.project === project.slug && pr.state === 'open'
  )
  const waiting = open.filter((pr) => pr.review === 'waiting').length
  const ciFailed = open.some((pr) => pr.ci === 'failed')
  const blockers = issues.filter((issue) =>
    issue.project === project.slug && issue.state === 'open' &&
    issue.labels.includes('blocked')
  )
  const week = weekly[project.slug] ?? quietWeek

  const health: HealthIndicator[] = [
    {
      label: 'Délai de première review',
      value: waiting ? '31 h' : '9 h',
      state: waiting ? 'Attention' : 'Bon',
      rule:
        'Moyenne sur 7 jours entre l’ouverture d’une PR et sa première review. Attention au-delà de 24 h.',
      tone: waiting ? 'warning' : 'ok',
    },
    {
      label: 'CI sur 7 jours',
      value: ciFailed ? '86 %' : '94 %',
      state: ciFailed ? 'Attention' : 'Bon',
      rule: 'Part des runs CI réussis sur 7 jours. Bon au-dessus de 90 %.',
      tone: ciFailed ? 'warning' : 'ok',
    },
    {
      label: 'Bus factor',
      value: '2',
      state: 'Fragile',
      rule:
        'Nombre de personnes qui ont mergé 80 % des PRs sur 90 jours. Fragile en dessous de 3.',
      tone: 'warning',
    },
    {
      label: 'Bloqueurs ouverts',
      value: String(blockers.length),
      state: blockers.length ? 'À traiter' : 'Aucun',
      rule: 'Issues ouvertes avec le label blocked.',
      tone: blockers.length ? 'danger' : 'ok',
    },
    {
      label: 'Accueil des nouveaux',
      value: '3 good first issue',
      state: 'Bon',
      rule: 'Bon si au moins 2 issues good first issue sont ouvertes.',
      tone: 'ok',
    },
  ]

  return {
    // AI summary, absent while it is computed (PULSE_READY, PAM-307)
    summary: summaries[project.slug],
    metrics: [
      { label: 'PRs mergées', value: week.merged },
      { label: 'Issues fermées', value: week.issuesClosed },
      { label: 'Contributeurs arrivés', value: week.newContributors },
      { label: 'Reviews demandées', value: week.reviewsAsked },
      { label: 'PRs en attente de review', value: waiting, warning: !!waiting },
      { label: 'Releases', value: week.releases },
    ],
    blockers,
    health,
    languages: languages[project.slug] ??
      project.stack.map((skill, i): [string, number] => [skill, i ? 30 : 70]),
    domains: domains[project.slug] ?? ['Backend'],
    story: stories[project.slug] ?? [],
  }
}

export type Pulse = ReturnType<typeof projectPulse>
