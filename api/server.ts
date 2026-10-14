// Opens the database, runs the migrations and creates the tables (§14)
import '/api/schema.ts'
import { server } from '@01edu/api/server'
import { log } from '/api/lib/log.ts'
import { routeHandler } from '/api/routes.ts'

const fetch = server({ log, routeHandler })

export default {
  fetch(req: Request) {
    return fetch(req, new URL(req.url))
  },
}

log.info('server-start')
