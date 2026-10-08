import { logActivity } from '/web/fixtures/activity.ts'
import { boards } from '/web/fixtures/board.ts'
import { postAlert } from '/web/fixtures/channels.ts'
import { issues } from '/web/fixtures/issues.ts'
import { daysAgo } from '/web/fixtures/clock.ts'
import { me } from '/web/fixtures/people.ts'
import {
  type Project,
  projects,
  projectsChanged,
  type ProjectSlug,
} from '/web/fixtures/projects.ts'

// Public repos of the signed-in developer, what GET/api/github/repos will
// list from GitHub (§5.2), and the import or creation of a project

export type Repo = {
  owner: string
  name: string
  description: string
  languages: [string, number][]
  stars: number
  updated: string
  /** Already a Pamoja project */
  existing?: ProjectSlug
  title?: string
  contributors?: number
  issues?: number
  pullRequests?: number
  readme?: string
  release?: string
  releasedAt?: number
  /** Skills and needs the AI reads from the repo (§11) */
  skills?: string[]
  extraSkills?: string[]
  needs?: string[]
  issueList?: [string, string[]][]
}

export const repos: Repo[] = [
  {
    owner: 'abdou',
    name: 'openpay-africa',
    existing: 'openpay-africa',
    description:
      'API de paiement mobile ouverte pour les marchands d’Afrique de l’Ouest.',
    languages: [['Go', 68], ['TypeScript', 17], ['SQL', 10]],
    stars: 214,
    updated: 'il y a 2 h',
  },
  {
    owner: 'abdou',
    name: 'wave-sdk-go',
    title: 'Wave SDK Go',
    description: 'SDK Go non officiel pour l’API marchands de Wave.',
    languages: [['Go', 94], ['Makefile', 6]],
    stars: 41,
    updated: 'il y a 3 j',
    contributors: 3,
    issues: 4,
    pullRequests: 1,
    release: 'v0.2.1',
    releasedAt: daysAgo(3),
    readme:
      'Client Go typé pour l’API Wave : paiements, remboursements et webhooks signés. Utilisé en production par OpenPay Africa.',
    skills: ['Go', 'Backend'],
    extraSkills: ['Security'],
    needs: ['Tests', 'Documentation'],
    issueList: [
      ['Paginer la liste des transactions', ['enhancement']],
      [
        'Exemples pour les webhooks signés',
        ['good first issue', 'documentation'],
      ],
    ],
  },
  {
    owner: 'abdou',
    name: 'xof',
    title: 'XOF',
    description:
      'Formatage, arrondis et conversion des montants en francs CFA.',
    languages: [['TypeScript', 100]],
    stars: 18,
    updated: 'il y a 2 sem.',
    contributors: 1,
    issues: 2,
    pullRequests: 0,
    release: 'v1.0.0',
    releasedAt: daysAgo(9),
    readme:
      'Petite bibliothèque Deno pour afficher et arrondir les montants XOF et XAF sans surprise.',
    skills: ['TypeScript', 'Deno'],
    extraSkills: [],
    needs: ['Review de code', 'Tests'],
    issueList: [['Gérer les montants négatifs', ['bug']]],
  },
]

const slugify = (name: string) =>
  name.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase()
    .replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '') || 'projet'

export type ProjectDraft = {
  name: string
  description: string
  vision?: string
  stack: string[]
  needs: string[]
  visibility?: 'Public' | 'Privé'
  repo?: Repo
}

/**
 * POST/api/project/import or POST/api/project/create: the project starts
 * with the developer as owner, an empty board and a first milestone.
 */
export const createProject = (draft: ProjectDraft): ProjectSlug => {
  const all = projects as Record<string, Project>
  const base = draft.repo?.name ?? slugify(draft.name)
  let slug = base
  for (let k = 2; all[slug]; k++) slug = `${base}-${k}`
  const repo = draft.repo
  all[slug] = {
    slug,
    name: draft.name,
    owner: me.login,
    stack: draft.stack,
    sync: repo ? 'poll' : 'none',
    description: draft.description,
    vision: draft.vision,
    contributors: repo?.contributors ?? 1,
    openIssues: repo?.issues ?? 0,
    release: repo?.release ?? '—',
    releasedAt: repo?.releasedAt ?? Date.now(),
    members: [{ login: me.login, role: 'Propriétaire' }],
    followers: [],
    needs: draft.needs,
    blockers: [],
    stage: 'Idée',
    activity: 'Calme',
    milestones: [{
      title: 'Première version',
      description: 'Premières tâches du board',
      done: 0,
      total: 5,
      state: 'active',
      date: 'à planifier',
    }],
    gallery: [],
    events: [],
    demo: false,
  }
  const key = slug as ProjectSlug
  boards[key] = []
  if (repo) {
    repo.existing = key
    repo.issueList?.forEach(([title, labels], i) =>
      issues.push({
        number: i + 1,
        project: key,
        title,
        labels,
        author: me.login,
        comments: 0,
        state: 'open',
        at: daysAgo(i + 1),
        demo: false,
      })
    )
    postAlert(
      key,
      'import',
      `Projet importé depuis GitHub : ${repo.owner}/${repo.name} · ${repo.issues} issues · ${repo.pullRequests} PR. Synchro toutes les 15 min.`,
    )
  }
  logActivity(
    key,
    repo ? 'Projet importé depuis GitHub' : 'Projet créé sur Pamoja',
  )
  projectsChanged.value++
  return key
}
