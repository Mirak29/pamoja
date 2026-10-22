import { sql } from '@01edu/db'
// The entry tables exist before the query below is prepared
import '/api/entries.ts'
import { entries } from '/api/entry-types.ts'

// The proofs of a developer, by dimension of the reputation (§8.1), read
// from the reputation entries and what they froze (§8.3). Only eligible
// proofs count; an excluded one stays in the activity, not here (§8.4).
//
//   review  Code Review       REVIEW_HELP_CONFIRMED
//   build   Project Building  PROJECT_CREATED with 2 active members or more,
//                             RELEASE_PUBLISHED, PR_MERGED on one's projects
//   mentor  Mentoring         HELP_CONFIRMED, mentorship or pair programming
//   oss     Open Source       PR_MERGED whose author does not own the project
//   help    Community Help    HELP_CONFIRMED of the other types,
//                             ANSWER_ACCEPTED

export type Dimension = 'review' | 'build' | 'mentor' | 'oss' | 'help'

const MENTORING = ['mentorship', 'pair_programming']

type Row = {
  id: number
  type: number
  at: number
  helpRequestId: number | null
  postId: number | null
  source: string | null
  eligible: number | null
  helpCategory: string | null
  skills: string | null
  repository: string | null
  prNumber: number | null
  url: string | null
  tag: string | null
  authorIsOwner: number | null
  project: string | null
  projectName: string | null
  projectOwner: string | null
  members: number
  requester: string | null
  asker: string | null
  title: string | null
  byName: string | null
  byCountry: string | null
}

const field = (table: string, column: string) =>
  `LEFT JOIN entry${table} AS ${column} ON ${column}.entryId = entry.id`

const listProofs = sql<Row, number>`
  SELECT entry.id, entry.type, entry.createdAt AS at, entry.helpRequestId,
    entry.postId, source.source, eligible.eligible, helpCategory.helpCategory,
    skills.skills, repository.repository, prNumber.prNumber, url.url, tag.tag,
    authorIsOwner.authorIsOwner,
    project.slug AS project, project.name AS projectName,
    owner.githubUsername AS projectOwner,
    (SELECT count(*) FROM projectMember
      WHERE projectMember.projectId = entry.projectId
        AND projectMember.role != 'observer') AS members,
    requester.githubUsername AS requester, asker.githubUsername AS asker,
    helpRequest.title, byProfile.displayName AS byName,
    byProfile.country AS byCountry
  FROM entry
  ${field('Source', 'source')}
  ${field('Eligible', 'eligible')}
  ${field('HelpCategory', 'helpCategory')}
  ${field('Skills', 'skills')}
  ${field('Repository', 'repository')}
  ${field('PrNumber', 'prNumber')}
  ${field('Url', 'url')}
  ${field('Tag', 'tag')}
  ${field('AuthorIsOwner', 'authorIsOwner')}
  ${field('RequesterId', 'requesterId')}
  ${field('AskerId', 'askerId')}
  LEFT JOIN project ON project.projectId = entry.projectId
  LEFT JOIN user AS owner ON owner.userId = project.ownerId
  LEFT JOIN user AS requester ON requester.userId = requesterId.requesterId
  LEFT JOIN user AS asker ON asker.userId = askerId.askerId
  LEFT JOIN helpRequest ON helpRequest.helpRequestId = entry.helpRequestId
  LEFT JOIN profile AS byProfile ON byProfile.userId = coalesce(
    requesterId.requesterId, askerId.askerId,
    CASE WHEN authorIsOwner.authorIsOwner = 0 THEN project.ownerId END)
  WHERE entry.userId = ? AND entry.type IN (${entries.PROJECT_CREATED},
    ${entries.PR_MERGED}, ${entries.RELEASE_PUBLISHED},
    ${entries.REVIEW_HELP_CONFIRMED}, ${entries.HELP_CONFIRMED},
    ${entries.ANSWER_ACCEPTED})
  ORDER BY entry.createdAt DESC, entry.id DESC
`.all

/** What a proof is, the dimension it counts in; undefined when it does not */
const kindOf = (row: Row): [string, Dimension] | undefined => {
  switch (row.type) {
    case entries.PROJECT_CREATED:
      return row.members >= 2 ? ['created', 'build'] : undefined
    case entries.RELEASE_PUBLISHED:
      return ['release', 'build']
    case entries.PR_MERGED:
      return row.authorIsOwner ? ['merged', 'build'] : ['merged', 'oss']
    case entries.REVIEW_HELP_CONFIRMED:
      return ['review', 'review']
    case entries.HELP_CONFIRMED:
      return MENTORING.includes(row.helpCategory ?? '')
        ? ['help', 'mentor']
        : ['help', 'help']
    case entries.ANSWER_ACCEPTED:
      return ['answer', 'help']
  }
}

const skillNames = (skills: string | null) => {
  try {
    return (JSON.parse(skills ?? '[]') as { name: string }[])
      .map((skill) => skill.name)
  } catch {
    return []
  }
}

/**
 * The eligible proofs of a developer, newest first, each with what leads to
 * it: the PR on GitHub, the help request, the answer or the project. Only
 * `source = github` is « vérifié par GitHub » (§8.3).
 */
export const proofsOf = (userId: number) =>
  listProofs(userId).flatMap((row) => {
    // PROJECT_CREATED freezes no decision; the others count when eligible
    if (row.type !== entries.PROJECT_CREATED && row.eligible !== 1) return []
    const kind = kindOf(row)
    if (!kind) return []
    const [what, dimension] = kind
    return [{
      id: row.id,
      kind: what,
      dimension,
      title: row.title ?? '',
      category: row.helpCategory ?? '',
      skills: skillNames(row.skills),
      project: row.project ?? '',
      projectName: row.projectName ?? '',
      // Who was helped: the requester, the author of the question, or the
      // owner of the project a PR was merged in
      by: row.requester ?? row.asker ??
        (what === 'merged' && dimension === 'oss' ? row.projectOwner : '') ??
        '',
      // Their name and country, for the proof and the Collaboration Map
      byName: row.byName ?? '',
      byCountry: row.byCountry ?? '',
      at: row.at,
      source: row.source ?? 'platform',
      repository: row.repository ?? '',
      prNumber: row.prNumber ?? 0,
      url: row.url ?? '',
      tag: row.tag ?? '',
      helpRequestId: row.helpRequestId ?? 0,
      postId: row.postId ?? 0,
    }]
  })
