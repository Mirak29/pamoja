import { sql } from '@01edu/db'
import { respond } from '@01edu/api/response'
import { now } from '@01edu/time'
// The entry table must exist before the queries below are prepared
import '/api/entries.ts'
import { entries } from '/api/entry-types.ts'
import { Project } from '/api/schema.ts'

// The deterministic Pulse of a project (PAM-306, §6.4): what happened over
// the last 7 days, or since a given time (the last visit), counted in SQL
// on the entries and on what GitHub synced. Shown even without the AI
// summary (PAM-307).

const DAY = 24 * 3600
export const PULSE_DAYS = 7
// A visit older than this counts from this far back
const PULSE_MAX_DAYS = 90

const getProject = Project.sql<'projectId', string>`
  SELECT projectId FROM project WHERE slug = ?
`.get

type Counts = {
  merged: number
  issuesClosed: number
  newContributors: number
  reviewsAsked: number
  waitingReview: number
  releases: number
}

const getCounts = sql<Counts, { projectId: number; since: number }>`
  SELECT
    (SELECT count(*) FROM pullRequest
      JOIN repository USING (repositoryId)
      WHERE repository.projectId = :projectId
        AND pullRequest.mergedAt >= :since) AS merged,
    -- A closed issue last updated in the period: the webhook or the refresh
    -- updates it when it closes
    (SELECT count(*) FROM issue
      JOIN repository USING (repositoryId)
      WHERE repository.projectId = :projectId AND issue.state = 'closed'
        AND issue.updatedAt >= :since) AS issuesClosed,
    (SELECT count(DISTINCT userId) FROM entry
      WHERE entry.type = ${entries.PROJECT_MEMBER_JOINED}
        AND entry.projectId = :projectId
        AND entry.createdAt >= :since) AS newContributors,
    (SELECT count(*) FROM helpRequest
      WHERE helpRequest.projectId = :projectId
        AND helpRequest.category = 'code_review'
        AND helpRequest.createdAt >= :since) AS reviewsAsked,
    -- Now, whatever the period: open and without a review
    (SELECT count(*) FROM pullRequest
      JOIN repository USING (repositoryId)
      WHERE repository.projectId = :projectId AND pullRequest.state = 'open'
        AND NOT EXISTS (
          SELECT 1 FROM review
          WHERE review.pullRequestId = pullRequest.pullRequestId
            AND review.state != 'dismissed'
        )) AS waitingReview,
    -- A release seen by the webhook, or the latest one the refresh read
    max(
      (SELECT count(*) FROM entry
        WHERE entry.type = ${entries.RELEASE_PUBLISHED}
          AND entry.projectId = :projectId
          AND entry.createdAt >= :since),
      (SELECT count(*) FROM repository
        WHERE repository.projectId = :projectId
          AND json_extract(repository.stats, '$.release.at') >= :since)
    ) AS releases
`.get

/**
 * The Pulse of a project, from `since` (seconds) or over the last 7 days;
 * a time further than 90 days, or in the future, is brought back in range
 */
export const pulseOf = (slug: string, since?: number | null, at = now()) => {
  const project = getProject(slug)
  if (!project) throw new respond.NotFoundError({ message: 'No such project' })
  const from = Math.min(
    at,
    Math.max(at - PULSE_MAX_DAYS * DAY, since ?? at - PULSE_DAYS * DAY),
  )
  return {
    since: from,
    ...getCounts({ projectId: project.projectId, since: from })!,
  }
}
