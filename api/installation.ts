import { respond } from '@01edu/api/response'
import { db, sql } from '@01edu/db'
import { now } from '@01edu/time'
import { Entry, maybe } from '/api/entries.ts'
import {
  consumeState,
  DEMO_CODE,
  exchangeCode,
  isSimulated,
  newState,
  type Read,
} from '/api/github-oauth.ts'
import { GITHUB_APP_SLUG } from '/api/lib/env.ts'
import { User } from '/api/schema.ts'

// Level 2 (§5.4): the developer installs the app on the repo, GitHub sends
// them back with a `code` and the `installation_id`, and the server checks
// three things with a temporary user token before the repo goes live.

type ProjectRepo = {
  projectId: number
  slug: string
  ownerId: number
  repositoryId: number
  fullName: string
  syncMode: string
}

const getProjectRepo = sql<ProjectRepo, Record<string, string | number>>`
  SELECT project.projectId, slug, ownerId, repositoryId, fullName, syncMode
  FROM project
  JOIN repository ON repository.projectId = project.projectId
  WHERE slug = :slug OR project.projectId = :projectId
`.get

const projectOf = (where: { slug?: string; projectId?: number }) =>
  getProjectRepo({ slug: where.slug ?? '', projectId: where.projectId ?? 0 })

/** The installation page of the app, or the callback page in dev (§5.3) */
export const installationUrl = (userId: number, slug: string) => {
  const project = projectOf({ slug })
  if (!project) {
    throw new respond.NotFoundError({
      message: 'Project with a repository not found',
    })
  }
  if (project.ownerId !== userId) {
    throw new respond.ForbiddenError({
      message: 'Only the owner turns on the live sync',
    })
  }
  const state = newState({ userId, projectId: project.projectId })
  if (isSimulated) {
    return `connexion/github?${new URLSearchParams({
      code: DEMO_CODE,
      installation_id: '0',
      setup_action: 'install',
      state,
    })}`
  }
  return `https://github.com/apps/${GITHUB_APP_SLUG}/installations/new?${new URLSearchParams(
    { state },
  )}`
}

export type CheckName = 'identity' | 'coverage' | 'admin'
export type Check = { name: CheckName; ok: boolean }

const json = async <T>(res: Response) =>
  res.ok ? await res.json() as T : (await res.body?.cancel(), undefined)

/**
 * The three checks, all required (§5.4): the token is the account signed in
 * on Pamoja, the installation covers this very repo, and this account
 * administers or maintains it. Being listed in an installation proves
 * nothing alone: read-only access shows there too.
 */
export const verifyInstallation = async (
  read: Read,
  { githubId, installationId, fullName }: {
    githubId: number
    installationId: number
    fullName: string
  },
) => {
  const user = await json<{ id: number }>(await read('/user'))
  const identity = user?.id === githubId

  let coverage = false
  for (let page = 1; page <= 10 && !coverage; page++) {
    const list = await json<{
      total_count: number
      repositories: { full_name: string }[]
    }>(
      await read(
        `/user/installations/${installationId}/repositories?per_page=100&page=${page}`,
      ),
    )
    if (!list) break
    coverage = list.repositories.some((repo) =>
      repo.full_name.toLowerCase() === fullName.toLowerCase()
    )
    if (page * 100 >= list.total_count) break
  }

  const repo = await json<
    { permissions?: { admin?: boolean; maintain?: boolean } }
  >(await read(`/repos/${fullName}`))
  const admin = !!(repo?.permissions?.admin || repo?.permissions?.maintain)

  return [
    { name: 'identity', ok: identity },
    { name: 'coverage', ok: coverage },
    { name: 'admin', ok: admin },
  ] as Check[]
}

/** The account the installation belongs to, as the user token sees it */
const accountOf = async (read: Read, installationId: number) => {
  const list = await json<{
    installations: {
      id: number
      account: { login: string; type: 'User' | 'Organization' }
    }[]
  }>(await read('/user/installations?per_page=100'))
  return list?.installations.find((i) => i.id === installationId)?.account
}

