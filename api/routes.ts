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
import { badgesOf, evaluateBadges } from '/api/badges.ts'
import { proofsOf } from '/api/proofs.ts'
import { getPublicProfile } from '/api/profile.ts'
import { tooLong } from '/api/limits.ts'
import {
  acceptConversation,
  declineConversation,
  getConversation,
  listConversations,
  readConversation,
  reportMessage,
  sendMessage,
  setBlocked,
  startConversation,
} from '/api/messages.ts'
import {
  listNotifications,
  readAllNotifications,
  readNotification,
} from '/api/notifications.ts'
import { previewWave } from '/api/matching.ts'
import { skillIdsOf } from '/api/skills.ts'
import {
  createHelpRequest,
  getHelpRequest,
  listHelpRequests,
  projectIdOf,
} from '/api/help.ts'
import {
  acceptHelp,
  cancelHelp,
  confirmHelp,
  declineHelp,
  deliverHelp,
  getHelpDetail,
  listHelpForMe,
  postHelpMessage,
  releaseHelp,
  reopenHelp,
  withdrawHelp,
} from '/api/help-lifecycle.ts'
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
  updateMatching,
  updateProfile,
  updateSkills,
} from '/api/user.ts'
import {
  domains,
  helpCategories,
  type HelpCategory,
  helpDurations,
  type HelpLevel,
  helpLevels,
  intents,
  type ReportReason,
  reportReasons,
  skills,
} from '/api/vocabulary.ts'
import { getLogin, userIdOfLogin } from '/api/user.ts'

const matchingMode = LIST(
  ['instant', 'digest', 'off'],
  'How help requests reach the developer (§7.4)',
)

