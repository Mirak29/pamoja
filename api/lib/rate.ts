import { respond } from '@01edu/api/response'
import { now } from '@01edu/time'

// Limits of the routes that write (§16): how many actions in a window, and
// when the oldest of them leaves it. Two places, one rule:
// - in the domain (`within` counted in the database, or `memoryLimit`) when
//   only some calls count: a like, a repost, a follow taken back never does;
// - on the route (`limitedSession` of api/routes.ts) for plain edits, where
//   every call counts.

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
  // Oldest first: the ones out of the window are dropped from the front
  const times = new Map<number, number[]>()
  let longest = 0
  let added = 0
  // Developers who stopped acting leave memory, every 1 000 actions
  const sweep = (since: number) => {
    for (const [me, list] of times) {
      if ((list.at(-1) ?? 0) <= since) times.delete(me)
    }
  }
  return {
    count: ({ me, since }: { me: number; since: number }): Window => {
      longest = Math.max(longest, now() - since)
      const list = times.get(me)
      if (!list) return { n: 0, oldest: null }
      let out = 0
      while (out < list.length && list[out] <= since) out++
      if (out) list.splice(0, out)
      if (!list.length) times.delete(me)
      return { n: list.length, oldest: list[0] ?? null }
    },
    add: (me: number, at = now()) => {
      const list = times.get(me)
      list ? list.push(at) : times.set(me, [at])
      if (++added % 1000 === 0) sweep(at - longest)
    },
    clear: () => times.clear(),
  }
}

/**
 * A limit kept in memory (§16): refuses the action of `me` past `limit` in
 * the window, or counts it. For the actions the database does not date, or
 * dates in a table shared with others
 *
 * @example
 * const liked = memoryLimit({ count: 600, per: 3600 }, 'Too many likes')
 * liked(me) // before saving the like
 */
export const memoryLimit = (
  limit: { count: number; per: number },
  message: string,
) => {
  const window = memoryWindow()
  return (me: number) => {
    within(window.count, limit, me, message)
    window.add(me)
  }
}