// In dev without the app, GitHub answers as the owner of the repo would
const simulatedRead = (githubId: number, fullName: string): Read => (path) => {
  const body = path === '/user'
    ? { id: githubId }
    : path.startsWith('/user/installations?')
    ? {
      installations: [{
        id: 0,
        account: { login: fullName.split('/')[0], type: 'User' },
      }],
    }
    : path.startsWith('/user/installations/')
    ? { total_count: 1, repositories: [{ full_name: fullName }] }
    : { permissions: { admin: true } }
  return Promise.resolve(Response.json(body))
}

const saveInstallation = sql<undefined, Record<string, string | number | null>>`
  INSERT INTO githubInstallation (githubInstallationId, accountLogin,
    accountType, installedByUserId, createdAt, updatedAt)
  VALUES (:githubInstallationId, :accountLogin, :accountType,
    :installedByUserId, :at, :at)
  ON CONFLICT (githubInstallationId) DO UPDATE SET
    accountLogin = excluded.accountLogin,
    accountType = excluded.accountType,
    installedByUserId = coalesce(installedByUserId, excluded.installedByUserId),
    updatedAt = excluded.updatedAt
`.run

const getInstallationRow = sql<{ installationId: number }, number>`
  SELECT installationId FROM githubInstallation WHERE githubInstallationId = ?
`.get

const goLive = sql<undefined, Record<string, number>>`
  UPDATE repository SET syncMode = 'live', installationId = :installationId
  WHERE repositoryId = :repositoryId
`.run

/**
 * Records the installation and turns the repo live (§5.4); also used by the
 * import when the app already covers the repo
 */
export const linkInstallation = db.transaction((
  link: {
    githubInstallationId: number
    accountLogin: string
    accountType: string
    userId: number | null
    projectId: number
    repositoryId: number
  },
) => {
  saveInstallation({
    githubInstallationId: link.githubInstallationId,
    accountLogin: link.accountLogin,
    accountType: link.accountType,
    installedByUserId: link.userId,
    at: now(),
  })
  const { installationId } = getInstallationRow(link.githubInstallationId)!
  goLive({ installationId, repositoryId: link.repositoryId })
  Entry.insert.PROJECT_UPDATED({
    userId: maybe(link.userId),
    projectId: link.projectId,
    source: 'github',
  })
})

const getGithubId = User.sql<'githubId', number>`
  SELECT githubId FROM user WHERE userId = ?
`.get

/** The return from the installation: three checks, then the live sync */
export const confirmInstallation = async (
  userId: number,
  input: { code: string; installationId: string; state: string },
) => {
  const payload = consumeState(input.state)
  if (!payload || payload.userId !== userId) {
    throw new respond.UnauthorizedError({
      message: 'Invalid or expired installation state',
    })
  }
  const project = projectOf({ projectId: Number(payload.projectId) })
  if (!project) {
    throw new respond.NotFoundError({ message: 'Project not found' })
  }
  const installationId = Number(input.installationId)
  const githubId = getGithubId(userId)!.githubId
  const read = isSimulated
    ? simulatedRead(githubId, project.fullName)
    : await exchangeCode(input.code)

  const checks = await verifyInstallation(read, {
    githubId,
    installationId,
    fullName: project.fullName,
  })
  const live = checks.every((check) => check.ok)
  if (live) {
    const account = await accountOf(read, installationId)
    linkInstallation({
      githubInstallationId: installationId,
      accountLogin: account?.login ?? project.fullName.split('/')[0],
      accountType: account?.type ?? 'User',
      userId,
      projectId: project.projectId,
      repositoryId: project.repositoryId,
    })
  }
  // The token goes with `read`: nothing keeps it (§5.2)
  return { slug: project.slug, live, checks }
}
