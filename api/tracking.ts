import { sql } from '@01edu/db'
import { respond } from '@01edu/api/response'
import { now } from '@01edu/time'
import { repliesUnder, rightsIn, TRACKING_TYPES } from '/api/channels.ts'
import { Entry } from '/api/entries.ts'
import { entries, entryNames } from '/api/entry-types.ts'
import { every } from '/api/lib/background.ts'
import '/api/schema.ts'

// #suivi (PAM-411, §6.8): no message of its own, the entries GitHub
// produced in the project, newest first, each with the thread the members
// wrote under it. The server gives the facts, the page writes the sentence
// in its language.

const DAY = 24 * 3600
/** A PR waits this long for a review before #suivi says so */
export const STALE_AFTER = 2 * DAY
const STALE_EVERY = 30 * 60 * 1000

type AlertRow = {
  id: number
  type: number
  createdAt: number
  data: string | null
  actor: string | null
  pullRequest: number | null
  prTitle: string | null
  prAuthor: string | null
  issue: number | null
  issueTitle: string | null
  tag: string | null
}

const listAlerts = sql<AlertRow, number>`
  SELECT entry.id, entry.type, entry.createdAt, entry.data,
    user.githubUsername AS actor,
    pullRequest.number AS pullRequest, pullRequest.title AS prTitle,
    pullRequest.authorLogin AS prAuthor,
    issue.number AS issue, issue.title AS issueTitle, entryTag.tag
  FROM entry
  LEFT JOIN user ON user.userId = entry.userId
  LEFT JOIN pullRequest ON pullRequest.pullRequestId = entry.pullRequestId
  LEFT JOIN issue ON issue.issueId = entry.issueId
  LEFT JOIN entryTag ON entryTag.entryId = entry.id
  WHERE entry.projectId = ?
    AND entry.type IN (SELECT value FROM json_each('${
  JSON.stringify(TRACKING_TYPES)
}'))
    -- An issue only says it opened or closed
    AND (entry.type != ${entries.ISSUE_UPDATED} OR
      json_extract(entry.data, '$.action') IN ('opened', 'closed', 'reopened'))
  ORDER BY entry.createdAt DESC, entry.id DESC
  LIMIT 100
`.all

type Facts = {
  state?: string
  action?: string
  name?: string
  branch?: string
  count?: number
  messages?: string[]
}

/** The alerts of #suivi the developer reads, newest first, with their threads */
export const listTracking = (me: number, slug: string) => {
  const { projectId, reads } = rightsIn(me, slug)
  if (!reads.includes('tracking')) {
    throw new respond.ForbiddenError({ message: 'Not a channel you read' })
  }
  const rows = listAlerts(projectId)
  const replies = new Map<number, ReturnType<typeof repliesUnder>>()
  for (const reply of repliesUnder(projectId, rows.map((row) => row.id))) {
    replies.set(reply.alert, [...replies.get(reply.alert) ?? [], reply])
  }
  return rows.map((row) => {
    const facts = (row.data ? JSON.parse(row.data) : {}) as Facts
    return {
      id: row.id,
      kind: entryNames[row.type as keyof typeof entryNames],
      at: row.createdAt,
      actor: row.actor ?? '',
      pullRequest: row.pullRequest ?? 0,
      title: row.prTitle ?? row.issueTitle ?? '',
      author: row.prAuthor ?? '',
      issue: row.issue ?? 0,
      tag: row.tag ?? '',
      // A review: approved, changes_requested or commented; an issue:
      // opened, closed or reopened
      state: facts.state ?? facts.action ?? '',
      // A CI run: its job and branch; a push: its branch and commits
      name: facts.name ?? '',
      branch: facts.branch ?? '',
      count: facts.count ?? 0,
      commits: facts.messages ?? [],
      replies: replies.get(row.id) ?? [],
    }
  })
}

// Open PRs without a review for 2 days, not yet signaled
const listStale = sql<
  { pullRequestId: number; projectId: number },
  { before: number }
>`
  SELECT pullRequest.pullRequestId, repository.projectId
  FROM pullRequest JOIN repository USING (repositoryId)
  WHERE pullRequest.state = 'open' AND pullRequest.createdAt <= :before
    AND NOT EXISTS (
      SELECT 1 FROM review
      WHERE review.pullRequestId = pullRequest.pullRequestId
        AND review.state != 'dismissed'
    )
    AND NOT EXISTS (
      SELECT 1 FROM entry
      WHERE entry.type = ${entries.PR_REVIEW_STALE}
        AND entry.pullRequestId = pullRequest.pullRequestId
    )
`.all

/**
 * « Waits for a review for 2 days » in #suivi, once per PR, with the
 * « Demander une review » of the page (§6.8)
 */
export const flagStaleReviews = (at = now()) => {
  const stale = listStale({ before: at - STALE_AFTER })
  for (const { pullRequestId, projectId } of stale) {
    Entry.insert.PR_REVIEW_STALE({
      projectId,
      pullRequestId,
      source: 'platform',
    })
  }
  return stale.length
}

/** Started by the server: at once, then every 30 minutes */
export const startStaleReviews = () =>
  every('stale-reviews-error', STALE_EVERY, () => flagStaleReviews())
