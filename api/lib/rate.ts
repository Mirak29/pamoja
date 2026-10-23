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
