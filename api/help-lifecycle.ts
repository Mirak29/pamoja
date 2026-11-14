import { db, sql } from '@01edu/db'
import { respond } from '@01edu/api/response'
import { now } from '@01edu/time'
import { Entry, maybe } from '/api/entries.ts'
import { entryNames } from '/api/entry-types.ts'
import { getHelpRequest, getHelpRequests } from '/api/help.ts'
import { MESSAGE_MAX, OPEN_FOR, RELEASE_AFTER } from '/api/help-rules.ts'
import { explain, matchesFor, sendWave } from '/api/matching.ts'
import { createNotification } from '/api/notifications.ts'
import { evaluateBadges } from '/api/badges.ts'
import { eligibilityOf, RULES_VERSION } from '/api/reputation.ts'
import { HelpMessage } from '/api/schema.ts'
import { after, readBatch, type Slice } from '/api/lib/cursor.ts'
import { type Window, within } from '/api/lib/rate.ts'

// The lifecycle of a help request (§7.2). Each transition is one
// transaction whose UPDATE only applies from the expected state: two helpers
// who accept at the same time get one acceptance and one « Déjà prise ».

const source = 'platform'

type Row = {
  helpRequestId: number
  authorId: number
  targetUserId: number | null
  projectId: number | null
  pullRequestId: number | null
  status: string
  acceptedBy: number | null
  acceptedAt: number | null
  title: string
}

const getRow = sql<Row, number>`
  SELECT helpRequestId, authorId, targetUserId, projectId, pullRequestId,
    status, acceptedBy, acceptedAt, title
  FROM helpRequest WHERE helpRequestId = ?
`.get

/** The other side of a request learns what happened (§7.4) */
const tell = (
  row: Row,
  to: number | null,
  type: string,
  actorId: number,
  extra: Record<string, unknown> = {},
) =>
  to && to !== actorId && createNotification({
    userId: to,
    type,
    category: 'for-you',
    actorId,
    payload: { helpRequestId: row.helpRequestId, title: row.title, ...extra },
  })

const notFound = () =>
  new respond.NotFoundError({ message: 'Help request not found' })
const forbidden = (message: string) => new respond.ForbiddenError({ message })
const conflict = (message: string) => new respond.ConflictError({ message })

const rowOf = (helpRequestId: number) => {
  const row = getRow(helpRequestId)
  if (!row) throw notFound()
  return row
}

const requireAuthor = (row: Row, userId: number) => {
  if (row.authorId !== userId) throw forbidden('Only the requester can')
}
const requireHelper = (row: Row, userId: number) => {
  if (row.acceptedBy !== userId) throw forbidden('Only the helper can')
}

/*
 * Who left: excluded from the next waves of this request (§7.2)
 */

const writeMatch = sql<
  undefined,
  { helpRequestId: number; userId: number; status: string }
>`
  INSERT INTO helpMatch (helpRequestId, userId, score, reasons, wave,
    newcomerSlot, status)
  VALUES (:helpRequestId, :userId, 0, '[]', 0, 0, :status)
  ON CONFLICT (helpRequestId, userId) DO UPDATE SET status = excluded.status
`.run

const getLeft =
  sql<{ status: string }, { helpRequestId: number; userId: number }>`
  SELECT status FROM helpMatch
  WHERE helpRequestId = :helpRequestId AND userId = :userId
    AND status IN ('withdrawn', 'released')
`.get

export const hasLeft = (helpRequestId: number, userId: number) =>
  !!getLeft({ helpRequestId, userId })

/*
 * Activity of the helper: the acceptance, then each of their messages
 */

const getLastMessageOf = sql<
  { at: number | null },
  { helpRequestId: number; userId: number }
>`
  SELECT max(createdAt) AS at FROM helpMessage
  WHERE helpRequestId = :helpRequestId AND authorId = :userId
`.get

export const lastHelperActivity = (row: Row) => {
  if (!row.acceptedBy || !row.acceptedAt) return 0
  const last = getLastMessageOf({
    helpRequestId: row.helpRequestId,
    userId: row.acceptedBy,
  })?.at
  return Math.max(row.acceptedAt, last ?? 0)
}

/** When the requester may release the request, 0 if it is not accepted */
export const releasableAt = (row: Row) =>
  row.status === 'accepted' ? lastHelperActivity(row) + RELEASE_AFTER : 0

