import { respond } from '@01edu/api/response'
import { db, sql } from '@01edu/db'
import { now } from '@01edu/time'
import { Entry } from '/api/entries.ts'
import { type Window, within } from '/api/lib/rate.ts'
import { countOf, read, readOptional, seconds } from '/api/github.ts'
import { installationOf } from '/api/github-app.ts'
import { linkInstallation } from '/api/installation.ts'
import { Project, ProjectMember, ProjectNeed, Repository } from '/api/schema.ts'
import { skillIdsOf, skillsFromGithub } from '/api/skills.ts'
import { upsertIssue, upsertPullRequest } from '/api/sync.ts'
import { scheduleSkillsRead } from '/api/pull-skills.ts'
import { summarizeSoon } from '/api/pulse-summary.ts'
import type { GithubIssue, GithubPull, GithubRepo } from '/api/sync.ts'

// Level 1 import (§5.4): a public repo of the developer becomes a project,
// with its README, figures, open issues and PRs, refreshed every 15 min.
// Only the owner of a personal repo imports it this way; an organization
// repo goes through the installation (level 2, PAM-203).

const getProjectOfRepo = sql<{ slug: string }, number>`
  SELECT project.slug FROM repository
  JOIN project ON project.projectId = repository.projectId
  WHERE repository.githubId = ?
`.get

const slugTaken = sql<{ projectId: number }, string>`
  SELECT projectId FROM project WHERE slug = ?
`.get

/** Public repos owned by the developer, the last pushed first */
export const listRepositories = async (login: string) => {
  const repos = await read<GithubRepo[]>(
    `/users/${
      encodeURIComponent(login)
    }/repos?type=owner&sort=pushed&per_page=100`,
  )
  return repos.filter((repo) => !repo.fork && !repo.private).map((repo) => ({
    owner: repo.owner.login,
    name: repo.name,
    description: repo.description ?? '',
    language: repo.language ?? '',
    stars: repo.stargazers_count,
    pushedAt: seconds(repo.pushed_at) ?? 0,
    // Already a project on Pamoja: the list links to it
    existing: getProjectOfRepo(repo.id)?.slug ?? '',
  }))
}

const forbidden = (message: string) => new respond.ForbiddenError({ message })

// The repo as GitHub describes it, read again at import: the server never
// trusts what the page sent
export const fetchRepository = async (login: string, name: string) => {
  const repo = await readOptional<GithubRepo>(
    `/repos/${encodeURIComponent(login)}/${encodeURIComponent(name)}`,
  )
  if (!repo || repo.private) {
    throw new respond.NotFoundError({ message: 'Repository not found' })
  }
  if (repo.owner.type === 'Organization') {
    throw forbidden('An organization repository needs the installation')
  }
  if (repo.owner.login.toLowerCase() !== login.toLowerCase()) {
    throw forbidden('Only the owner of a repository imports it')
  }
  const path = `/repos/${repo.full_name}`
  const [languages, readme, release, contributors, openPulls] = await Promise
    .all([
      read<Record<string, number>>(`${path}/languages`),
      readOptional<string>(`${path}/readme`, { raw: true }),
      readOptional<{ tag_name: string; published_at: string | null }>(
        `${path}/releases/latest`,
      ),
      countOf(`${path}/contributors?anon=1`),
      countOf(`${path}/pulls?state=open`),
    ])
  const total = Object.values(languages).reduce((sum, n) => sum + n, 0) || 1
  const shares = Object.entries(languages)
    .map(([language, bytes]) => [language, Math.round(bytes / total * 100)])
    .filter(([, share]) => (share as number) > 0) as [string, number][]
  return {
    repo,
    readme: readme ?? '',
    stats: {
      stars: repo.stargazers_count,
      forks: repo.forks_count,
      topics: repo.topics ?? [],
      languages: shares,
      contributors,
      openIssues: Math.max(0, repo.open_issues_count - openPulls),
      openPullRequests: openPulls,
      release: release
        ? { tag: release.tag_name, at: seconds(release.published_at) }
        : null,
      pushedAt: seconds(repo.pushed_at),
    },
  }
}

/** What the import page shows before the developer confirms (§5.4) */
export const previewRepository = async (login: string, name: string) => {
  const { repo, readme, stats } = await fetchRepository(login, name)
  return {
    owner: repo.owner.login,
    name: repo.name,
    description: repo.description ?? '',
    readme,
    ...stats,
    languages: stats.languages.map(([name, share]) => ({ name, share })),
    pushedAt: stats.pushedAt ?? 0,
    release: stats.release?.tag ?? '',
    releasedAt: stats.release?.at ?? 0,
    // Proposed from the languages and topics; the AI adds to them on a
    // click (PAM-310, import-suggest.ts)
    skills: skillsFromGithub([
      ...stats.languages.map(([language]) => language),
      ...stats.topics,
    ]),
    existing: getProjectOfRepo(repo.id)?.slug ?? '',
  }
}

