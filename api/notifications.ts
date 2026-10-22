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
