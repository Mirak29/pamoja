import type { Project } from '/web/fixtures/projects.ts'
import { pullRequests } from '/web/fixtures/pull-requests.ts'

type Repo = Pick<Project, 'owner' | 'slug' | 'repo' | 'repoOwner'>

/** The repo of a project on GitHub, without the protocol */
export const repoPath = (project: Repo) =>
  `github.com/${project.repoOwner ?? project.owner}/${
    project.repo ?? project.slug
  }`

/** The page of an issue or a PR on GitHub */
export const githubUrl = (
  project: Repo,
  kind: 'issues' | 'pull' | 'releases',
  number?: number,
) => `https://${repoPath(project)}/${kind}${number ? `/${number}` : ''}`

export type Link = { href: string; params?: Record<string, string> }

/**
 * Where a line of the project journal leads: an open PR opens its panel, a
 * merged one, an issue or a release opens GitHub, a help request the #aide
 * channel and a card the board.
 */
export const eventLink = (project: Repo, text: string): Link | undefined => {
  const pr = Number(text.match(/PR #(\d+)/)?.[1])
  if (pr) {
    const open = pullRequests.some((p) =>
      p.project === project.slug && p.number === pr && p.state === 'open'
    )
    return open
      ? { href: `project/${project.slug}/prs`, params: { dialog: `pr-${pr}` } }
      : { href: githubUrl(project, 'pull', pr) }
  }
  const issue = Number(text.match(/[Ii]ssue #(\d+)/)?.[1])
  if (issue) return { href: githubUrl(project, 'issues', issue) }
  if (/[Rr]elease/.test(text)) return { href: githubUrl(project, 'releases') }
  if (/[Dd]emande d’aide/.test(text)) {
    return { href: `project/${project.slug}/channels/help` }
  }
  if (/^Carte /.test(text)) return { href: `project/${project.slug}/board` }
}
