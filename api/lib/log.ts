import { logger } from '@01edu/api/log'
import { APP_ENV } from '/api/lib/env.ts'

export const log = await logger({})

// The dev logger builds a call stack and prints several lines per request.
// Suppress only these informational events during a local load test:
// the API also uses the event name `out` for errors, which must stay visible.
if (APP_ENV === 'dev' && Deno.env.get('PAMOJA_LOAD_TEST') === '1') {
  const requestEvents = new Set(['in', 'in-params', 'out'])
  const info = log.info
  log.info = (event, props) => {
    if (!requestEvents.has(event)) info(event, props)
  }
}

/** What a caught error says, whatever was thrown */
export const errorMessage = (err: unknown) =>
  err instanceof Error ? err.message : String(err)