const baseSlug = (name: string) =>
  name.normalize('NFD').replace(/[̀-ͯ]/g, '')
    .toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '') ||
  'projet'

const uniqueSlug = (name: string) => {
  const base = baseSlug(name)
  let slug = base
  for (let k = 2; slugTaken(slug); k++) slug = `${base}-${k}`
  return slug
}

// A project of the developer with this slug and no repository yet: created
// from scratch, or seeded for the demo. Importing its repo connects it
// (§6.3) instead of making a second project of the same name.
const getRepoless = sql<
  { projectId: number; slug: string },
  { me: number; slug: string }
>`
  SELECT projectId, slug FROM project
  WHERE ownerId = :me AND slug = :slug AND NOT EXISTS (
    SELECT 1 FROM repository WHERE repository.projectId = project.projectId)
`.get

const listNeedTitles = sql<{ title: string }, number>`
  SELECT title FROM projectNeed WHERE projectId = ? AND status = 'open'
`.all

export type ImportInput = {
  name: string
  title: string
  description: string
  vision: string
  skills: string[]
  needs: string[]
}

// Each import reads GitHub several times: 10 an hour (§16), counted in the
// database
export const IMPORT_RATE = { count: 10, per: 3600 }

const countImports = sql<Window, { me: number; since: number }>`
  SELECT count(*) AS n, min(createdAt) AS oldest FROM project
  WHERE ownerId = :me AND source = 'github' AND createdAt > :since
`.get

/** Creates the project of a public repo; the developer becomes its owner */
export const importRepository = async (
  user: { userId: number; login: string },
  input: ImportInput,
) => {
  within(countImports, IMPORT_RATE, user.userId, 'Too many imports')
  const { repo, readme, stats } = await fetchRepository(user.login, input.name)
  if (getProjectOfRepo(repo.id)) {
    throw new respond.ConflictError({ message: 'Repository already imported' })
  }
  const path = `/repos/${repo.full_name}`
  const [issues, pulls, installation] = await Promise.all([
    read<GithubIssue[]>(`${path}/issues?state=open&per_page=100`),
    read<GithubPull[]>(`${path}/pulls?state=open&per_page=100`),
    // Already covered by an installation of the app: the import goes live
    // at once, the importer owning this personal repo (§5.4)
    installationOf(repo.full_name).catch(() => undefined),
  ])

  const at = now()
  const created = db.transaction(() => {
    const repoless = getRepoless({
      me: user.userId,
      slug: baseSlug(input.title || repo.name),
    })
    const slug = repoless?.slug ?? uniqueSlug(input.title || repo.name)
    const projectId = repoless?.projectId ?? Project.insert({
      ownerId: user.userId,
      name: input.title.trim() || repo.name,
      slug,
      description: input.description.trim() || repo.description || '',
      vision: input.vision.trim() || null,
      visibility: 'public',
      status: 'idea',
      // Without a stack chosen (onboarding), the one read from GitHub
      skills: skillIdsOf(
        input.skills.length ? input.skills : skillsFromGithub([
          ...stats.languages.map(([language]) => language),
          ...stats.topics,
        ]),
      ),
      source: 'github',
      createdAt: at,
      updatedAt: at,
    })
    // A project connected keeps its team and its needs; only new ones join
    repoless || ProjectMember.insert({
      projectId,
      userId: user.userId,
      role: 'owner',
      joinedAt: at,
    })
    const known = new Set(listNeedTitles(projectId).map((need) => need.title))
    for (const title of new Set(input.needs.map((need) => need.trim()))) {
      title && !known.has(title) && ProjectNeed.insert({
        projectId,
        type: 'contribution',
        title,
        skills: [],
        status: 'open',
        createdAt: at,
        updatedAt: at,
      })
    }
    const repositoryId = Repository.insert({
      projectId,
      githubId: repo.id,
      owner: repo.owner.login,
      name: repo.name,
      fullName: repo.full_name,
      defaultBranch: repo.default_branch,
      syncMode: 'poll',
      source: 'github',
      readme,
      stats,
      lastSyncedAt: at,
    })
    for (const issue of issues) {
      issue.pull_request || upsertIssue(repositoryId, issue)
    }
    for (const pull of pulls) upsertPullRequest(repositoryId, pull) // A project connected changed; a new one was created (§13.3)
    ;(repoless ? Entry.insert.PROJECT_UPDATED : Entry.insert.PROJECT_CREATED)({
      userId: user.userId,
      projectId,
      source: 'github',
    })
    return { slug, projectId, repositoryId }
  })()
  if (installation) {
    linkInstallation({
      githubInstallationId: installation.id,
      accountLogin: installation.account.login,
      accountType: installation.account.type,
      userId: user.userId,
      projectId: created.projectId,
      repositoryId: created.repositoryId,
    })
  }
  // The skills of its open PRs, read after the answer (§7.1)
  scheduleSkillsRead()
  // Its Pulse gets its AI summary within seconds (§6.4, §18.2)
  summarizeSoon(created.projectId)
  return { slug: created.slug }
}
