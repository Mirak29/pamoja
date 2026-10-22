import { makeRouter, route } from '@01edu/api/router'
import { respond } from '@01edu/api/response'
import { ARR, BOOL, LIST, NUM, OBJ, optional, STR } from '@01edu/api/validator'
import {
  authorizationUrl,
  clearNonce,
  githubUserFromCode,
  isSimulated,
  NONCE_COOKIE,
  withNonce,
} from '/api/github-oauth.ts'
import { openEvents, refreshListeners } from '/api/events.ts'
import {
  importRepository,
  listRepositories,
  previewRepository,
} from '/api/import.ts'
import { listMyProjects } from '/api/projects.ts'
import { receiveWebhook } from '/api/webhooks.ts'
import { confirmInstallation, installationUrl } from '/api/installation.ts'
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
import { getLogin } from '/api/user.ts'

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
    fn: async () => {
      const { url, nonce } = await authorizationUrl()
      return withNonce(respond.OK({ url }), nonce)
    },
    output: OBJ({
      url: STR('Where to send the browser: GitHub, or the callback in dev'),
    }),
    description: 'Start the GitHub login',
  }),

  'POST/api/auth/github/callback': route({
    fn: async (ctx, params) => {
      const github = await githubUserFromCode(
        params,
        ctx.cookies[NONCE_COOKIE],
      )
      const source = isSimulated ? 'demo' : 'github'
      const { userId, created } = findOrCreateGithubUser(github, source)
      const user = getCurrentUser(userId)!
      log.info('user-login', { userId, created })
      const session = await createSession(userId, source)
      return clearNonce(
        setSessionCookie(respond.OK({ ...user, created }), session),
      )
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
   * GitHub import, level 1 (§5.4)
   */
  'GET/api/github/repositories': route({
    authorize: withSession,
    fn: (ctx) => listRepositories(getLogin(ctx.session.userId)),
    output: ARR(
      OBJ({
        owner: STR('GitHub owner'),
        name: STR('Repository name'),
        description: STR('Description, empty if none'),
        language: STR('Main language, empty if none'),
        stars: NUM('Stars'),
        pushedAt: NUM('Last push, in seconds'),
        existing: STR('Slug of its Pamoja project, empty if not imported'),
      }),
      'Public repositories owned by the developer, forks excluded',
    ),
    description: 'Repositories the developer can import',
  }),

  'GET/api/github/repository': route({
    authorize: withSession,
    fn: (ctx, { name }) =>
      previewRepository(getLogin(ctx.session.userId), name),
    input: OBJ({ name: STR('Repository name, owned by the developer') }),
    output: OBJ({
      owner: STR('GitHub owner'),
      name: STR('Repository name'),
      description: STR('Description'),
      readme: STR('README in Markdown, empty if none'),
      stars: NUM('Stars'),
      forks: NUM('Forks'),
      topics: ARR(STR('Topic')),
      languages: ARR(
        OBJ({
          name: STR('Language'),
          share: NUM('Share of the code, percent'),
        }),
      ),
      contributors: NUM('Contributors'),
      openIssues: NUM('Open issues'),
      openPullRequests: NUM('Open PRs'),
      release: STR('Last release tag, empty if none'),
      releasedAt: NUM('Last release, in seconds, 0 if none'),
      pushedAt: NUM('Last push, in seconds'),
      skills: ARR(STR('Skill of the vocabulary')),
      existing: STR('Slug of its Pamoja project, empty if not imported'),
    }),
    description: 'What the import shows before it is confirmed',
  }),

  'POST/api/project/import': route({
    authorize: withSession,
    fn: async (ctx, input) => {
      assertKnown(input.skills, skills, 'skills')
      const userId = ctx.session.userId
      const created = await importRepository(
        { userId, login: getLogin(userId) },
        input,
      )
      // The new member hears its project at once on the open pages (§13.2)
      refreshListeners(userId)
      return created
    },
    input: OBJ({
      name: STR('Repository name, owned by the developer'),
      title: STR('Project name; empty keeps the repository name'),
      description: STR('Description; empty keeps the one of GitHub'),
      vision: STR('Vision, empty if none'),
      skills: ARR(STR('Skill of the vocabulary'), 'The stack'),
      needs: ARR(STR('Need'), 'What the project looks for'),
    }),
    output: OBJ({ slug: STR('Slug of the new project') }),
    description: 'Import a public repository as a project',
  }),

  /*
   * GitHub import, level 2: the installation (§5.4)
   */
  'GET/api/github/installation/start': route({
    authorize: withSession,
    fn: async (ctx, { project }) => {
      const { url, nonce } = await installationUrl(ctx.session.userId, project)
      return withNonce(respond.OK({ url }), nonce)
    },
    input: OBJ({ project: STR('Slug of a project with a repository') }),
    output: OBJ({
      url: STR('Installation page of the app, or the callback page in dev'),
    }),
    description: 'Start the live sync of a project: install the app',
  }),

  'POST/api/github/installation/confirm': route({
    authorize: withSession,
    fn: async (ctx, input) =>
      clearNonce(respond.OK(
        await confirmInstallation(
          ctx.session.userId,
          input,
          ctx.cookies[NONCE_COOKIE],
        ),
      )),
    input: OBJ({
      code: STR('Code returned by GitHub with the installation'),
      installationId: STR('installation_id returned by GitHub'),
      state: STR('State of the installation start'),
    }),
    output: OBJ({
      slug: STR('The project'),
      live: BOOL('All three checks passed: the repo is live'),
      checks: ARR(
        OBJ({
          name: LIST(['identity', 'coverage', 'admin'], 'Check'),
          ok: BOOL('Passed'),
        }),
        'Identity, coverage and admin right (§5.4)',
      ),
    }),
    description: 'The return from the installation: three checks, then live',
  }),

  // No `input`: the router leaves the body unread, and the signature is
  // checked on the raw one. No `authorize`: GitHub signs instead (§5.5).
  'POST/api/github/webhook': route({
    fn: (ctx) => receiveWebhook(ctx.req),
    description: 'A GitHub event: checked, kept, answered 202, processed later',
  }),

  'GET/api/projects': route({
    authorize: withSession,
    fn: (ctx) => listMyProjects(ctx.session.userId),
    output: ARR(
      OBJ({
        slug: STR(),
        name: STR(),
        description: STR(),
        vision: STR(),
        status: STR(),
        skills: ARR(STR()),
        createdAt: NUM(),
        owner: STR('Login of the owner'),
        members: ARR(OBJ({ login: STR(), role: STR() })),
        followers: ARR(STR('Login')),
        needs: ARR(STR('Open need')),
        repository: optional(OBJ({
          owner: STR(),
          name: STR(),
          syncMode: STR('poll or live'),
          readme: STR(),
          stars: NUM(),
          topics: ARR(STR()),
          languages: ARR(OBJ({ name: STR(), share: NUM() })),
          contributors: NUM(),
          release: STR(),
          releasedAt: NUM(),
          lastSyncedAt: NUM(),
          issues: ARR(OBJ({
            number: NUM(),
            title: STR(),
            state: STR(),
            labels: ARR(STR()),
            authorLogin: STR(),
            comments: NUM(),
            createdAt: NUM(),
          })),
          pullRequests: ARR(OBJ({
            number: NUM(),
            title: STR(),
            state: STR('open, merged or closed'),
            authorLogin: STR(),
            branch: STR(),
            createdAt: NUM(),
          })),
        })),
      }),
      'Projects the developer is a member of',
    ),
    description: 'The projects of the signed-in developer',
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
