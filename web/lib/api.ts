import { ErrorWithData, makeClient } from '@01edu/api-client'
import type { RouteDefinitions } from '/api/routes.ts'

const BASE_URL = document.baseURI.endsWith('/')
  ? document.baseURI.slice(0, -1)
  : document.baseURI

export const api = makeClient<RouteDefinitions>(BASE_URL)

/**
 * The GitHub quota is spent (the server answers 503, §5.6): it comes back
 * within the hour, nothing is broken
 */
export const isQuotaError = (err: unknown) =>
  err instanceof Error && /quota/i.test(err.message)

/**
 * Seconds to wait when a limit of the server was reached (429, §16), or
 * undefined for any other error
 */
export const retryAfterOf = (err: unknown) => {
  const seconds = (err as { data?: { retryAfter?: number } }).data?.retryAfter
  return err instanceof Error && seconds ? seconds : undefined
}

/**
 * Why the server refused, when it answered and said it (`reason` of the
 * error, as `retryAfter`): undefined when it was not reached
 */
export const reasonOf = (err: unknown) =>
  err instanceof ErrorWithData
    ? (err.data as { reason?: string }).reason ?? 'refused'
    : undefined

export type ApiOutput = {
  [K in keyof typeof api]: Awaited<ReturnType<typeof api[K]['fetch']>>
}
