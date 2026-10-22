import { sql } from '@01edu/db'
import { now } from '@01edu/time'
import { Entry } from '/api/entries.ts'
import { Notification } from '/api/schema.ts'

// A notification for one developer (§7.4): a row of their inbox, and an entry
// that reaches their open pages. The center and the toast come with PAM-210.

export type NotificationCategory =
  | 'for-you'
  | 'projects'
  | 'communities'
  | 'social'
  | 'system'

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

const listInbox = sql<Row, number>`
  SELECT notificationId, type, category, actor.githubUsername AS actor,
    payload, readAt, notification.createdAt
  FROM notification
  LEFT JOIN user AS actor ON actor.userId = notification.actorId
  WHERE notification.userId = ?
  ORDER BY notification.createdAt DESC, notificationId DESC
  LIMIT 100
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
    readAt: row.readAt ?? 0,
    createdAt: row.createdAt,
  }
}

export const listNotifications = (userId: number) =>
  listInbox(userId).map(shown)

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
