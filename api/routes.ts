import { makeRouter, route } from '@01edu/api/router'
import { respond } from '@01edu/api/response'
import { ARR, BOOL, LIST, NUM, OBJ, STR } from '@01edu/api/validator'
import {
  authorizationUrl,
  githubUserFromCode,
  isSimulated,
} from '/api/github-oauth.ts'
import { openEvents } from '/api/events.ts'
import { log } from '/api/lib/log.ts'
import {
  createSession,
  endSession,
  setSessionCookie,
  withOptionalSession,
  withSession,
} from '/api/session.ts'
import {
  findOrCreateGithubUser,
  getCurrentUser,
  updateIntents,
  updateProfile,
  updateSkills,
} from '/api/user.ts'
import { domains, intents, skills } from '/api/vocabulary.ts'

const matchingMode = LIST(
  ['instant', 'digest', 'off'],
  'How help requests reach the developer (§7.4)',
)

const currentUser = {
  userId: NUM('Id of the developer'),
  login: STR('GitHub login'),
  displayName: STR('Name shown on the profile'),
  avatarUrl: STR('GitHub avatar'),
  headline: STR('One line under the name, empty if none'),
  bio: STR('Bio, empty if none'),
  country: STR('ISO code of an African country, or as written'),
  city: STR('City, empty if none'),
  website: STR('Website, empty if none'),
  matchingMode,
  skills: ARR(
    OBJ({
      name: STR('Technology of the vocabulary'),
      sources: ARR(STR('declared, github or platform_activity')),
    }),
    'Technologies, each with what backs it (§6.1)',
  ),
  domains: ARR(STR('Domain of the vocabulary'), 'Domains'),
  intents: ARR(STR('Intent of the vocabulary'), 'Intents'),
}

// Only names of the vocabulary are saved: a developer never creates one
const assertKnown = (names: string[], known: string[], what: string) => {
  const unknown = names.filter((name) => !known.includes(name))
  if (unknown.length) {
    throw new respond.BadRequestError({
      message: `Unknown ${what}: ${unknown.join(', ')}`,
    })
  }
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
    description: 'The signed in developer and their profile',
  }),

  /*
   * Realtime (§13.2)
   */
  'GET/api/events': route({
    authorize: withSession,
    fn: (ctx) => {
      if (!ctx.req.headers.get('accept')?.includes('text/event-stream')) {
        throw new respond.BadRequestError({
          message: 'Must accept text/event-stream',
        })
      }
      return openEvents(ctx.session.userId)
    },
    description: 'Entries as they happen, and an ack every 15 seconds',
  }),

  /*
   * Profile (§6.1, §9)
   */
  'POST/api/user/profile/update': route({
    authorize: withSession,
    fn: (ctx, fields) => {
      updateProfile(ctx.session.userId, fields)
      return getCurrentUser(ctx.session.userId)!
    },
    input: OBJ({
      displayName: STR('Name shown; empty keeps the current one'),
      headline: STR('One line under the name'),
      bio: STR('Bio'),
      country: STR('ISO code of an African country, or as written'),
      city: STR('City'),
      website: STR('Website'),
      matchingMode,
    }, 'The whole editable profile: an empty field is emptied'),
    output: OBJ(currentUser, 'The profile saved'),
    description: 'Save the profile',
  }),

  'POST/api/user/skills/update': route({
    authorize: withSession,
    fn: (ctx, names) => {
      assertKnown(names.skills, skills, 'skills')
      assertKnown(names.domains, domains, 'domains')
      updateSkills(ctx.session.userId, names)
      return getCurrentUser(ctx.session.userId)!
    },
    input: OBJ({
      skills: ARR(STR('Technology of the vocabulary'), 'Declared technologies'),
      domains: ARR(STR('Domain of the vocabulary'), 'Declared domains'),
    }, 'Replace the declared skills; those from GitHub stay'),
    output: OBJ(currentUser, 'The profile saved'),
    description: 'Save the declared skills and domains',
  }),

  'POST/api/user/intents/update': route({
    authorize: withSession,
    fn: (ctx, input) => {
      assertKnown(input.intents, intents, 'intents')
      updateIntents(ctx.session.userId, input.intents)
      return getCurrentUser(ctx.session.userId)!
    },
    input: OBJ({
      intents: ARR(STR('Intent of the vocabulary'), 'All the intents'),
    }),
    output: OBJ(currentUser, 'The profile saved'),
    description: 'Save the intents, used by the matching',
  }),
}

export type RouteDefinitions = typeof defs
export const routeHandler = makeRouter(defs, { log })