/*
 * Transitions
 */

const setAccepted = sql<
  undefined,
  { helpRequestId: number; userId: number; at: number }
>`
  UPDATE helpRequest SET status = 'accepted', acceptedBy = :userId,
    acceptedAt = :at, helperRemindedAt = NULL, updatedAt = :at
  WHERE helpRequestId = :helpRequestId AND status = 'open'
`.run

/** A helper takes the request: atomic, the second one gets « Déjà prise » */
export const acceptHelp = (userId: number, helpRequestId: number) =>
  db.transaction(() => {
    const row = rowOf(helpRequestId)
    if (row.authorId === userId) {
      throw forbidden('A request is not accepted by its requester')
    }
    if (row.targetUserId && row.targetUserId !== userId) {
      throw forbidden('This request is addressed to someone else')
    }
    if (hasLeft(helpRequestId, userId)) {
      throw forbidden('You left this request')
    }
    if (!setAccepted({ helpRequestId, userId, at: now() })) {
      throw conflict(
        getRow(helpRequestId)?.status === 'accepted'
          ? 'Already taken'
          : 'This request is no longer open',
      )
    }
    writeMatch({ helpRequestId, userId, status: 'accepted' })
    Entry.insert.HELP_REQUEST_ACCEPTED({
      userId,
      projectId: maybe(row.projectId),
      helpRequestId,
      source,
    })
    tell(row, row.authorId, 'help_accepted', userId)
  })()

const setOpenAgain = sql<
  undefined,
  { helpRequestId: number; helperId: number; at: number; expiresAt: number }
>`
  UPDATE helpRequest SET status = 'open', acceptedBy = NULL,
    acceptedAt = NULL, helperRemindedAt = NULL, expiresAt = :expiresAt,
    updatedAt = :at
  WHERE helpRequestId = :helpRequestId AND status = 'accepted'
    AND acceptedBy = :helperId
`.run

/**
 * The helper leaves, or the requester releases them after 72 h without
 * activity: open again for 7 days, the helper out of the next waves
 */
const reopenWithout = (
  row: Row,
  left: 'withdrawn' | 'released',
) => {
  const at = now()
  const helperId = row.acceptedBy!
  if (
    !setOpenAgain({
      helpRequestId: row.helpRequestId,
      helperId,
      at,
      expiresAt: at + OPEN_FOR,
    })
  ) throw conflict('The request changed in the meantime')
  writeMatch({
    helpRequestId: row.helpRequestId,
    userId: helperId,
    status: left,
  })
  const relations = {
    userId: helperId,
    helpRequestId: row.helpRequestId,
    source,
  }
  if (left === 'withdrawn') {
    Entry.insert.HELP_REQUEST_WITHDRAWN(relations)
    tell(row, row.authorId, 'help_withdrawn', helperId)
  } else {
    Entry.insert.HELP_REQUEST_RELEASED(relations)
    tell(row, helperId, 'help_released', row.authorId)
  }
}

export const withdrawHelp = (userId: number, helpRequestId: number) =>
  db.transaction(() => {
    const row = rowOf(helpRequestId)
    requireHelper(row, userId)
    if (row.status !== 'accepted') {
      throw conflict('Only an accepted request can be left')
    }
    reopenWithout(row, 'withdrawn')
    // The matching goes on with the next wave (§7.2)
    sendWave(helpRequestId)
  })()

export const releaseHelp = (userId: number, helpRequestId: number) =>
  db.transaction(() => {
    const row = rowOf(helpRequestId)
    requireAuthor(row, userId)
    if (row.status !== 'accepted') {
      throw conflict('Only an accepted request can be released')
    }
    if (now() < releasableAt(row)) {
      throw forbidden('Possible 72 h after the last activity of the helper')
    }
    reopenWithout(row, 'released')
    sendWave(helpRequestId)
  })()

const setStatus = sql<
  undefined,
  { helpRequestId: number; from: string; to: string; at: number }
>`
  UPDATE helpRequest SET status = :to, updatedAt = :at
  WHERE helpRequestId = :helpRequestId AND status = :from
`.run

const move = (row: Row, to: string) => {
  if (
    !setStatus({
      helpRequestId: row.helpRequestId,
      from: row.status,
      to,
      at: now(),
    })
  ) {
    throw conflict('The request changed in the meantime')
  }
}

