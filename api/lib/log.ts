import { type Log, logger } from '@01edu/api/log'
import { APP_ENV } from '/api/lib/env.ts'

type Level = 'info' | 'error' | 'warn' | 'debug'

// An error says its message and where it came from; as is, JSON drops both
const readable = (_: string, value: unknown) =>
  value instanceof Error
    ? { name: value.name, message: value.message, stack: value.stack }
    : value

/**
 * In production, one JSON line per event on the output of the container,
 * read with `docker logs` (§17.4). The logger of @01edu/api sends them to
 * the devtools of 01edu, which Pamoja does not use: it refuses to start
 * without them.
 */
export const jsonLog = (write = console): Log => {
  const line = (level: Level, event: string, props?: Record<string, unknown>) =>
    (level === 'error' || level === 'warn' ? write.error : write.log)(
      JSON.stringify(
        { at: new Date().toISOString(), level, event, props },
        readable,
      ),
    )
  return Object.assign(line, {
    error: (event: string, props?: Record<string, unknown>) =>
      line('error', event, props),
    debug: (event: string, props?: Record<string, unknown>) =>
      line('debug', event, props),
    warn: (event: string, props?: Record<string, unknown>) =>
      line('warn', event, props),
    info: (event: string, props?: Record<string, unknown>) =>
      line('info', event, props),
  })
}

export const log: Log = APP_ENV === 'prod' ? jsonLog() : await logger({})

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
