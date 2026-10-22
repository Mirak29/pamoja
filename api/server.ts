// Opens the database, runs the migrations, creates the tables (§14) and the
// entries (§13)
import '/api/entries.ts'
import { server } from '@01edu/api/server'
import { log } from '/api/lib/log.ts'
import { routeHandler } from '/api/routes.ts'
import { APP_ENV } from '/api/lib/env.ts'
import { startHelpTimers } from '/api/help-timers.ts'
import { startRefresh } from '/api/sync.ts'
import { startWorker } from '/api/webhooks.ts'
// What each GitHub event changes (§5.5): registered before the worker runs
import '/api/github-events.ts'

const fetch = server({ log, routeHandler })

export default {
  fetch(req: Request) {
    return fetch(req, new URL(req.url))
  },
}

// Polled repos refresh every 15 min (§5.4), the webhook worker picks up what
// a restart left (§5.5), the delays of help requests run every 10 min (§7.2);
// tests call them themselves
if (APP_ENV !== 'test') {
  startRefresh()
  startWorker()
  startHelpTimers()
}

log.info('server-start')
