import { logActivity } from '/web/fixtures/activity.ts'
import { boards } from '/web/fixtures/board.ts'
import { postAlert } from '/web/fixtures/channels.ts'
import { type PullRequest, pullRequests } from '/web/fixtures/pull-requests.ts'
import { counted } from '/web/lib/plural.ts'
import { issues } from '/web/fixtures/issues.ts'
import { daysAgo } from '/web/fixtures/clock.ts'
import { type Login, me } from '/web/fixtures/people.ts'
import { api, type ApiOutput } from '/web/lib/api.ts'
import { signal } from '@preact/signals'
import type { Issue } from '/web/fixtures/issues.ts'
import {
  type Project,
  type ProjectRole,
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
  /** Open PRs: title and branch */
  pullList?: [string, string][]
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
    issues: 2,
    pullRequests: 1,
    release: 'v0.2.1',
    releasedAt: daysAgo(3),
    readme:
      'Client Go typé pour l’API Wave : paiements, remboursements et webhooks signés. Utilisé en production par OpenPay Africa.',
    skills: ['Go', 'Backend'],
    extraSkills: ['Security'],
    needs: ['Tests', 'Documentation'],
    pullList: [['Remboursements partiels', 'feat/partial-refund']],
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
    issues: 1,
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
  name.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase()
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
 * with the developer as owner, the repo's issues and PRs, an empty board and
 * no milestone until the owner plans one.
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
    repo: repo?.name,
    languages: repo?.languages,
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
    milestones: [],
    gallery: [],
    events: [],
    demo: false,
  }
  const key = slug as ProjectSlug
  boards[key] = []
  if (repo) bringRepo(key, repo)
  logActivity(
    key,
    repo ? 'Projet importé depuis GitHub' : 'Projet créé sur Pamoja',
  )
  projectsChanged.value++
  return key
}

/** Public repos of the developer that are not on Pamoja yet (§5.4) */
export const importableRepos = () =>
  repos.filter((repo) => repo.owner === me.login && !repo.existing)

/**
 * Link a repo to a project created without one: it gets the repo's issues,
 * PRs and languages, and the sync every 15 min (§5.4)
 */
export const linkRepo = (project: Project, repo: Repo) => {
  Object.assign(project, {
    sync: 'poll',
    repo: repo.name,
    languages: repo.languages,
    contributors: repo.contributors ?? project.contributors,
    openIssues: repo.issues ?? 0,
    release: repo.release ?? project.release,
    releasedAt: repo.releasedAt ?? project.releasedAt,
  })
  bringRepo(project.slug as ProjectSlug, repo)
  logActivity(
    project.slug as ProjectSlug,
    `Repo lié : ${repo.owner}/${repo.name}`,
  )
  projectsChanged.value++
}

// The issues, PRs and import alert of a repo, for an import or a link
const bringRepo = (key: ProjectSlug, repo: Repo) => {
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
  repo.pullList?.forEach(([title, branch], i) =>
    pullRequests.push({
      number: (repo.issueList?.length ?? 0) + i + 1,
      project: key,
      title,
      author: me.login,
      branch,
      state: 'open',
      review: 'waiting',
      ci: 'ok',
      at: daysAgo(i + 1),
      demo: false,
    })
  )
  postAlert(
    key,
    'import',
    `Projet importé depuis GitHub : ${repo.owner}/${repo.name} · ${
      counted(repo.issues ?? 0, 'issue')
    } · ${
      counted(repo.pullRequests ?? 0, 'PR', 'PRs')
    }. Synchro toutes les 15 min.`,
  )
}

type ApiProject = ApiOutput['GET/api/projects'][number]
type ApiRepo = NonNullable<ApiProject['repository']>
type ApiIssue = ApiRepo['issues']['items'][number]
type ApiPull = ApiRepo['pullRequests']['items'][number]

