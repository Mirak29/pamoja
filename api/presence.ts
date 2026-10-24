import { sql } from '@01edu/db'
import { listeners } from '/api/entries.ts'
import { errorMessage, log } from '/api/lib/log.ts'

// Presence (§13.6): who is online, who is typing. Held in memory, by event
// stream, never written: a restart forgets it, the connections that come
// back tell it again. A developer is online while one of their tabs holds
// an event stream open.

const encoder = new TextEncoder()

/** At least one open event stream */
export const isOnline = (userId: number) => {
  for (const listener of listeners) {
    if (listener.userId === userId) return true
  }
  return false
}

/**
 * Sends a named event to every open stream of a developer. Not an entry: it
 * is gone once sent, and a developer away never receives it
 */
export const sendTo = (userId: number, event: string, data: unknown) => {
  const chunk = encoder.encode(
    `event: ${event}\ndata: ${JSON.stringify(data)}\n\n`,
  )
  for (const listener of listeners) {
    if (listener.userId !== userId) continue
    try {
      listener.controller.enqueue(chunk)
    } catch {
      // A stream closing: events.ts drops it
    }
  }
}

// Who sees a developer online (§10.6): the other one of each accepted
// conversation, with no block either way
const correspondents = sql<{ id: number }, number>`
  SELECT other.userId AS id FROM conversationMember AS me
  JOIN conversation ON conversation.conversationId = me.conversationId
    AND conversation.status = 'accepted'
  JOIN conversationMember AS other
    ON other.conversationId = me.conversationId AND other.userId != me.userId
  WHERE me.userId = ?
    AND NOT EXISTS (
      SELECT 1 FROM userBlock
      WHERE (blockerId = me.userId AND blockedId = other.userId)
         OR (blockerId = other.userId AND blockedId = me.userId)
    )
`.all

const loginOf = sql<{ login: string }, number>`
  SELECT githubUsername AS login FROM user WHERE userId = ?
`.get

const announce = (userId: number, online: boolean) => {
  const login = loginOf(userId)?.login
  if (!login) return
  for (const { id } of correspondents(userId)) {
    sendTo(id, 'presence', { login, online })
  }
}

/** A reload or a short loss of network is not leaving: 10 s of grace */
export const GRACE = 10_000

// The developers announced online, until announced gone
const announced = new Set<number>()

/** After a stream opened (events.ts) */
export const connectionOpened = (userId: number) => {
  if (announced.has(userId)) return
  announced.add(userId)
  announce(userId, true)
}

/** After a stream closed: gone if no other one opened meanwhile */
export const connectionClosed = (userId: number) => {
  const timer = setTimeout(() => {
    if (isOnline(userId) || !announced.delete(userId)) return
    try {
      announce(userId, false)
    } catch (err) {
      log.error('presence-error', { message: errorMessage(err) })
    }
  }, GRACE)
  Deno.unrefTimer(timer)
}