/** The requester gives up, before any help is delivered: final */
export const cancelHelp = (userId: number, helpRequestId: number) =>
  db.transaction(() => {
    const row = rowOf(helpRequestId)
    requireAuthor(row, userId)
    if (row.status !== 'open' && row.status !== 'accepted') {
      throw conflict('Only an open or accepted request can be cancelled')
    }
    move(row, 'cancelled')
    Entry.insert.HELP_REQUEST_CANCELLED({
      userId,
      helpRequestId,
      source,
    })
    tell(row, row.acceptedBy, 'help_cancelled', userId)
  })()

const setReopened = sql<
  undefined,
  { helpRequestId: number; at: number; expiresAt: number }
>`
  UPDATE helpRequest SET status = 'open', acceptedBy = NULL, acceptedAt = NULL,
    deliveredAt = NULL, helperRemindedAt = NULL, confirmRemindedAt = NULL,
    expiresAt = :expiresAt, updatedAt = :at
  WHERE helpRequestId = :helpRequestId
    AND status IN ('expired', 'closed_unhelpful', 'closed_unconfirmed')
`.run

/** Same data, open again for 7 days; those who left stay out (§7.2) */
export const reopenHelp = (userId: number, helpRequestId: number) =>
  db.transaction(() => {
    const row = rowOf(helpRequestId)
    requireAuthor(row, userId)
    const at = now()
    if (!setReopened({ helpRequestId, at, expiresAt: at + OPEN_FOR })) {
      throw conflict('Only an expired or closed request can be reopened')
    }
    Entry.insert.HELP_REQUEST_REOPENED({ userId, helpRequestId, source })
    sendWave(helpRequestId)
  })()

const setDelivered = sql<undefined, { helpRequestId: number; at: number }>`
  UPDATE helpRequest SET status = 'delivered', deliveredAt = :at,
    updatedAt = :at
  WHERE helpRequestId = :helpRequestId AND status = 'accepted'
`.run

/** For a request without a PR; on a PR, GitHub tells the review (§7.5) */
export const deliverHelp = (userId: number, helpRequestId: number) =>
  db.transaction(() => {
    const row = rowOf(helpRequestId)
    requireHelper(row, userId)
    if (row.pullRequestId) {
      throw conflict('On a PR, the review is detected on GitHub')
    }
    if (!setDelivered({ helpRequestId, at: now() })) {
      throw conflict('Only an accepted request can be delivered')
    }
    Entry.insert.HELP_REQUEST_DELIVERED({ userId, helpRequestId, source })
    tell(row, row.authorId, 'help_delivered', userId)
  })()

const getProofSource = sql<
  {
    category: string
    skills: string
    githubReviewId: number | null
    reviewState: string | null
    fullName: string | null
    number: number | null
  },
  number
>`
  SELECT helpRequest.category, helpRequest.skills, review.githubReviewId,
    review.state AS reviewState, repository.fullName, pullRequest.number
  FROM helpRequest
  LEFT JOIN review ON review.helpRequestId = helpRequest.helpRequestId
  LEFT JOIN pullRequest
    ON pullRequest.pullRequestId = helpRequest.pullRequestId
  LEFT JOIN repository
    ON repository.repositoryId = pullRequest.repositoryId
  WHERE helpRequest.helpRequestId = ?
`.get

/** The skill rows a proof freezes, from a JSON list of skill ids (§8.3) */
export const listSkillRows = sql<
  { skillId: number; slug: string; name: string },
  string
>`
  SELECT skillId, slug, name FROM skill
  WHERE skillId IN (SELECT value FROM json_each(?))
`.all

const setCompleted = sql<undefined, { helpRequestId: number; at: number }>`
  UPDATE helpRequest SET status = 'completed', confirmedAt = :at,
    updatedAt = :at
  WHERE helpRequestId = :helpRequestId
    AND status IN ('review_submitted', 'delivered')
`.run

/** A skill proven by a confirmed help: it weighs the most (§6.1, §7.3) */
export const addProvenSkill = sql<
  undefined,
  { userId: number; skillId: number; at: number }
>`
  INSERT OR IGNORE INTO userSkill (userId, skillId, source, createdAt)
  VALUES (:userId, :skillId, 'platform_activity', :at)
`.run

