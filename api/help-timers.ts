import { db, sql } from '@01edu/db'
import { now } from '@01edu/time'
import { Entry } from '/api/entries.ts'
import { lastHelperActivity } from '/api/help-lifecycle.ts'
import {
  CONFIRM_REMINDER_AFTER,
  CONFIRM_WITHIN,
  HELPER_REMINDER_AFTER,
  NEXT_WAVE_AFTER,
} from '/api/help-rules.ts'
import { sendWave } from '/api/matching.ts'
import { log } from '/api/lib/log.ts'
import { createNotification } from '/api/notifications.ts'

// The delays of §7.2, played by the server every 10 minutes: an open request
// expires after 7 days, a silent helper is reminded after 24 h, a requester
// who does not answer is reminded after 24 h and the help is closed
// unconfirmed after 7 days. Each step happens once.

const source = 'platform'

const listExpired = sql<{ helpRequestId: number; authorId: number }, number>`
  SELECT helpRequestId, authorId FROM helpRequest
  WHERE status = 'open' AND expiresAt <= ?
`.all

const setExpired = sql<undefined, { helpRequestId: number; at: number }>`
  UPDATE helpRequest SET status = 'expired', updatedAt = :at
  WHERE helpRequestId = :helpRequestId AND status = 'open'
`.run

type Accepted = {
  helpRequestId: number
  authorId: number
  targetUserId: number | null
  projectId: number | null
  pullRequestId: number | null
  status: string
  acceptedBy: number
  acceptedAt: number
  title: string
}

const listToRemindHelper = sql<Accepted, undefined>`
  SELECT helpRequestId, authorId, targetUserId, projectId, pullRequestId,
    status, acceptedBy, acceptedAt, title
  FROM helpRequest
  WHERE status = 'accepted' AND helperRemindedAt IS NULL
`.all

const setHelperReminded = sql<undefined, { helpRequestId: number; at: number }>`
  UPDATE helpRequest SET helperRemindedAt = :at
  WHERE helpRequestId = :helpRequestId
`.run

type Answered = {
  helpRequestId: number
  authorId: number
  acceptedBy: number | null
  title: string
  deliveredAt: number
  confirmRemindedAt: number | null
}

// deliveredAt: when the helper delivered, or when GitHub showed the review
// (PAM-211)
const listAnswered = sql<Answered, undefined>`
  SELECT helpRequestId, authorId, acceptedBy, title, deliveredAt,
    confirmRemindedAt
  FROM helpRequest
  WHERE status IN ('review_submitted', 'delivered') AND deliveredAt IS NOT NULL
`.all

const setConfirmReminded =
  sql<undefined, { helpRequestId: number; at: number }>`
  UPDATE helpRequest SET confirmRemindedAt = :at
  WHERE helpRequestId = :helpRequestId
`.run

const setUnconfirmed = sql<undefined, { helpRequestId: number; at: number }>`
  UPDATE helpRequest SET status = 'closed_unconfirmed', updatedAt = :at
  WHERE helpRequestId = :helpRequestId
    AND status IN ('review_submitted', 'delivered')
`.run

const listWaiting = sql<{ helpRequestId: number }, number>`
  SELECT helpRequestId FROM helpRequest
  WHERE status = 'open' AND targetUserId IS NULL
    AND coalesce(lastWaveAt, createdAt) <= ?
`.all

/** One pass over the delays; `at` lets the tests move the clock */
export const runHelpTimers = (at = now()) => {
  timers(at)
  // Two hours without an acceptance: the next wave (§7.3)
  for (const { helpRequestId } of listWaiting(at - NEXT_WAVE_AFTER)) {
    sendWave(helpRequestId, at)
  }
}

const timers = (at: number) =>
  db.transaction(() => {
    for (const { helpRequestId, authorId } of listExpired(at)) {
      if (!setExpired({ helpRequestId, at })) continue
      Entry.insert.HELP_REQUEST_EXPIRED({
        userId: authorId,
        helpRequestId,
        source,
      })
    }
    for (const row of listToRemindHelper()) {
      if (lastHelperActivity(row) + HELPER_REMINDER_AFTER > at) continue
      setHelperReminded({ helpRequestId: row.helpRequestId, at })
      createNotification({
        userId: row.acceptedBy,
        type: 'help_helper_reminder',
        category: 'for-you',
        actorId: row.authorId,
        payload: { helpRequestId: row.helpRequestId, title: row.title },
      })
    }
    for (const row of listAnswered()) {
      if (row.deliveredAt + CONFIRM_WITHIN <= at) {
        if (!setUnconfirmed({ helpRequestId: row.helpRequestId, at })) continue
        Entry.insert.HELP_REQUEST_CLOSED({
          userId: row.authorId,
          helpRequestId: row.helpRequestId,
          source,
        })
        continue
      }
      if (
        !row.confirmRemindedAt &&
        row.deliveredAt + CONFIRM_REMINDER_AFTER <= at
      ) {
        setConfirmReminded({ helpRequestId: row.helpRequestId, at })
        createNotification({
          userId: row.authorId,
          type: 'help_confirm_reminder',
          category: 'for-you',
          actorId: row.acceptedBy ?? undefined,
          payload: { helpRequestId: row.helpRequestId, title: row.title },
        })
      }
    }
  })()

export const HELP_TIMERS_EVERY = 10 * 60 * 1000

/** Started by the server: at once, then every 10 minutes */
export const startHelpTimers = () => {
  const tick = () => {
    try {
      runHelpTimers()
    } catch (err) {
      log.error('help-timers-error', {
        message: err instanceof Error ? err.message : String(err),
      })
    }
  }
  tick()
  return setInterval(tick, HELP_TIMERS_EVERY)
}
