import { sql } from '@01edu/db'
// The tables first: the statements below are prepared on import
import '/api/schema.ts'

// The contributors of a repository as GitHub lists them (§6.3): kept in its
// stats at import and at each refresh, then shown with their face, linked
// to their profile when they are on Pamoja, to GitHub otherwise.

/** What GitHub says of a contributor (GET /repos/{repo}/contributors) */
export type GithubContributor = {
  id: number
  login: string
  avatar_url: string
  type: string
  contributions: number
}

/** A contributor as kept in the stats of the repository */
export type Contributor = { id: number; login: string; avatar: string }

/** The contributors kept: people, not bots, 30 at most, most active first */
export const CONTRIBUTORS_KEPT = 30
export const contributorsPath = (fullName: string) =>
  `/repos/${fullName}/contributors?per_page=${CONTRIBUTORS_KEPT}`

export const keptContributors = (list: GithubContributor[]): Contributor[] =>
  list
    .filter((c) => c.type === 'User' && !c.login.endsWith('[bot]'))
    .slice(0, CONTRIBUTORS_KEPT)
    .map((c) => ({ id: c.id, login: c.login, avatar: c.avatar_url }))

const onPamoja = sql<
  { githubId: number; login: string },
  { ids: string }
>`
  SELECT githubId, githubUsername AS login FROM user
  WHERE githubId IN (SELECT value FROM json_each(:ids))
`.all

/**
 * The contributors to show beside the team: the members aside, each with
 * their Pamoja login when they have an account (by GitHub id, which a
 * renamed login keeps)
 */
export const shownContributors = (
  kept: Contributor[] | undefined,
  members: string[],
) => {
  if (!kept?.length) return []
  const accounts = new Map(
    onPamoja({ ids: JSON.stringify(kept.map((c) => c.id)) })
      .map((row) => [row.githubId, row.login]),
  )
  const team = new Set(members.map((login) => login.toLowerCase()))
  return kept
    .map((c) => ({
      github: c.login,
      avatarUrl: c.avatar,
      login: accounts.get(c.id) ?? '',
    }))
    .filter((c) =>
      !team.has((c.login || c.github).toLowerCase()) &&
      !team.has(c.github.toLowerCase())
    )
}