/**
 * « Was this helpful? → Yes »: completed, and a proof for the helper that
 * freezes everything the decision used (§8.3). A review seen on GitHub gives
 * REVIEW_HELP_CONFIRMED, « vérifié par GitHub »; a help delivered on Pamoja
 * gives HELP_CONFIRMED. The anti-abuse rules decide once if it counts (§8.4).
 */
export const confirmHelp = (userId: number, helpRequestId: number) =>
  db.transaction(() => {
    const row = rowOf(helpRequestId)
    requireAuthor(row, userId)
    const at = now()
    if (!setCompleted({ helpRequestId, at })) {
      throw conflict('Only a delivered help can be confirmed')
    }
    const helperId = row.acceptedBy!
    const proof = getProofSource(helpRequestId)!
    const skillRows = listSkillRows(proof.skills)
    const decision = eligibilityOf(helperId, row.authorId, at)
    const common = {
      userId: helperId,
      projectId: maybe(row.projectId),
      helpRequestId,
      requesterId: row.authorId,
      skills: skillRows,
      helpCategory: proof.category,
      rulesVersion: RULES_VERSION,
      ...decision,
    }
    if (
      row.status === 'review_submitted' && proof.githubReviewId &&
      proof.fullName && proof.number && row.pullRequestId
    ) {
      Entry.insert.REVIEW_HELP_CONFIRMED({
        ...common,
        pullRequestId: row.pullRequestId,
        repository: proof.fullName,
        prNumber: proof.number,
        url: `https://github.com/${proof.fullName}/pull/${proof.number}`,
        githubReviewId: proof.githubReviewId,
        reviewState: proof.reviewState ?? 'commented',
        source: 'github',
      })
    } else {
      Entry.insert.HELP_CONFIRMED({ ...common, source: 'platform' })
    }
    if (decision.eligible) {
      for (const { skillId } of skillRows) {
        addProvenSkill({ userId: helperId, skillId, at })
      }
    }
    // The proof counts at once: the badges of both sides (§8.2)
    evaluateBadges(helperId, at)
    evaluateBadges(row.authorId, at)
    tell(row, helperId, 'help_confirmed', userId, {
      eligible: decision.eligible,
    })
  })()

/** « Was this helpful? → No »: closed, no proof (§7.2, §8.3) */
export const declineHelp = (userId: number, helpRequestId: number) =>
  db.transaction(() => {
    const row = rowOf(helpRequestId)
    requireAuthor(row, userId)
    if (row.status !== 'review_submitted' && row.status !== 'delivered') {
      throw conflict('Only a delivered help can be judged')
    }
    move(row, 'closed_unhelpful')
    Entry.insert.HELP_REQUEST_CLOSED({ userId, helpRequestId, source })
    tell(row, row.acceptedBy, 'help_declined', userId)
  })()

/*
 * The thread of the request: the requester and the helper only (§7.2)
 */

const TALKING = ['accepted', 'review_submitted', 'delivered']

// The thread keeps the pace of the direct messages (§10.6, §16)
export const HELP_MESSAGE_RATE = {
  perMinute: { count: 20, per: 60 },
  perDay: { count: 1000, per: 24 * 3600 },
}

const countMessages = sql<Window, { me: number; since: number }>`
  SELECT count(*) AS n, min(createdAt) AS oldest FROM helpMessage
  WHERE authorId = :me AND createdAt > :since
`.get

export const postHelpMessage = (
  userId: number,
  helpRequestId: number,
  text: string,
) =>
  db.transaction(() => {
    const body = text.trim()
    if (!body) throw new respond.BadRequestError({ message: 'Empty message' })
    if (body.length > MESSAGE_MAX) {
      throw new respond.BadRequestError({ message: 'Message too long' })
    }
    const row = rowOf(helpRequestId)
    if (row.authorId !== userId && row.acceptedBy !== userId) {
      throw forbidden('Only the requester and the helper write here')
    }
    if (!TALKING.includes(row.status)) {
      throw conflict('The thread is closed')
    }
    within(
      countMessages,
      HELP_MESSAGE_RATE.perMinute,
      userId,
      'Too many messages',
    )
    within(
      countMessages,
      HELP_MESSAGE_RATE.perDay,
      userId,
      'Too many messages today',
    )
    HelpMessage.insert({
      helpRequestId,
      authorId: userId,
      body,
      createdAt: now(),
    })
    // Counts as activity of the helper, against a release (§7.2)
    Entry.insert.HELP_MESSAGE_CREATED({ userId, helpRequestId, source })
    // The other side is told, with the start of the message (§7.2)
    tell(
      row,
      userId === row.authorId ? row.acceptedBy : row.authorId,
      'help_message',
      userId,
      { excerpt: body.length > 90 ? `${body.slice(0, 88)}…` : body },
    )
  })()

