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
import { startMediaCleanup } from '/api/media.ts'
import { startStaleReviews } from '/api/tracking.ts'
// What each GitHub event changes (§5.5): registered before the worker runs
import '/api/github-events.ts'

const fetch = server({ log, routeHandler })

export default {
  fetch(req: Request) {
    return fetch(req, new URL(req.url))
  },
}

// Polled repos refresh every 15 min (§5.4), the webhook worker picks up what
// a restart left (§5.5), the delays of help requests run every 10 min (§7.2),
// PRs without a review for 2 days reach #suivi (§6.8);
// tests call them themselves
if (APP_ENV !== 'test') {
  startRefresh()
  startWorker()
  startHelpTimers()
  // Uploads never attached, after 24 h (§17.3)
  startMediaCleanup()
  startStaleReviews()
}

log.info('server-start')