const toIssue = (key: ProjectSlug, issue: ApiIssue): Issue => ({
  number: issue.number,
  project: key,
  title: issue.title,
  labels: issue.labels,
  author: issue.authorLogin as Login,
  comments: issue.comments,
  state: issue.state === 'closed' ? 'closed' : 'open',
  at: issue.createdAt * 1000,
  demo: false,
})

const toPull = (key: ProjectSlug, pull: ApiPull): PullRequest => ({
  number: pull.number,
  project: key,
  title: pull.title,
  author: pull.authorLogin as Login,
  branch: pull.branch,
  state: pull.state as PullRequest['state'],
  // A review seen on GitHub: no longer waiting (§6.4)
  review: pull.reviewed ? 'received' : 'waiting',
  ci: 'ok',
  at: pull.createdAt * 1000,
  skills: pull.skills,
  demo: false,
})

/*
 * The issues and PRs of a project of the API come by batches of 20 (§12.7):
 * the first with the project, the next ones as its tabs scroll
 */

type Batches = {
  /** Cursor of the next batch, empty at the end */
  issues: string
  pulls: string
  /** Older batches read: a new first batch keeps them */
  issuesRead: boolean
  pullsRead: boolean
}

export const projectBatches = signal<Record<string, Batches>>({})

// The order of the PR tab: the open ones first, then by number
const pullOrder = (pull: { state: string; number: number }) =>
  (pull.state === 'open' ? 1e9 : 0) + pull.number

/**
 * Puts a batch in a list. A first batch replaces what the list holds for the
 * project, but the older batches already read (`olderRead`) stay below it;
 * a next batch (`first` false) only joins the others.
 */
const keep = <T extends { project: string; number: number }>(
  list: T[],
  key: string,
  fresh: T[],
  order: (item: T) => number,
  { first, olderRead }: { first: boolean; olderRead: boolean },
) => {
  if (first) {
    const lowest = Math.min(...fresh.map(order))
    for (let i = list.length - 1; i >= 0; i--) {
      const item = list[i]
      if (item.project !== key) continue
      if (!olderRead || order(item) >= lowest) list.splice(i, 1)
    }
  }
  for (const item of fresh) {
    const i = list.findIndex((x) =>
      x.project === key && x.number === item.number
    )
    i < 0 ? list.push(item) : list[i] = item
  }
}

const reading = new Map<string, Promise<void>>()

const readBatch = (slug: string, kind: 'issues' | 'pulls') => {
  const at = `${slug} ${kind}`
  const current = reading.get(at)
  if (current) return current
  const before = projectBatches.peek()[slug]?.[kind]
  if (!before) return Promise.resolve()
  const key = slug as ProjectSlug
  const read = (async () => {
    if (kind === 'issues') {
      const batch = await api['GET/api/project/issues'].fetch({ slug, before })
      keep(
        issues,
        key,
        batch.items.map((i) => toIssue(key, i)),
        (i) => i.number,
        { first: false, olderRead: true },
      )
      return {
        ...projectBatches.peek()[slug],
        issues: batch.next,
        issuesRead: true,
      }
    }
    const batch = await api['GET/api/project/pulls'].fetch({ slug, before })
    keep(
      pullRequests,
      key,
      batch.items.map((p) => toPull(key, p)),
      pullOrder,
      { first: false, olderRead: true },
    )
    return {
      ...projectBatches.peek()[slug],
      pulls: batch.next,
      pullsRead: true,
    }
  })()
    .then((next) => {
      projectBatches.value = { ...projectBatches.peek(), [slug]: next }
      projectsChanged.value++
    })
    .catch(() => {})
    .finally(() => reading.delete(at))
  reading.set(at, read)
  return read
}

/** The next batch of the open issues of a project of the API */
export const loadProjectIssues = (slug: string) => readBatch(slug, 'issues')

/** The next batch of the PRs of a project of the API */
export const loadProjectPulls = (slug: string) => readBatch(slug, 'pulls')

