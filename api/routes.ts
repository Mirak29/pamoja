import { makeRouter } from '@01edu/api/router'
import { log } from '/api/lib/log.ts'

// GET/api/health and GET/api/doc are added by makeRouter
const defs = {}

export type RouteDefinitions = typeof defs
export const routeHandler = makeRouter(defs, { log })