/*
 * The detail of a request
 */

const listMessages = sql<
  { author: string; authorId: number; body: string; createdAt: number },
  number
>`
  SELECT githubUsername AS author, authorId, body, helpMessage.createdAt
  FROM helpMessage JOIN user ON user.userId = helpMessage.authorId
  WHERE helpRequestId = ? ORDER BY helpMessage.createdAt, helpMessageId
`.all

const listEvents = sql<
  { type: number; at: number; login: string | null },
  number
>`
  SELECT entry.type, entry.createdAt AS at, user.githubUsername AS login
  FROM entry LEFT JOIN user ON user.userId = entry.userId
  WHERE entry.helpRequestId = ? ORDER BY entry.createdAt, entry.id
`.all

// What the timeline of the page shows: the lifecycle, not the messages
const shownEvents = new Set([
  'HELP_REQUEST_CREATED',
  'HELP_REQUEST_ACCEPTED',
  'HELP_REQUEST_WITHDRAWN',
  'HELP_REQUEST_RELEASED',
  'HELP_REQUEST_REOPENED',
  'HELP_REQUEST_EXPIRED',
  'HELP_REQUEST_CANCELLED',
  'HELP_REQUEST_DELIVERED',
  'HELP_REQUEST_CLOSED',
  'REVIEW_SUBMITTED',
  'REVIEW_HELP_CONFIRMED',
  'HELP_CONFIRMED',
])

/**
 * A request as its page shows it: any developer reads an open request; the
 * thread is for the requester and the helpers it had
 */
export const getHelpDetail = (userId: number, helpRequestId: number) => {
  const request = getHelpRequest(helpRequestId)
  const row = getRow(helpRequestId)
  if (!request || !row) throw notFound()
  const messages = listMessages(helpRequestId)
  const inThread = row.authorId === userId || row.acceptedBy === userId ||
    messages.some((m) => m.authorId === userId)
  return {
    ...request,
    matches: matchesFor(helpRequestId, {
      userId,
      isAuthor: row.authorId === userId,
    }),
    releasableAt: releasableAt(row),
    left: hasLeft(helpRequestId, userId),
    messages: inThread
      ? messages.map(({ author, body, createdAt }) => ({
        author,
        body,
        createdAt,
      }))
      : [],
    timeline: listEvents(helpRequestId)
      .map(({ type, at, login }) => ({
        event: entryNames[type as keyof typeof entryNames] as string,
        at,
        login: login ?? '',
      }))
      .filter((e) => shownEvents.has(e.event)),
  }
}

/*
 * « Pour moi »: the open requests the developer was matched with (§7.3)
 */

// By batches, best score first (§12.7)
const listForMe = sql<
  { helpRequestId: number; score: number; reasons: string },
  Slice & { userId: number }
>`
  SELECT helpMatch.helpRequestId, score, reasons FROM helpMatch
  JOIN helpRequest ON helpRequest.helpRequestId = helpMatch.helpRequestId
  WHERE helpMatch.userId = :userId AND helpMatch.status = 'notified'
    AND helpRequest.status = 'open'
    AND ${after('score', 'helpMatch.helpRequestId')}
  ORDER BY score DESC, helpMatch.helpRequestId DESC
  LIMIT :limit
`.all

/** A batch of the open requests matched with the developer, from a cursor */
export const listHelpForMe = (userId: number, before = '') => {
  const { items, next } = readBatch(
    before,
    (slice) => listForMe({ ...slice, userId }),
    (row) => ({ value: row.score, id: row.helpRequestId }),
  )
  // The requests of the batch in one read, their images in another
  const requests = getHelpRequests(items.map((row) => row.helpRequestId))
  return {
    items: items.flatMap(({ helpRequestId, score, reasons }) => {
      const request = requests.get(helpRequestId)
      return request
        ? [{ ...request, score, reasons: explain(JSON.parse(reasons)) }]
        : []
    }),
    next,
  }
}