const currentUser = {
  userId: NUM('Id of the developer'),
  login: STR('Login of Pamoja, the address /@login'),
  githubLogin: STR('Login on GitHub'),
  displayName: STR('Name shown on the profile'),
  avatarUrl: STR('GitHub avatar'),
  headline: STR('One line under the name, empty if none'),
  bio: STR('Bio, empty if none'),
  country: STR('ISO code of an African country, or as written'),
  city: STR('City, empty if none'),
  website: STR('Website, empty if none'),
  matchingMode,
  minScore: NUM('Score under which a help request does not reach them'),
  helpTypes: ARR(STR('Key of helpCategories'), 'Types of help accepted'),
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

// The other developer of a conversation (§10.6)
const person = OBJ({
  login: STR('Login'),
  name: STR('Name shown'),
  avatarUrl: STR('GitHub avatar'),
}, 'The other developer')

const conversationRights = {
  status: STR('pending, accepted; a declined request still reads pending'),
  incoming: BOOL('A request sent to the developer, to answer'),
  blockedByMe: BOOL('The developer blocked the other one'),
  canWrite: BOOL('The developer can send a message now'),
}

const helpRequestFields = {
  id: NUM('Id of the request'),
  author: STR('Login of the requester'),
  project: STR('Slug of the project, empty if none'),
  pullRequest: NUM('Number of the PR, 0 if none'),
  branch: STR('Branch of the PR, empty if none'),
  category: STR('Type of help, a key of helpCategories'),
  title: STR('Title'),
  description: STR('Description in Markdown'),
  skills: ARR(STR('Skill of the vocabulary')),
  expectedLevel: STR('A key of helpLevels, empty if none'),
  estimatedMinutes: NUM('Estimated duration, 0 if none'),
  videoUrl: STR('Video showing the problem, empty if none'),
  status: STR('Status of the lifecycle (§7.2)'),
  helper: STR('Login of the helper who accepted, empty if none'),
  acceptedAt: NUM('Acceptance, in seconds, 0 if none'),
  createdAt: NUM('Creation, in seconds'),
  demo: BOOL('Data of the seed'),
}

const helpRequest = OBJ(helpRequestFields, 'A help request (§7.1)')

// A criterion of « Pourquoi ce match ? » (§7.3); its fields depend on kind
const reason = OBJ({
  kind: LIST(
    ['skills', 'type', 'confirmed', 'availability', 'affinity', 'newcomer'],
    'Criterion',
  ),
  points: NUM('Points out of 100'),
  skills: optional(ARR(STR('Skill held'))),
  of: optional(NUM('Skills asked')),
  category: optional(STR('Type of help accepted')),
  count: optional(NUM('Confirmed helps on these skills')),
  review: optional(BOOL('They are reviews')),
  available: optional(BOOL('Available this week')),
  active: optional(BOOL('Active in the last 14 days')),
  community: optional(STR('Community in common')),
  follows: optional(BOOL('Follows the project')),
})

const matchedFields = {
  login: STR('Developer matched'),
  score: NUM('Out of 100'),
  reasons: ARR(reason),
  newcomer: BOOL('The seat kept for a promising newcomer'),
}

const helpDetail = OBJ({
  ...helpRequestFields,
  matches: ARR(
    OBJ({
      ...matchedFields,
      wave: NUM('Wave that notified them'),
      status: STR('notified, accepted, withdrawn or released'),
    }),
    'All of them for the requester, their own one for a matched developer',
  ),
  releasableAt: NUM(
    'When the requester may release the helper, in seconds, 0 if not accepted',
  ),
  left: BOOL('The developer withdrew or was released: out of this request'),
  messages: ARR(
    OBJ({
      author: STR('Login'),
      body: STR('Markdown'),
      createdAt: NUM('In seconds'),
    }),
    'The thread, for the requester and its helpers only (§7.2)',
  ),
  timeline: ARR(
    OBJ({
      event: STR('Entry type of the lifecycle'),
      at: NUM('In seconds'),
      login: STR('Who did it'),
    }),
    'The lifecycle, oldest first',
  ),
}, 'A help request with its thread and lifecycle (§7.2)')

const requestId = OBJ({ id: NUM('Id of the request') })

/** A transition of the lifecycle (§7.2), answered with the request */
const transition = (
  play: (userId: number, id: number) => void,
  description: string,
) =>
  route({
    authorize: withSession,
    fn: (ctx, { id }) => {
      play(ctx.session.userId, id)
      return getHelpDetail(ctx.session.userId, id)
    },
    input: requestId,
    output: helpDetail,
    description,
  })

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
      // The months of the Maintainer badge go on while away (§8.2)
      evaluateBadges(userId)
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

  'GET/api/user/badges': route({
    authorize: withOptionalSession,
    fn: (_ctx, { username }) => {
      const userId = userIdOfLogin(username)
      if (!userId) {
        throw new respond.NotFoundError({ message: 'No such developer' })
      }
      return badgesOf(userId)
    },
    input: OBJ({ username: STR('GitHub login') }),
    output: ARR(
      OBJ({
        badge: STR('Key of the badge'),
        level: NUM('0 none, 1 Bronze, 2 Silver, 3 Gold, 4 Platinum'),
        count: NUM('What it counts, eligible proofs only'),
        next: NUM('Count asked by the next level, 0 at Platinum'),
      }),
      'The 8 badges of §8.2',
    ),
    description: 'The badges of a developer, public like the passport',
  }),

  'GET/api/user': route({
    authorize: withOptionalSession,
    fn: (ctx, { username }) =>
      getPublicProfile(username, !!ctx.session) ??
        respond.NotFound({ message: 'No such developer' }),
    input: OBJ({ username: STR('GitHub login') }),
    output: OBJ({
      login: STR('Login of Pamoja, the address /@login'),
      githubLogin: STR('Login on GitHub'),
      displayName: STR('Name shown on the profile'),
      avatarUrl: STR('GitHub avatar'),
      headline: STR('One line under the name, empty if none'),
      bio: STR('Bio, empty if none'),
      country: STR('ISO code of an African country, or as written'),
      city: STR('City, empty if none'),
      website: STR('Website, empty if none'),
      available: BOOL('Available to help'),
      helpTypes: ARR(STR('Key of helpCategories'), 'Types of help accepted'),
      skills: currentUser.skills,
      domains: currentUser.domains,
      intents: currentUser.intents,
      communities: ARR(STR('Slug of a community'), 'Communities joined'),
      projects: ARR(
        OBJ({
          slug: STR('Slug of the project'),
          name: STR('Name of the project'),
          description: STR('Description'),
          status: STR('idea, prototype, beta or production'),
          stack: ARR(STR('Skill name'), 'Stack of the project'),
          role: STR('owner, maintainer, contributor or reviewer'),
          owner: STR('Login of the owner'),
        }),
        'Public projects the developer works on, newest first',
      ),
      activity: ARR(
        helpRequest,
        'Latest help requests written or accepted, for a signed-in visitor',
      ),
    }, 'The public profile'),
    description: 'The profile of a developer at /@login, public (§9.1)',
  }),

  'GET/api/user/proofs': route({
    authorize: withOptionalSession,
    fn: (_ctx, { username }) => {
      const userId = userIdOfLogin(username)
      if (!userId) {
        throw new respond.NotFoundError({ message: 'No such developer' })
      }
      return proofsOf(userId)
    },
    input: OBJ({ username: STR('GitHub login') }),
    output: ARR(
      OBJ({
        id: NUM('Entry of the proof'),
        kind: STR('review, help, merged, release, created or answer'),
        dimension: STR('review, build, mentor, oss or help (§8.1)'),
        title: STR('Title of the help request, empty for the others'),
        category: STR('Type of help, empty without a help request'),
        skills: ARR(STR('Skill name'), 'Skills frozen at the confirmation'),
        project: STR('Slug of the project, empty without one'),
        projectName: STR('Name of the project'),
        by: STR('Login of the developer helped, empty for their own work'),
        byName: STR('Their display name'),
        byCountry: STR('Their country code, empty when unknown'),
        at: NUM('When it was proven, in seconds'),
        source: STR('github, platform or demo: only github is verified'),
        repository: STR('owner/name on GitHub, empty off GitHub'),
        prNumber: NUM('Number of the PR, 0 without one'),
        url: STR('Link to GitHub, empty off GitHub'),
        tag: STR('Tag of a release'),
        helpRequestId: NUM('Help request, 0 without one'),
        postId: NUM('Accepted answer, 0 without one'),
      }),
      'Eligible proofs, newest first',
    ),
    description: 'The proofs of the reputation of a developer, public',
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
            skills: ARR(
              STR('Skill of the vocabulary'),
              'Languages of the changed files, empty until read (§7.1)',
            ),
            reviewed: BOOL('A review was submitted on GitHub'),
          })),
        })),
      }),
      'Projects the developer is a member of',
    ),
    description: 'The projects of the signed-in developer',
  }),

  /*
   * Help requests (§7.1)
   */
  'GET/api/help': route({
    authorize: withSession,
    fn: (ctx) => listHelpRequests(ctx.session.userId),
    output: ARR(helpRequest, 'Newest first'),
    description:
      'The requests the developer wrote, accepted, or that concern one of their projects',
  }),

  'POST/api/help/create': route({
    authorize: withSession,
    fn: (ctx, input) => {
      assertKnown(input.skills, skills, 'skills')
      if (!helpDurations.includes(input.estimatedMinutes)) {
        throw new respond.BadRequestError({ message: 'Unknown duration' })
      }
      const id = createHelpRequest(ctx.session.userId, input)
      return getHelpRequest(id)!
    },
    input: OBJ({
      category: LIST(
        Object.keys(helpCategories) as HelpCategory[],
        'Type of help',
      ),
      title: STR('What is needed, in one sentence'),
      description: STR('Context, what was tried, what is expected'),
      skills: ARR(STR('Skill of the vocabulary'), 'One to eight'),
      expectedLevel: LIST(
        Object.keys(helpLevels) as HelpLevel[],
        'Level expected',
      ),
      estimatedMinutes: NUM('One of helpDurations'),
      project: STR('Slug of a project of the developer, empty if none'),
      pullRequest: NUM('Open PR of that project, 0 if none'),
      videoUrl: STR('Web link of a video, empty if none'),
    }),
    output: helpRequest,
    description: 'Publish a help request, from the form or from a PR',
  }),

  /*
   * Lifecycle of a help request (§7.2)
   */
  'GET/api/help/detail': route({
    authorize: withSession,
    fn: (ctx, { id }) => getHelpDetail(ctx.session.userId, Number(id)),
    input: OBJ({ id: STR('Id of the request') }),
    output: helpDetail,
    description: 'A request with its thread and lifecycle',
  }),
  'GET/api/help/for-me': route({
    authorize: withSession,
    fn: (ctx) => listHelpForMe(ctx.session.userId),
    output: ARR(
      OBJ({
        ...helpRequestFields,
        score: NUM('My score for it'),
        reasons: ARR(reason),
      }),
      'Best score first',
    ),
    description: 'The open requests the developer was matched with',
  }),
  'GET/api/help/preview': route({
    authorize: withSession,
    fn: (ctx, input) =>
      previewWave({
        authorId: ctx.session.userId,
        category: input.category,
        skills: skillIdsOf(input.skills.split(',').filter(Boolean)),
        projectId: projectIdOf(input.project),
      }),
    input: OBJ({
      category: STR('Type of help, a key of helpCategories'),
      skills: STR('Skills of the vocabulary, separated by commas'),
      project: STR('Slug of the project, empty if none'),
    }),
    output: ARR(OBJ(matchedFields), 'The first wave, nothing written'),
    description: 'Who would be notified, while the form is filled',
  }),
  'POST/api/help/accept': transition(
    acceptHelp,
    'Take an open request: atomic, a second helper gets 409',
  ),
  'POST/api/help/withdraw': transition(
    withdrawHelp,
    'The helper leaves: the request is open again without them',
  ),
  'POST/api/help/release': transition(
    releaseHelp,
    'The requester frees the request 72 h after the last activity of the helper',
  ),
  'POST/api/help/cancel': transition(
    cancelHelp,
    'The requester cancels an open or accepted request',
  ),
  'POST/api/help/reopen': transition(
    reopenHelp,
    'The requester opens an expired or closed request again',
  ),
  'POST/api/help/deliver': transition(
    deliverHelp,
    'The helper says the help is done, for a request without a PR',
  ),
  'POST/api/help/confirm': transition(
    confirmHelp,
    'The requester confirms the help: completed, a proof for the helper',
  ),
  'POST/api/help/decline': transition(
    declineHelp,
    'The requester answers that the help was not useful',
  ),
  'POST/api/help/message': route({
    authorize: withSession,
    fn: (ctx, { id, body }) => {
      postHelpMessage(ctx.session.userId, id, body)
      return getHelpDetail(ctx.session.userId, id)
    },
    input: OBJ({ id: NUM('Id of the request'), body: STR('Markdown') }),
    output: helpDetail,
    description: 'A message in the thread of the requester and the helper',
  }),

  /*
   * Notifications (§7.4)
   */
  'GET/api/notifications': route({
    authorize: withSession,
    fn: (ctx) => listNotifications(ctx.session.userId),
    output: ARR(
      OBJ({
        id: NUM('Id of the notification'),
        type: STR('help_match, help_accepted, help_message…'),
        category: STR('for-you, projects, communities, social or system'),
        actor: STR('Login of who caused it, empty if no one'),
        helpRequestId: NUM('Request it is about, 0 if none'),
        title: STR('Title of what it is about'),
        project: STR('Project name, empty if none'),
        score: NUM('Matching score, 0 if none'),
        minutes: NUM('Estimated duration, 0 if none'),
        skills: ARR(STR('Skill asked')),
        excerpt: STR('Start of a message, empty if none'),
        eligible: NUM('1 unless a confirmed help does not count (§8.4)'),
        badge: STR('Key of a badge unlocked, empty if none'),
        level: NUM('Level of that badge, 0 if none'),
        readAt: NUM('In seconds, 0 if unread'),
        createdAt: NUM('In seconds'),
      }),
      'Newest first, the 100 last',
    ),
    description: 'The inbox of the developer; the page writes the sentences',
  }),
  'POST/api/notification/read': route({
    authorize: withSession,
    fn: (ctx, { id }) => {
      readNotification(ctx.session.userId, id)
    },
    input: OBJ({ id: NUM('Id of the notification') }),
    description: 'Mark one of my notifications as read',
  }),
  'POST/api/notifications/read-all': route({
    authorize: withSession,
    fn: (ctx) => {
      readAllNotifications(ctx.session.userId)
    },
    description: 'Mark all my notifications as read',
  }),
  'POST/api/notification/preferences': route({
    authorize: withSession,
    fn: (ctx, input) => {
      assertKnown(input.helpTypes, Object.keys(helpCategories), 'help types')
      updateMatching(ctx.session.userId, input)
      return getCurrentUser(ctx.session.userId)!
    },
    input: OBJ({
      matchingMode,
      minScore: NUM('0 to 100'),
      helpTypes: ARR(STR('Key of helpCategories'), 'Types of help accepted'),
    }, 'How help requests reach the developer'),
    output: OBJ(currentUser, 'The profile saved'),
    description: 'Save the matching preferences',
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
  /*
   * Direct messages (§10.6)
   */
  'GET/api/conversations': route({
    authorize: withSession,
    fn: (ctx) => listConversations(ctx.session.userId),
    output: ARR(
      OBJ({
        id: NUM('Id of the conversation'),
        with: person,
        ...conversationRights,
        updatedAt: NUM('Time of the last message'),
        last: optional(
          OBJ({
            excerpt: STR('Beginning of the last message'),
            mine: BOOL('Written by the developer'),
            at: NUM('When'),
          }),
        ),
        unread: NUM('Messages of the other one not read yet'),
      }),
      'The conversations, the latest first',
    ),
    description: 'The conversations of the developer, requests included',
  }),

  'GET/api/conversation': route({
    authorize: withSession,
    // A query string carries text: the ids are read as numbers here
    fn: (ctx, { id, before }) =>
      getConversation(ctx.session.userId, Number(id), Number(before ?? 0)),
    input: OBJ({
      id: STR('Id of the conversation'),
      before: optional(STR('Older messages than this id')),
    }),
    output: OBJ({
      id: NUM('Id of the conversation'),
      with: person,
      ...conversationRights,
      messages: ARR(
        OBJ({
          id: NUM('Id of the message'),
          author: STR('Login of the author'),
          mine: BOOL('Written by the developer'),
          body: STR('Markdown'),
          at: NUM('When'),
        }),
        'Oldest first',
      ),
      more: BOOL('Older messages remain'),
    }, 'A conversation and its last 50 messages'),
    description: 'A conversation of the developer',
  }),

  'POST/api/conversation/start': route({
    authorize: withSession,
    fn: (ctx, { username, body }) => ({
      id: startConversation(ctx.session.userId, username, body),
    }),
    input: OBJ({
      username: STR('Login of the developer written to'),
      body: STR('Markdown, 2 000 characters at most'),
    }),
    output: OBJ({ id: NUM('Id of the conversation') }),
    description:
      'Write to a developer: in the conversation they share, or a new one',
  }),

  'POST/api/conversation/message': route({
    authorize: withSession,
    fn: (ctx, { id, body }) => ({
      id: sendMessage(ctx.session.userId, id, body),
    }),
    input: OBJ({
      id: NUM('Id of the conversation'),
      body: STR('Markdown, 2 000 characters at most'),
    }),
    output: OBJ({ id: NUM('Id of the message') }),
    description: 'Send a message in a conversation',
  }),

  'POST/api/conversation/read': route({
    authorize: withSession,
    fn: (ctx, { id }) => readConversation(ctx.session.userId, id),
    input: OBJ({ id: NUM('Id of the conversation') }),
    description: 'Mark the conversation as read',
  }),

  'POST/api/conversation/accept': route({
    authorize: withSession,
    fn: (ctx, { id }) => acceptConversation(ctx.session.userId, id),
    input: OBJ({ id: NUM('Id of the conversation') }),
    description: 'Accept a message request',
  }),

  'POST/api/conversation/decline': route({
    authorize: withSession,
    fn: (ctx, { id }) => declineConversation(ctx.session.userId, id),
    input: OBJ({ id: NUM('Id of the conversation') }),
    description: 'Decline a message request; the sender is not told',
  }),

  'POST/api/user/block': route({
    authorize: withSession,
    fn: (ctx, { username, blocked }) =>
      setBlocked(ctx.session.userId, username, blocked),
    input: OBJ({
      username: STR('Login of the developer'),
      blocked: BOOL('True to block, false to unblock'),
    }),
    output: OBJ({ login: STR('Login'), blocked: BOOL('Blocked now') }),
    description: 'Block or unblock a developer; they are never told',
  }),

  'POST/api/conversation/report': route({
    authorize: withSession,
    fn: (ctx, { message, reason, comment }) =>
      reportMessage(ctx.session.userId, message, reason, comment ?? ''),
    input: OBJ({
      message: NUM('Id of the message'),
      reason: LIST(
        Object.keys(reportReasons) as ReportReason[],
        'Why it is reported',
      ),
      comment: optional(STR('What is wrong, 1 000 characters at most')),
    }),
    description: 'Report a message received, for the moderators',
  }),

  'POST/api/user/profile/update': route({
    authorize: withSession,
    fn: (ctx, fields) => {
      const { matchingMode: _, ...texts } = fields
      const field = tooLong(texts)
      if (field) {
        throw new respond.BadRequestError({ message: `${field} too long` })
      }
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

// @01edu/api adds its dev tools, open without a session outside production:
// any SQL, query and route metrics. Pamoja serves none of them, whatever
// APP_ENV says, so a dev server on a network or behind the tunnel gives
// nothing away (§16).
const notServed = route({
  fn: () => {
    throw new respond.NotFoundError({ message: 'Not found' })
  },
  description: 'Dev tool of @01edu/api, not served by Pamoja',
})

export const routeHandler = makeRouter({
  ...defs,
  'POST/api/sql/execute': notServed,
  'GET/api/sql/metrics': notServed,
  'GET/api/router/metrics': notServed,
}, {
  log,
  // Never in the logs: what members write to each other or about
  // themselves, and the one-time code of the GitHub login (§16, QA-33)
  sensitiveKeys: [
    'password',
    'confPassword',
    'currentPassword',
    'newPassword',
    'code',
    'state',
    'body',
    'bio',
    'headline',
    'description',
  ],
})
