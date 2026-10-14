import { makeRouter, route } from '@01edu/api/router'
import { respond } from '@01edu/api/response'
import { BOOL, NUM, OBJ, STR } from '@01edu/api/validator'
import {
  authorizationUrl,
  githubUserFromCode,
  isSimulated,
} from '/api/github-oauth.ts'
import { log } from '/api/lib/log.ts'
import {
  createSession,
  endSession,
  setSessionCookie,
  withOptionalSession,
  withSession,
} from '/api/session.ts'
import { findOrCreateGithubUser, getCurrentUser } from '/api/user.ts'

const currentUser = {
  userId: NUM('Id of the developer'),
  login: STR('GitHub login'),
  displayName: STR('Name shown on the profile'),
  avatarUrl: STR('GitHub avatar'),
}

// GET/api/health and GET/api/doc are added by makeRouter
const defs = {
  /*
   * Auth (§5.3)
   */
  'GET/api/auth/github': route({
    fn: () => ({ url: authorizationUrl() }),
    output: OBJ({
      url: STR('Where to send the browser: GitHub, or the callback in dev'),
    }),
    description: 'Start the GitHub login',
  }),

  'POST/api/auth/github/callback': route({
    fn: async (_ctx, params) => {
      const github = await githubUserFromCode(params)
      const source = isSimulated ? 'demo' : 'github'
      const { userId, created } = findOrCreateGithubUser(github, source)
      const user = getCurrentUser(userId)!
      log.info('user-login', { userId, created })
      const session = await createSession(userId, source)
      return setSessionCookie(respond.OK({ ...user, created }), session)
    },
    input: OBJ({
      code: STR('Code returned by GitHub'),
      state: STR('State returned by GitHub'),
    }),
    output: OBJ({
      ...currentUser,
      created: BOOL('First login: the onboarding follows'),
    }, 'The developer now signed in'),
    description: 'End the GitHub login and open a session',
  }),

  'POST/api/auth/logout': route({
    authorize: withOptionalSession,
    fn: (ctx) => endSession(ctx.session),
    description: 'Close the session, even when the cookie was copied',
  }),

  'GET/api/user/me': route({
    authorize: withSession,
    fn: (ctx) => getCurrentUser(ctx.session.userId) ?? respond.Unauthorized(),
    output: OBJ(currentUser, 'The signed in developer'),
    description: 'The signed in developer',
  }),
}

export type RouteDefinitions = typeof defs
export const routeHandler = makeRouter(defs, { log })
