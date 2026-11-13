import { sql } from '@01edu/db'
import { now } from '@01edu/time'
import { Entry } from '/api/entries.ts'
import { after, readBatch, type Slice } from '/api/lib/cursor.ts'
import { Notification } from '/api/schema.ts'

// A notification for one developer (§7.4): a row of their inbox, and an entry
// that reaches their open pages. The center and the toast come with PAM-210.

export const NOTIFICATION_CATEGORIES = [
  'for-you',
  'projects',
  'communities',
  'social',
  'system',
] as const

export type NotificationCategory = typeof NOTIFICATION_CATEGORIES[number]

export const createNotification = (
  { userId, type, category, actorId, payload }: {
    userId: number
    type: string
    category: NotificationCategory
    actorId?: number
    payload: Record<string, unknown>
  },
) => {
  const notificationId = Notification.insert({
    userId,
    type,
    category,
    actorId: actorId ?? null,
    payload,
    createdAt: now(),
  })
  Entry.insert.NOTIFICATION_CREATED({
    userId,
    notificationId,
    source: 'platform',
  })
  return notificationId
}

/*
 * The inbox (§7.4)
 */

type Row = {
  notificationId: number
  type: string
  category: string
  actor: string | null
  payload: string
  readAt: number | null
  createdAt: number
}

// By batches, newest first (§12.7)
// One query by tab, each from its own index: all of them, or one category.
// A tab filtered by the page would read batches of every category to find
// its own, up to the whole inbox (§12.7)
const inbox = (where: string) =>
  sql<Row, Slice & { userId: number; category?: string }>`
    SELECT notificationId, type, category, actor.githubUsername AS actor,
      payload, readAt, notification.createdAt
    FROM notification
    LEFT JOIN user AS actor ON actor.userId = notification.actorId
    WHERE notification.userId = :userId ${where}
      AND ${after('notification.createdAt', 'notificationId')}
    ORDER BY notification.createdAt DESC, notificationId DESC
    LIMIT :limit
  `.all
const listInbox = inbox('')
const listCategory = inbox('AND notification.category = :category')

// Every unread one, not only those of the batch: the counters of the menu
// and of the tabs. Through the index of the unread ones: without ANALYZE,
// SQLite would walk the whole inbox by category
const countUnread = sql<{ category: string; count: number }, number>`
  SELECT category, count(*) AS count
  FROM notification INDEXED BY notification_inbox
  WHERE userId = ? AND readAt IS NULL
  GROUP BY category
`.all

// What a notification says: the page writes the sentence in its language
const shown = (row: Row) => {
  const payload = JSON.parse(row.payload) as Record<string, unknown>
  return {
    id: row.notificationId,
    type: row.type,
    category: row.category,
    actor: row.actor ?? '',
    helpRequestId: Number(payload.helpRequestId ?? 0),
    title: String(payload.title ?? ''),
    project: String(payload.project ?? ''),
    score: Number(payload.score ?? 0),
    minutes: Number(payload.minutes ?? 0),
    skills: Array.isArray(payload.skills) ? payload.skills.map(String) : [],
    excerpt: String(payload.excerpt ?? ''),
    // A confirmed help that counts in the reputation (§8.4)
    eligible: payload.eligible === 0 ? 0 : 1,
    badge: String(payload.badge ?? ''),
    level: Number(payload.level ?? 0),
    // A candidature to join a project (§6.6): -1 pending for the managers,
    // 0 refused or 1 accepted for the applicant
    joinRequestId: Number(payload.joinRequestId ?? 0),
    projectSlug: String(payload.projectSlug ?? ''),
    accepted: payload.accepted === 1 ? 1 : payload.accepted === 0 ? 0 : -1,
    readAt: row.readAt ?? 0,
    createdAt: row.createdAt,
  }
}

/**
 * A batch of the inbox, of a category or all of them, from a cursor, with
 * every unread one counted
 */
export const listNotifications = (
  userId: number,
  before = '',
  category = '',
) => {
  const { items, next } = readBatch(
    before,
    (slice) =>
      category
        ? listCategory({ ...slice, userId, category })
        : listInbox({ ...slice, userId }),
    (row) => ({ value: row.createdAt, id: row.notificationId }),
  )
  return { items: items.map(shown), next, unread: countUnread(userId) }
}

const setRead = sql<undefined, { userId: number; id: number; at: number }>`
  UPDATE notification SET readAt = :at
  WHERE notificationId = :id AND userId = :userId AND readAt IS NULL
`.run

const setAllRead = sql<undefined, { userId: number; at: number }>`
  UPDATE notification SET readAt = :at
  WHERE userId = :userId AND readAt IS NULL
`.run

/** Only the recipient reads their notification */
export const readNotification = (userId: number, id: number) =>
  setRead({ userId, id, at: now() })

export const readAllNotifications = (userId: number) =>
  setAllRead({ userId, at: now() })
