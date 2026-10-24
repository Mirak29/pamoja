import { sql } from '@01edu/db'
import { Entry, type EntryListener } from '/api/entries.ts'
import { connectionClosed, connectionOpened } from '/api/presence.ts'

// Server-Sent Events (§13.2): the client never chooses what it receives, the
// server computes it from the database when the connection opens

const ids = (rows: { id: number }[]) => new Set(rows.map((row) => row.id))

const memberProjects = sql<{ id: number }, number>`
  SELECT projectId AS id FROM projectMember WHERE userId = ?
`.all
const followed = sql<{ id: number }, { userId: number; targetType: string }>`
  SELECT targetId AS id FROM follow
  WHERE followerId = :userId AND targetType = :targetType
`.all
const memberCommunities = sql<{ id: number }, number>`
  SELECT communityId AS id FROM communityMember WHERE userId = ?
`.all
const moderatedCommunities = sql<{ id: number }, number>`
  SELECT communityId AS id FROM communityMember
  WHERE userId = ? AND role = 'moderator'
`.all

const subscriptionsOf = (userId: number) => ({
  projectIds: ids(memberProjects(userId)),
  followedProjectIds: ids(followed({ userId, targetType: 'project' })),
  communityIds: ids(memberCommunities(userId)),
  moderatedCommunityIds: ids(moderatedCommunities(userId)),
  followedUserIds: ids(followed({ userId, targetType: 'user' })),
})

const listeners = Entry.insertListeners as unknown as Set<EntryListener>

/**
 * To call after a change of membership, follow or role: every open
 * connection of this developer receives what it now may (§13.2).
 */
export const refreshListeners = (userId: number) => {
  let subscriptions
  for (const listener of listeners) {
    if (listener.userId !== userId) continue
    Object.assign(listener, subscriptions ??= subscriptionsOf(userId))
  }
}

const encoder = new TextEncoder()
const ACK = encoder.encode('event: ack\ndata: \n\n')
const ACK_EVERY = 15_000

/** The event stream of a developer: entries as they happen, an ack every 15 s */
export const openEvents = (userId: number) => {
  let listener: EntryListener
  let heartbeat: ReturnType<typeof setInterval>
  let closed = false
  const close = () => {
    clearInterval(heartbeat)
    listeners.delete(listener)
    if (closed) return
    closed = true
    connectionClosed(userId)
  }
  const body = new ReadableStream<Uint8Array>({
    start(controller) {
      // The first ack tells the client the connection is up
      controller.enqueue(ACK)
      listener = {
        userId,
        ...subscriptionsOf(userId),
        connectionId: crypto.randomUUID(),
        controller,
      }
      listeners.add(listener)
      connectionOpened(userId)
      heartbeat = setInterval(() => {
        try {
          controller.enqueue(ACK)
        } catch {
          // The client left: the library also drops a listener it cannot
          // write to, at the next entry
          close()
        }
      }, ACK_EVERY)
    },
    cancel: close,
  })
  return new Response(body, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      'Connection': 'keep-alive',
    },
  })
}