export const roleNames: Record<string, ProjectRole> = {
  owner: 'Propriétaire',
  maintainer: 'Mainteneur',
  contributor: 'Contributeur',
  reviewer: 'Reviewer',
  observer: 'Observateur',
}

const stageNames: Record<string, Project['stage']> = {
  idea: 'Idée',
  prototype: 'Prototype',
  beta: 'Bêta',
  production: 'Production',
}

/**
 * Brings the projects of the developer read from GET/api/projects into the
 * pages, with their GitHub issues and PRs. A project of the demo fixtures
 * keeps its richer story until the project screens read the API (PAM-401).
 */
export const adoptProjects = (list: ApiProject[]) => {
  const all = projects as Record<string, Project>
  const batches: Record<string, Batches> = {}
  for (const project of list) {
    if (all[project.slug]?.demo) {
      // Its screenshots are real as soon as the server knows the project
      all[project.slug].shots = project.gallery
      all[project.slug].demoVideoUrl = project.demoVideoUrl
      continue
    }
    const repo = project.repository
    const key = project.slug as ProjectSlug
    all[project.slug] = {
      slug: project.slug,
      name: project.name,
      owner: project.owner as Login,
      stack: project.skills,
      sync: repo ? repo.syncMode as Project['sync'] : 'none',
      repo: repo?.name,
      repoOwner: repo?.owner,
      languages: repo?.languages.map(({ name, share }) => [name, share]),
      description: project.description,
      vision: project.vision || undefined,
      about: repo?.about || undefined,
      contributors: repo?.contributors ?? project.members.length,
      // Counted by the server: only the first batch travels with the project
      openIssues: repo?.openIssues ?? 0,
      beginnerIssues: repo?.beginnerIssues ?? 0,
      openPullRequests: repo?.openPullRequests ?? 0,
      waitingReview: repo?.waitingReview ?? 0,
      release: repo?.release || '—',
      releasedAt: (repo?.releasedAt || project.createdAt) * 1000,
      members: project.members.map(({ login, role }) => ({
        login: login as Login,
        role: roleNames[role] ?? 'Contributeur',
      })),
      followers: project.followers as Login[],
      needs: project.needs,
      blockers: [],
      stage: stageNames[project.status] ?? 'Idée',
      activity: 'Calme',
      milestones: [],
      gallery: [],
      shots: project.gallery,
      demoVideoUrl: project.demoVideoUrl,
      events: [],
      demo: false,
    }
    boards[key] ??= []
    // The first batch of the GitHub issues and PRs replaces the one shown;
    // the older batches the tabs read stay, with their cursor
    const known = projectBatches.peek()[key]
    const issuesRead = known?.issuesRead ?? false
    const pullsRead = known?.pullsRead ?? false
    keep(
      issues,
      key,
      (repo?.issues.items ?? []).map((i) => toIssue(key, i)),
      (i) => i.number,
      { first: true, olderRead: issuesRead },
    )
    keep(
      pullRequests,
      key,
      (repo?.pullRequests.items ?? []).map((p) => toPull(key, p)),
      pullOrder,
      { first: true, olderRead: pullsRead },
    )
    batches[key] = {
      issues: issuesRead ? known!.issues : repo?.issues.next ?? '',
      pulls: pullsRead ? known!.pulls : repo?.pullRequests.next ?? '',
      issuesRead,
      pullsRead,
    }
  }
  projectBatches.value = { ...projectBatches.peek(), ...batches }
  projectsChanged.value++
}

/**
 * The first paragraphs of a README, without its headings, badges, code or
 * HTML: Markdown, shown by the Markdown of the members (§16)
 */
export const readmeSummary = (readme: string) =>
  readme.replace(/```[\s\S]*?```/g, '').replace(/<[^>]*>/g, '')
    .split(/\n\s*\n/)
    .map((block) => block.trim())
    .filter((block) =>
      block && !block.startsWith('#') && !block.startsWith('![') &&
      !block.startsWith('[![') && !block.startsWith('<')
    )
    .join('\n\n').slice(0, 600)
