import { db, sql } from '@01edu/db'
import { now } from '@01edu/time'
import { respond } from '@01edu/api/response'
import { Report } from '/api/schema.ts'
import { Entry, maybe } from '/api/entries.ts'
import { type Window, within } from '/api/lib/rate.ts'
import { LIMITS } from '/api/limits.ts'

// Report content for the moderators (§10.5). A reporter reports a target
// once; past three distinct reporters a post or comment is hidden, pending a
// moderator's decision, so it disappears from the feed for everyone. Writes
// are rate limited (§16).

export const REPORT_RATE = { count: 20, per: 3600 }
// Distinct reporters past which a post or comment is hidden (§10.5)
export const HIDE_AT = 3

const badRequest = (m: string) => new respond.BadRequestError({ message: m })
const conflict = (m: string) => new respond.ConflictError({ message: m })

export const REPORTABLE = ['post', 'comment', 'help_request', 'profile']
const HIDEABLE = ['post', 'comment']

const getPost = sql<{ authorId: number; hiddenAt: number | null }, number>`
  SELECT authorId, hiddenAt FROM post WHERE postId = ?
`.get

const existing = sql<
  { reportId: number },
  { me: number; targetType: string; targetId: number }
>`
  SELECT reportId FROM report
  WHERE reporterId = :me AND targetType = :targetType AND targetId = :targetId
`.get

const countReporters = sql<
  { n: number },
  { targetType: string; targetId: number }
>`
  SELECT count(DISTINCT reporterId) AS n FROM report
  WHERE targetType = :targetType AND targetId = :targetId
`.get

const hidePost = sql<undefined, { postId: number; at: number }>`
  UPDATE post SET hiddenAt = :at WHERE postId = :postId AND hiddenAt IS NULL
`.run

const countReports = sql<Window, { me: number; since: number }>`
  SELECT count(*) AS n, min(createdAt) AS oldest FROM report
  WHERE reporterId = :me AND createdAt > :since
`.get

/** Report a piece of content; a post hides itself past three reporters */
export const reportContent = (
  me: number,
  targetType: string,
  targetId: number,
  reason: string,
  comment: string,
) => {
  if (!REPORTABLE.includes(targetType)) throw badRequest('Unknown target')
  if (comment.length > LIMITS.note) throw badRequest('Comment too long')
  const post = HIDEABLE.includes(targetType) ? getPost(targetId) : undefined
  if (HIDEABLE.includes(targetType)) {
    if (!post) throw badRequest('Unknown content')
    if (post.authorId === me) throw badRequest('One does not report oneself')
  }
  if (existing({ me, targetType, targetId })) {
    throw conflict('You already reported this')
  }
  within(countReports, REPORT_RATE, me, 'Too many reports this hour')
  let hidden = false
  db.transaction(() => {
    Report.insert({
      reporterId: me,
      targetType,
      targetId,
      reason,
      comment: comment.trim() || null,
      status: 'open',
      createdAt: now(),
    })
    Entry.insert.CONTENT_REPORTED({
      userId: me,
      communityId: maybe(null),
      postId: HIDEABLE.includes(targetType) ? targetId : maybe(null),
      data: { targetType, targetId },
      source: 'platform',
    })
    // Past three distinct reporters, the content is hidden until a moderator
    // decides: it leaves the feed for everyone (§10.5)
    if (
      post && !post.hiddenAt &&
      (countReporters({ targetType, targetId })?.n ?? 0) >= HIDE_AT
    ) {
      hidePost({ postId: targetId, at: now() })
      hidden = true
    }
  })()
  return { reported: true, hidden }
}
