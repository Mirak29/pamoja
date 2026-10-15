// Opens the database, runs the migrations, creates the tables (§14) and the
// entries (§13)
import '/api/entries.ts'
import { server } from '@01edu/api/server'
import { log } from '/api/lib/log.ts'
import { routeHandler } from '/api/routes.ts'
import { APP_ENV } from '/api/lib/env.ts'
import { startRefresh } from '/api/sync.ts'

const fetch = server({ log, routeHandler })

export default {
  fetch(req: Request) {
    return fetch(req, new URL(req.url))
  },
}

// Polled repos refresh every 15 min (§5.4); tests call it themselves
APP_ENV === 'test' || startRefresh()

log.info('server-start')
