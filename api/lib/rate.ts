import { respond } from '@01edu/api/response'
import { now } from '@01edu/time'

// Limits of the routes that write (§16): how many actions in a window, and
// when the oldest of them leaves it

/** How many actions in the window, and when the oldest happened */
export type Window = { n: number; oldest: number | null }

/**
 * A 429 when the window is full, with when to try again: once the oldest
 * action of the window leaves it
 */
export const within = (
  count: (window: { me: number; since: number }) => Window | undefined,
  limit: { count: number; per: number },
  me: number,
  message: string,
) => {
  const at = now()
  const window = count({ me, since: at - limit.per })!
  if (window.n < limit.count) return
  const retryAfter = Math.max(
    1,
    Math.ceil((window.oldest ?? at) + limit.per - at),
  )
  throw new respond.TooManyRequestsError(
    { message, retryAfter },
    { 'Retry-After': String(retryAfter) },
  )
}

/**
 * The actions of each developer kept in memory, for a limit `within` checks
 * without the database: one instance serves Pamoja (§12), and a restart
 * starts again from nothing. `me` 0 counts for everyone.
 */
export const memoryWindow = () => {
  const times = new Map<number, number[]>()
  return {
    count: ({ me, since }: { me: number; since: number }): Window => {
      const kept = (times.get(me) ?? []).filter((at) => at > since)
      times.set(me, kept)
      return { n: kept.length, oldest: kept[0] ?? null }
    },
    add: (me: number, at = now()) =>
      times.set(me, [...times.get(me) ?? [], at]),
    clear: () => times.clear(),
  }
}
