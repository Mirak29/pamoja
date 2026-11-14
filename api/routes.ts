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
import { search } from '/api/search.ts'
import {
  importRepository,
  listRepositories,
  previewRepository,
} from '/api/import.ts'
import { suggestImport } from '/api/import-suggest.ts'
import { embedOne, requestText } from '/api/embeddings.ts'
import {
  getProject,
  listMyProjects,
  listProjectIssues,
  listProjectPulls,
} from '/api/projects.ts'
import { badgesOf, evaluateBadges } from '/api/badges.ts'
import { proofsOf } from '/api/proofs.ts'
import { getPublicProfile, getPublicProfileOfGithubId } from '/api/profile.ts'
import { MAX_NEEDS, tooLong } from '/api/limits.ts'
import {
  acceptConversation,
  archiveConversation,
  conversationIdOf,
  conversationWith,
  declineConversation,
  deleteMessage,
  editMessage,
  getConversation,
  listConversations,
  markUnread,
  muteConversation,
  REACTIONS,
  reactToMessage,
  readConversation,
  reportMessage,
  searchMessages,
  sendMessage,
  setBlocked,
  startConversation,
  typing,
} from '/api/messages.ts'
import {
  listNotifications,
  NOTIFICATION_CATEGORIES,
  readAllNotifications,
  readNotification,
} from '/api/notifications.ts'
import { previewWave } from '/api/matching.ts'
import { listWork } from '/api/work.ts'
import { listDevelopers } from '/api/explore.ts'
import { ask, clearAssistant, getAssistant } from '/api/assistant.ts'
import { skillIdsOf } from '/api/skills.ts'
import {
  createHelpRequest,
  getHelpRequest,
  HELP_TABS,
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
  getLogin,
  updateIntents,
  updateMatching,
  updateProfile,
  updateSkills,
  userIdOfLogin,
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
import { serveMedia, setCover, upload } from '/api/media.ts'
import {
  acceptAnswer,
  createPost,
  createReply,
  listPosts,
  listSaved,
  REACTION_KINDS,
  readThread,
  toggleBookmark,
  toggleReaction,
} from '/api/posts.ts'
import { BOARD_COLUMNS, createTask, listBoard, moveTask } from '/api/board.ts'
import {
  FOLLOW_TARGETS,
  followsOf,
  type FollowTarget,
  setFollow,
} from '/api/follow.ts'
import { setMembership } from '/api/community.ts'
import { applyToProject, decideJoinRequest } from '/api/join.ts'
import { REPORTABLE, reportContent } from '/api/reports.ts'
import { pulseOf } from '/api/pulse.ts'
import { listTracking } from '/api/tracking.ts'
import { channelStatesOf, markRead, setNotify } from '/api/channel-state.ts'
import {
  createChannelMessage,
  likeMessage,
  listChannelMessages,
} from '/api/channels.ts'
import { setDemoVideo, setGallery } from '/api/project-gallery.ts'
import { previewVideo, thumbnailOf } from '/api/video.ts'

const matchingMode = LIST(
  ['instant', 'digest', 'off'],
  'How help requests reach the developer (§7.4)',
)

// An uploaded image or file (§17.3): read at GET/api/media?key=
const media = OBJ({
  id: NUM('Id of the media'),
  key: STR('Random key of the file'),
  mime: STR('image/jpeg, image/png, image/webp or application/pdf'),
  image: BOOL('An image, shown; a file otherwise, downloaded'),
  width: NUM('Width in pixels, 0 for a file'),
  height: NUM('Height in pixels, 0 for a file'),
  bytes: NUM('Size'),
  name: STR('Name of a file, empty for an image'),
}, 'An image or a file')

// A post saved on the server (PAM-427): replies and reactions with PAM-501
const postFields = {
  id: NUM('Id of the post'),
  author: STR('Login of the author'),
  authorName: STR('Name of the author'),
  community: STR('Slug of the community, empty for the profile'),
  type: STR('Type of the post'),
  title: STR('Title, empty if none'),
  body: STR('Markdown'),
  media: ARR(media, 'Images, in order'),
  videoUrl: STR('Link of the video, empty if none'),
  reactions: OBJ({ like: NUM('Likes') }, 'How many of each reaction'),
  mine: ARR(STR('like'), 'The reactions of the developer'),
  bookmarked: BOOL('True when the developer saved the post'),
  createdAt: NUM('Publication, in seconds'),
}

const savedPost = OBJ(postFields, 'A post')

// A post of a thread carries its parent, so the page nests the replies
const threadPost = OBJ({
  ...postFields,
  parentId: NUM('Id of the post it replies to, 0 for the root'),
}, 'A post of a thread')

const channelMessage = OBJ({
  id: NUM('Id of the message'),
  channel: STR('general, help, announcements, or tracking for an answer'),
  alert: NUM('The alert of #suivi it answers, 0 for none'),
  parent: NUM('The message whose thread it is in, 0 for none'),
  author: STR('Login of the author'),
  authorName: STR('Name of the author'),
  avatarUrl: STR('GitHub avatar of the author'),
  body: STR('Markdown, a video by its link'),
  media: ARR(media, 'The image: none or one'),
  likes: NUM('Its +1'),
  liked: BOOL('A +1 of the developer'),
  createdAt: NUM('Sent, in seconds'),
}, 'A message of a project channel')

// What anyone sees of a developer, and the developer of themselves
const identity = {
  login: STR('Login of Pamoja, the address /@login'),
  githubLogin: STR('Login on GitHub'),
  displayName: STR('Name shown on the profile'),
  avatarUrl: STR('GitHub avatar'),
  headline: STR('One line under the name, empty if none'),
  bio: STR('Bio, empty if none'),
  country: STR('ISO code of an African country, or as written'),
  city: STR('City, empty if none'),
  website: STR('Website, empty if none'),
  cover: ARR(media, 'The photo of the cover: none or one (§9.2)'),
  // Personalization of the profile (§9.2)
  theme: STR('Profile theme id'),
  accent: STR('Accent colour id'),
  sectionOrder: ARR(STR('Section key'), 'Order of the profile sections'),
  featured: ARR(STR('Project slug'), 'Projects highlighted, empty for all'),
}

const currentUser = {
  userId: NUM('Id of the developer'),
  ...identity,
  matchingMode,
  minScore: NUM('Score under which a help request does not reach them'),
  helpTypes: ARR(STR('Key of helpCategories'), 'Types of help accepted'),
  onlySkills: ARR(STR('Technology'), 'Only requests on these skills, or all'),
  onlyProjects: ARR(STR('Slug'), 'Only requests of these projects, or all'),
  onlyCommunities: ARR(
    STR('Slug'),
    'Only requests whose author is in these communities, or all',
  ),
  skills: ARR(
    OBJ({
      name: STR('Technology of the vocabulary'),
      sources: ARR(STR('declared, github or platform_activity')),
    }),
    'Technologies, each with what backs it (§6.1)',
  ),
  domains: ARR(STR('Domain of the vocabulary'), 'Domains'),
  intents: ARR(STR('Intent of the vocabulary'), 'Intents'),
  communities: ARR(STR('Slug of a community'), 'Communities joined'),
}

const profileSaved = OBJ(currentUser, 'The profile saved')

/** The developer of a login, or a 404 */
const developerOf = (login: string) => {
  const userId = userIdOfLogin(login)
  if (!userId) throw new respond.NotFoundError({ message: 'No such developer' })
  return userId
}

// The other developer of a conversation (§10.6)
const person = OBJ({
  login: STR('Login'),
  name: STR('Name shown'),
  avatarUrl: STR('GitHub avatar'),
}, 'The other developer')

// A conversation is known by its public id, its address (PAM-125): the
// number of the database never reaches the page
const conversationKey = STR('Public id of the conversation, its address')

// The cursor of a list read by batches (§12.7): what the next batch asks
// for, and what each batch gives for the one after
const cursorFrom = (first: string) =>
  STR(`Cursor of the next batch, empty for the ${first} (§12.7)`)
const nextCursor = STR('Cursor of the next batch, empty at the end')

// A thing to work on (§10.3): what, where, how well it fits, where to go
const workItem = OBJ({
  id: STR('Key of the item'),
  title: STR('What to do'),
  project: STR('Project, empty without one'),
  projectSlug: STR('Slug of the project, empty without one'),
  type: STR('Help category, need type or good first issue'),
  score: NUM('How well it fits the developer, out of 100'),
  skills: ARR(STR('Skill of the developer it asks')),
  href: STR('Where to do it: a page of Pamoja or GitHub'),
})

// What the Assistant shows (§11): cards to open, actions to do
const assistantExtras = {
  cards: ARR(
    OBJ({
      title: STR('What it is about'),
      project: STR('Project, empty without one'),
      projectHref: STR('The page of the project, empty without one'),
      type: STR('What it is, in words'),
      score: NUM('Match with the developer out of 100, 0 without one'),
      href: STR('Where it opens: a page of Pamoja or GitHub'),
    }),
    'What the answer cites, from the context of the server',
  ),
  actions: ARR(
    OBJ({
      label: STR('The label of the button'),
      href: STR('The page of Pamoja it opens'),
    }),
    'What the developer can do, from the catalog of the server',
  ),
  fallback: BOOL('Without the model: the point, without a sentence'),
  parts: ARR(
    OBJ({
      text: STR('A piece of the answer'),
      href: STR('Where it leads; empty for plain text'),
    }),
    'The answer with its links in place; empty for a fallback',
  ),
}
const assistantMessage = OBJ({
  id: NUM('Id of the message'),
  role: STR('user or assistant'),
  content: STR('The text; empty for a fallback'),
  ...assistantExtras,
  createdAt: NUM('When, in seconds'),
})

// Issues and PRs of a project, by batches (§12.7)
const issueBatch = OBJ({
  items: ARR(
    OBJ({
      number: NUM(),
      title: STR(),
      state: STR(),
      labels: ARR(STR()),
      authorLogin: STR(),
      comments: NUM(),
      createdAt: NUM(),
    }),
    'Open issues, newest first',
  ),
  next: nextCursor,
})

const pullBatch = OBJ({
  items: ARR(
    OBJ({
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
    }),
    'The open ones first, then the others, newest first',
  ),
  next: nextCursor,
})

// One project as the web shows it, shared by the list and the public page
const projectShape = OBJ({
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
  gallery: ARR(media, 'Screenshots of the project page, in order'),
  demoVideoUrl: STR('Link of the demo video, empty if none'),
  repository: optional(OBJ({
    owner: STR(),
    name: STR(),
    syncMode: STR('poll or live'),
    about: STR('First paragraphs of the README, 600 characters at most'),
    stars: NUM(),
    topics: ARR(STR()),
    languages: ARR(OBJ({ name: STR(), share: NUM() })),
    contributors: NUM(),
    release: STR(),
    releasedAt: NUM(),
    lastSyncedAt: NUM(),
    openIssues: NUM('Open issues, all of them'),
    beginnerIssues: NUM('Open issues labelled good first issue'),
    openPullRequests: NUM('Open PRs, all of them'),
    waitingReview: NUM('Open PRs with no review yet'),
    issues: issueBatch,
    pullRequests: pullBatch,
  })),
}, 'A project')

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
  repository: STR(
    'owner/name of the repository of the PR, empty if none: the helper is often not a member of the project',
  ),
  category: STR('Type of help, a key of helpCategories'),
  title: STR('Title'),
  description: STR('Description in Markdown'),
  skills: ARR(STR('Skill of the vocabulary')),
  expectedLevel: STR('A key of helpLevels, empty if none'),
  estimatedMinutes: NUM('Estimated duration, 0 if none'),
  videoUrl: STR('Video showing the problem, empty if none'),
  media: ARR(media, 'Screenshots shown with the request, in order'),
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
    [
      'skills',
      'type',
      'confirmed',
      'semantic',
      'availability',
      'affinity',
      'newcomer',
    ],
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
  similarity: optional(NUM('Cosine of the request and the profile, percent')),
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

// What a member writes stays within its size (§16): a 400 names the field
const assertFits = (fields: Parameters<typeof tooLong>[0]) => {
  const field = tooLong(fields)
  if (field) {
    throw new respond.BadRequestError({ message: `${field} too long` })
  }
}

// Only names of the vocabulary are saved: a developer never creates one
// At most 30 slugs, each as a slug is written
const assertSlugs = (slugs: string[], what: string) => {
  if (
    slugs.length > 30 || slugs.some((slug) => !/^[a-z0-9-]{1,64}$/.test(slug))
  ) {
    throw new respond.BadRequestError({ message: `Invalid ${what}` })
  }
}

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
    fn: (_ctx, { username }) => badgesOf(developerOf(username)),
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
    fn: (ctx, { username, githubId }) =>
      (username
        ? getPublicProfile(username, !!ctx.session)
        : getPublicProfileOfGithubId(Number(githubId), !!ctx.session)) ??
        respond.NotFound({ message: 'No such developer' }),
    input: OBJ({
      username: optional(STR('Login of Pamoja, from the address /@login')),
      // A link to write to someone carries their GitHub account (PAM-125)
      githubId: optional(STR('GitHub account id, when no login is given')),
    }),
    output: OBJ({
      githubId: NUM('GitHub account: stable when the login changes'),
      ...identity,
      available: BOOL('Available to help'),
      helpTypes: currentUser.helpTypes,
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
    fn: (_ctx, { username }) => proofsOf(developerOf(username)),
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

  'POST/api/project/import/suggest': route({
    authorize: withSession,
    fn: (ctx, { name }) => {
      const userId = ctx.session.userId
      return suggestImport({ userId, login: getLogin(userId) }, name)
    },
    input: OBJ({ name: STR('Repository name, owned by the developer') }),
    output: OBJ({
      skills: ARR(STR('Skill of the vocabulary'), 'GitHub first, then AI'),
      needs: ARR(STR('Need proposed'), 'Empty without the AI'),
      description: STR('Description proposed; empty without the AI'),
      ai: BOOL('Whether a model answered'),
    }),
    description: 'What the AI proposes for a repository before its import',
  }),

  'POST/api/project/import': route({
    authorize: withSession,
    fn: async (ctx, input) => {
      assertKnown(input.skills, skills, 'skills')
      assertFits({
        projectName: input.title,
        projectDescription: input.description,
        projectVision: input.vision,
      })
      if (input.needs.length > MAX_NEEDS) {
        throw new respond.BadRequestError({ message: 'Too many needs' })
      }
      for (const projectNeed of input.needs) assertFits({ projectNeed })
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
    output: ARR(projectShape, 'Projects the developer is a member of'),
    description:
      'The projects of the signed-in developer, with the first batch of their issues and PRs',
  }),

  'GET/api/project': route({
    authorize: withSession,
    fn: (ctx, { slug }) => getProject(ctx.session.userId, slug),
    input: OBJ({ slug: STR('Slug of the project') }),
    output: projectShape,
    description:
      'A public project by its slug, for its page; unknown or private: 404 (§6)',
  }),

  'GET/api/project/issues': route({
    authorize: withSession,
    fn: (ctx, { slug, before, filter }) =>
      listProjectIssues(
        ctx.session.userId,
        slug,
        before,
        filter === 'good-first-issue',
      ),
    input: OBJ({
      slug: STR('Slug of the project'),
      before: cursorFrom('newest'),
      filter: optional(LIST(
        ['', 'good-first-issue'],
        'Only the issues labelled good first issue; empty for all of them',
      )),
    }),
    output: issueBatch,
    description: 'The open issues of a project, 20 at a time',
  }),

  'GET/api/project/pulls': route({
    authorize: withSession,
    fn: (ctx, { slug, before }) =>
      listProjectPulls(ctx.session.userId, slug, before),
    input: OBJ({
      slug: STR('Slug of the project'),
      before: cursorFrom('first'),
    }),
    output: pullBatch,
    description: 'The PRs of a project, the open ones first, 20 at a time',
  }),

  /*
   * Help requests (§7.1)
   */
  'GET/api/help': route({
    authorize: withSession,
    fn: (ctx, { tab, before }) =>
      listHelpRequests(ctx.session.userId, tab, before),
    input: OBJ({
      tab: LIST(HELP_TABS, 'mine, accepted, projects; empty for all of them'),
      before: cursorFrom('newest'),
    }),
    output: OBJ({
      items: ARR(helpRequest, 'Newest first, 20 at a time'),
      next: nextCursor,
    }),
    description:
      'The requests the developer wrote, accepted, or that concern one of their projects',
  }),

  'POST/api/help/create': route({
    authorize: withSession,
    fn: async (ctx, input) => {
      assertKnown(input.skills, skills, 'skills')
      if (!helpDurations.includes(input.estimatedMinutes)) {
        throw new respond.BadRequestError({ message: 'Unknown duration' })
      }
      // Its vector first, so that the first wave weighs the proximity
      const text = requestText(input)
      const vector = input.title.trim() ? await embedOne(text) : undefined
      const id = createHelpRequest(ctx.session.userId, input, { text, vector })
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
      media: optional(ARR(NUM('Id of an upload'), 'Four images at most')),
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
    fn: (ctx, { before }) => listHelpForMe(ctx.session.userId, before),
    input: OBJ({
      before: cursorFrom('best'),
    }),
    output: OBJ({
      items: ARR(
        OBJ({
          ...helpRequestFields,
          score: NUM('My score for it'),
          reasons: ARR(reason),
        }),
        'Best score first, 20 at a time',
      ),
      next: nextCursor,
    }),
    description: 'The open requests the developer was matched with',
  }),
  'GET/api/work': route({
    authorize: withSession,
    fn: (ctx) => listWork(ctx.session.userId),
    output: OBJ({
      help: ARR(workItem, 'Help that matches, best score first'),
      needs: ARR(workItem, 'Needs of projects, best match first'),
      issues: ARR(
        workItem,
        'Good first issues and documentation, best match first',
      ),
      newcomer: BOOL('No PR of theirs merged yet: they never contributed'),
      firstStep: optional(workItem),
    }),
    description: 'What the developer can work on, computed without AI (§10.3)',
  }),
  'GET/api/explore/developers': route({
    authorize: withSession,
    fn: () => listDevelopers(),
    output: ARR(OBJ({
      login: STR('Login of Pamoja'),
      name: STR('Display name'),
      headline: STR('One line, empty if none'),
      city: STR('City, empty if none'),
      country: STR('Country name, empty if none'),
      available: BOOL('Open to help'),
      skills: ARR(STR('Technology')),
      intents: ARR(STR('Intent of the onboarding')),
    })),
    description: 'Developers for Explore; the page filters them (§10.3)',
  }),
  'GET/api/assistant': route({
    authorize: withSession,
    fn: (ctx, { page }) => getAssistant(ctx.session.userId, page ?? ''),
    input: OBJ({ page: optional(STR('The page open, for its context')) }),
    output: OBJ({
      messages: ARR(assistantMessage, 'The conversation, oldest first'),
      point: OBJ(assistantExtras),
    }),
    description:
      'The conversation with the Assistant, and the point of the developer computed without AI (§11)',
  }),
  'POST/api/assistant/ask': route({
    authorize: withSession,
    fn: (ctx, { question, page }) =>
      ask(ctx.session.userId, question, page ?? ''),
    input: OBJ({
      question: STR('The question of the developer, 500 characters at most'),
      page: optional(STR('The page open, for its context')),
    }),
    output: assistantMessage,
    description: 'Asks the Assistant: the answer, kept with the question (§11)',
  }),
  'POST/api/assistant/clear': route({
    authorize: withSession,
    fn: (ctx) => clearAssistant(ctx.session.userId),
    description: 'Erases the conversation with the Assistant for good',
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
    fn: (ctx, { before, category }) =>
      listNotifications(ctx.session.userId, before, category),
    input: OBJ({
      before: cursorFrom('newest'),
      category: LIST(
        ['', ...NOTIFICATION_CATEGORIES],
        'A tab of the inbox; empty for all of them',
      ),
    }),
    output: OBJ({
      items: ARR(
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
          joinRequestId: NUM('Candidature it is about, 0 if none (§6.6)'),
          projectSlug: STR('Slug of its project, empty if none'),
          accepted: NUM('-1 pending for a manager, 0 refused, 1 accepted'),
          postId: NUM('Post it links to, 0 if none (§10.1)'),
          onReply: NUM('1 when the reply answers a reply, else 0'),
          readAt: NUM('In seconds, 0 if unread'),
          createdAt: NUM('In seconds'),
        }),
        'Newest first, 20 at a time',
      ),
      next: nextCursor,
      unread: ARR(
        OBJ({ category: STR('Category'), count: NUM('Unread ones') }),
        'Every unread one, by category, not only those of the batch',
      ),
    }),
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
      assertKnown(input.onlySkills ?? [], skills, 'skills')
      assertSlugs(input.onlyProjects ?? [], 'projects')
      assertSlugs(input.onlyCommunities ?? [], 'communities')
      updateMatching(ctx.session.userId, input)
      return getCurrentUser(ctx.session.userId)!
    },
    input: OBJ({
      matchingMode,
      minScore: NUM('0 to 100'),
      helpTypes: ARR(STR('Key of helpCategories'), 'Types of help accepted'),
      onlySkills: optional(
        ARR(STR('Technology'), 'Only requests on these skills, empty for all'),
      ),
      onlyProjects: optional(
        ARR(STR('Slug'), 'Only requests of these projects, empty for all'),
      ),
      onlyCommunities: optional(
        ARR(STR('Slug'), 'Only authors of these communities, empty for all'),
      ),
    }, 'How help requests reach the developer'),
    output: profileSaved,
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
   * Direct messages (§10.6)
   */
  'GET/api/conversations': route({
    authorize: withSession,
    fn: (ctx, { before }) => listConversations(ctx.session.userId, before),
    input: OBJ({
      before: cursorFrom('latest'),
    }),
    output: OBJ({
      items: ARR(
        OBJ({
          id: conversationKey,
          with: person,
          ...conversationRights,
          updatedAt: NUM('Time of the last message'),
          last: optional(
            OBJ({
              excerpt: STR('Beginning of the last message, as plain text'),
              deleted: BOOL('The last message was deleted'),
              mine: BOOL('Written by the developer'),
              at: NUM('When'),
            }),
          ),
          unread: NUM('Messages of the other one not read yet'),
          muted: BOOL('No toast nor count'),
          archived: BOOL('Out of the main list'),
          online: BOOL('The other one has Pamoja open'),
        }),
        'The conversations, the latest first, 20 at a time',
      ),
      next: nextCursor,
      unread: NUM(
        'Unread messages, muted ones aside, counted up to 99, with the latest batch; 0 with the older ones',
      ),
    }),
    description: 'The conversations of the developer, requests included',
  }),

  'GET/api/conversation/with': route({
    authorize: withSession,
    fn: (ctx, { login }) => ({
      id: conversationWith(ctx.session.userId, login),
    }),
    input: OBJ({ login: STR('Login of the other developer') }),
    output: OBJ({ id: STR('Key of the conversation shared, empty if none') }),
    description: 'The conversation shared with a developer, for « Écrire »',
  }),

  'GET/api/conversation': route({
    authorize: withSession,
    // A query string carries text: `before` is read as a number here
    fn: (ctx, { id, before }) =>
      getConversation(
        ctx.session.userId,
        conversationIdOf(id),
        Number(before ?? 0),
      ),
    input: OBJ({
      id: conversationKey,
      before: optional(STR('Older messages than this id')),
    }),
    output: OBJ({
      id: conversationKey,
      with: person,
      ...conversationRights,
      muted: BOOL('No toast nor count'),
      archived: BOOL('Out of the main list'),
      readUpTo: NUM('Read up to this time before this reading'),
      messages: ARR(
        OBJ({
          id: NUM('Id of the message'),
          author: STR('Login of the author'),
          mine: BOOL('Written by the developer'),
          body: STR('Markdown, empty once deleted'),
          at: NUM('When'),
          edited: BOOL('Edited after it was sent'),
          deleted: BOOL('Deleted by its author: its place stays'),
          replyTo: optional(
            OBJ({
              id: NUM('Message answered'),
              author: STR('Its author'),
              excerpt: STR('Its beginning, as plain text'),
              deleted: BOOL('Deleted since'),
            }),
          ),
          reactions: ARR(
            OBJ({
              emoji: STR('One of the reactions offered'),
              count: NUM('How many'),
              mine: BOOL('The developer reacted so'),
            }),
            'In the order they first came',
          ),
          attachments: ARR(media, 'Images and files, in their order'),
          preview: optional(
            OBJ({
              url: STR('The link'),
              title: STR('Title of the page'),
              description: STR('Its description'),
              site: STR('Name of the site'),
            }),
          ),
        }),
        'Oldest first',
      ),
      more: BOOL('Older messages remain'),
    }, 'A conversation and its last 50 messages'),
    description: 'A conversation of the developer',
  }),

  'POST/api/conversation/start': route({
    authorize: withSession,
    fn: (ctx, { githubId, body }) => ({
      id: startConversation(ctx.session.userId, githubId, body),
    }),
    input: OBJ({
      // Never the login, which can change and pass to someone else
      githubId: NUM('GitHub account of the developer written to'),
      body: STR('Markdown, 2 000 characters at most'),
    }),
    output: OBJ({ id: conversationKey }),
    description:
      'Write to a developer: in the conversation they share, or a new one',
  }),

  'POST/api/conversation/message': route({
    authorize: withSession,
    fn: (ctx, { id, body, replyTo, attachments }) => ({
      id: sendMessage(
        ctx.session.userId,
        conversationIdOf(id),
        body,
        replyTo ?? 0,
        attachments ?? [],
      ),
    }),
    input: OBJ({
      id: conversationKey,
      body: STR('Markdown, 2 000 characters at most; may be empty with files'),
      replyTo: optional(NUM('The message answered')),
      attachments: optional(
        ARR(NUM('Id of an upload'), 'Four images or files at most'),
      ),
    }),
    output: OBJ({ id: NUM('Id of the message') }),
    description: 'Send a message in a conversation',
  }),

  /*
   * Images and files (§17.3)
   */
  'POST/api/media/upload': route({
    authorize: withSession,
    // No input: the handler reads the form, with the file in « file »
    fn: (ctx) => upload(ctx.session.userId, ctx.req),
    output: media,
    description:
      'Upload a JPEG, PNG or WebP image (2 MB) or a PDF (5 MB), to attach',
  }),

  'POST/api/project/gallery': route({
    authorize: withSession,
    fn: (ctx, { project, media }) =>
      setGallery(ctx.session.userId, project, media),
    input: OBJ({
      project: STR('Slug of the project'),
      media: ARR(
        NUM('Id of an upload or of a screenshot already there'),
        'The whole gallery, in order: 8 screenshots at most',
      ),
    }),
    output: ARR(media),
    description:
      'Set the screenshots of a project page: owner and maintainers only',
  }),

  'POST/api/project/video': route({
    authorize: withSession,
    fn: (ctx, { project, url }) =>
      setDemoVideo(ctx.session.userId, project, url),
    input: OBJ({
      project: STR('Slug of the project'),
      url: STR('YouTube, Loom or Vimeo link; empty removes the video'),
    }),
    output: OBJ({ url: STR('The link kept, empty if none') }),
    description: 'Set the demo video of a project: owner and maintainers only',
  }),

  'POST/api/post/create': route({
    authorize: withSession,
    fn: (ctx, input) => createPost(ctx.session.userId, input),
    input: OBJ({
      community: STR('Slug of a community, empty for the profile'),
      type: STR('A type of POST_TYPES'),
      title: STR('Title, empty if none'),
      body: STR('Markdown'),
      media: optional(ARR(NUM('Id of an upload'), 'Four images at most')),
      videoUrl: optional(STR('YouTube, Loom or Vimeo link, empty if none')),
    }),
    output: savedPost,
    description: 'Publish a post with its images and its video',
  }),

  'GET/api/posts': route({
    authorize: withSession,
    // A query string carries text: the time is read as a number
    fn: (ctx, { after, author }) =>
      listPosts(ctx.session.userId, Number(after) || 0, author ?? ''),
    input: OBJ({
      after: optional(
        STR('Only the posts published after this time, in seconds'),
      ),
      author: optional(STR('Only the posts of this GitHub login')),
    }),
    output: ARR(savedPost),
    description: 'The latest posts, newest first, or those of one developer',
  }),

  'GET/api/saved': route({
    authorize: withSession,
    fn: (ctx) => listSaved(ctx.session.userId),
    output: ARR(savedPost),
    description: 'The posts the developer saved, newest first (§10.1)',
  }),

  'POST/api/post/reply': route({
    authorize: withSession,
    fn: (ctx, input) =>
      createReply(ctx.session.userId, input.postId, input.body),
    input: OBJ({
      postId: NUM('Id of the post replied to'),
      body: STR('Markdown of the reply'),
    }),
    output: savedPost,
    description: 'Reply to a post; its author is told (§10.1)',
  }),

  'POST/api/post/accept': route({
    authorize: withSession,
    fn: (ctx, input) =>
      acceptAnswer(ctx.session.userId, input.postId, input.replyId),
    input: OBJ({
      postId: NUM('Id of the question'),
      replyId: NUM('Id of the reply accepted'),
    }),
    output: OBJ({ accepted: BOOL('True once the answer is accepted') }),
    description: 'Accept a reply as the answer of a question (§8, §10.1)',
  }),

  'GET/api/post/thread': route({
    authorize: withSession,
    fn: (ctx, { postId }) => readThread(ctx.session.userId, Number(postId)),
    input: OBJ({ postId: STR('Id of a post of the thread') }),
    output: OBJ({
      posts: ARR(threadPost, 'Every post of the thread, oldest first'),
      rootId: NUM('Id of the first post of the thread'),
      acceptedReplyId: NUM('Id of the accepted answer, 0 for none'),
    }),
    description: 'A post with its whole thread, for a shared link (§12.7)',
  }),

  'POST/api/reaction/toggle': route({
    authorize: withSession,
    fn: (ctx, input) =>
      toggleReaction(ctx.session.userId, input.postId, input.kind),
    input: OBJ({
      postId: NUM('Id of the post'),
      kind: LIST(REACTION_KINDS, 'like: the only reaction (§10.1)'),
    }),
    output: OBJ({ reacted: BOOL('True when the reaction is now on') }),
    description: 'React to a post, or take the reaction back (§10.1)',
  }),

  'POST/api/bookmark/toggle': route({
    authorize: withSession,
    fn: (ctx, input) => toggleBookmark(ctx.session.userId, input.postId),
    input: OBJ({ postId: NUM('Id of the post') }),
    output: OBJ({ bookmarked: BOOL('True when the post is now saved') }),
    description: 'Save a post or remove it from the saved ones (§10.1)',
  }),

  'GET/api/follows': route({
    authorize: withSession,
    // The page starts from it at every session, never from what it guessed
    fn: (ctx) => followsOf(ctx.session.userId),
    output: OBJ({
      users: ARR(STR('Login'), 'Developers followed'),
      projects: ARR(STR('Slug'), 'Projects followed'),
    }),
    description: 'What the signed in developer follows',
  }),

  'POST/api/follow': route({
    authorize: withSession,
    fn: (ctx, input) =>
      setFollow(
        ctx.session.userId,
        input.targetType as FollowTarget,
        input.target,
        input.follow,
      ),
    input: OBJ({
      targetType: LIST(FOLLOW_TARGETS, 'What is followed'),
      target: STR('Login of a developer, or slug of a project or community'),
      follow: BOOL('True to follow, false to stop: the state wanted'),
    }),
    output: OBJ({
      following: BOOL('True when the developer follows the target'),
      followers: NUM('How many followers the target has after the change'),
    }),
    description:
      'Follow a developer, a project or a community, or stop following it',
  }),

  'POST/api/community/join': route({
    authorize: withSession,
    fn: (ctx, input) =>
      setMembership(ctx.session.userId, input.slug, input.join),
    input: OBJ({
      slug: STR('Slug of the community'),
      join: BOOL('True to join, false to leave: the state wanted'),
    }),
    output: OBJ({ joined: BOOL('True when the developer is a member') }),
    description: 'Join or leave a community',
  }),

  'POST/api/project/join': route({
    authorize: withSession,
    fn: (ctx, input) =>
      applyToProject(
        ctx.session.userId,
        input.slug,
        input.areas,
        input.availability,
        input.message,
      ),
    input: OBJ({
      slug: STR('Slug of the project to join'),
      areas: ARR(STR('How they can help'), 'Backend, Frontend, Tests…'),
      availability: STR('How much time they can give'),
      message: STR('A word for the team, empty if none'),
    }),
    output: OBJ({ applied: BOOL('True once the candidature is sent') }),
    description: 'Apply to join a project (§6.6)',
  }),

  'POST/api/project/join-request/decide': route({
    authorize: withSession,
    fn: (ctx, input) =>
      decideJoinRequest(ctx.session.userId, input.joinRequestId, input.accept),
    input: OBJ({
      joinRequestId: NUM('Id of the candidature'),
      accept: BOOL('True to accept, false to refuse'),
    }),
    output: OBJ({ status: STR('accepted or refused') }),
    description: 'Accept or refuse a candidature (§6.6)',
  }),

  'POST/api/report/create': route({
    authorize: withSession,
    fn: (ctx, input) =>
      reportContent(
        ctx.session.userId,
        input.targetType,
        input.targetId,
        input.reason,
        input.comment,
      ),
    input: OBJ({
      targetType: LIST(REPORTABLE, 'What is reported'),
      targetId: NUM('Id of the content'),
      reason: STR('Why it is reported'),
      comment: STR('A note for the moderators, empty if none'),
    }),
    output: OBJ({
      reported: BOOL('True once the report is saved'),
      hidden: BOOL('True when this report hid the content (§10.5)'),
    }),
    description: 'Report content for the moderators (§10.5)',
  }),

  'GET/api/project/board': route({
    authorize: withSession,
    fn: (_ctx, { slug }) => listBoard(slug),
    input: OBJ({ slug: STR('Slug of the project') }),
    output: ARR(OBJ({
      id: NUM('Id of the card'),
      column: STR('backlog, ready, in_progress, review or done'),
      title: STR('Title of the card'),
      rank: STR('Fractional rank in its column'),
    })),
    description: 'The cards of a project board (§6.7)',
  }),

  'POST/api/task/create': route({
    authorize: withSession,
    fn: (ctx, input) => createTask(ctx.session.userId, input.slug, input.title),
    input: OBJ({
      slug: STR('Slug of the project'),
      title: STR('Title of the card'),
    }),
    output: OBJ({
      id: NUM('Id of the new card'),
      column: STR('Its column: backlog'),
      title: STR('Its title'),
      rank: STR('Its rank'),
    }),
    description: 'Add an internal card to the Backlog (§6.7)',
  }),

  'POST/api/task/move': route({
    authorize: withSession,
    fn: (ctx, input) =>
      moveTask(ctx.session.userId, input.taskId, input.column),
    input: OBJ({
      taskId: NUM('Id of the card'),
      column: LIST(BOARD_COLUMNS, 'The column to move it to'),
    }),
    output: OBJ({
      id: NUM('Id of the card'),
      column: STR('Its new column'),
      rank: STR('Its new rank'),
    }),
    description: 'Move a card to a column (§6.7)',
  }),

  /*
   * Search (§10.4)
   */
  'GET/api/search': route({
    authorize: withSession,
    // A query string carries text: the number is read from it, 50 at most
    fn: (_, { q, limit }) =>
      search(q.slice(0, 200), Math.min(50, Math.max(1, Number(limit) || 5))),
    input: OBJ({
      q: STR('What is typed; empty for a first look'),
      limit: optional(STR('How many of each kind, 5 by default, 50 at most')),
    }),
    output: OBJ({
      engine: LIST(['meilisearch', 'sql'], 'Which one answered'),
      developers: ARR(OBJ({
        id: NUM('User id'),
        login: STR('GitHub login'),
        name: STR('Display name'),
        headline: STR('One line about them'),
        city: STR('City'),
        country: STR('Country'),
        available: BOOL('Open to help'),
        skills: ARR(STR('Skill')),
      })),
      projects: ARR(OBJ({
        id: NUM('Project id'),
        slug: STR('Slug'),
        name: STR('Name'),
        description: STR('Description'),
        vision: STR('Vision'),
        skills: ARR(STR('Skill')),
      })),
      communities: ARR(OBJ({
        id: NUM('Community id'),
        slug: STR('Slug'),
        name: STR('Name'),
        type: STR('technology, country or domain'),
        description: STR('Description'),
        members: NUM('Members'),
      })),
      posts: ARR(OBJ({
        id: NUM('Post id'),
        title: STR('Title, may be empty'),
        body: STR('Text, its first 2000 characters'),
        type: STR('Type of post'),
        author: STR('Name of the author'),
        community: STR('Name of its community, may be empty'),
      })),
      help_requests: ARR(OBJ({
        id: NUM('Request id'),
        title: STR('Title'),
        description: STR('Text, its first 2000 characters'),
        category: STR('Key of the type of help'),
        status: STR('Status'),
        skills: ARR(STR('Skill')),
        project: STR('Name of its project, may be empty'),
      })),
    }),
    description:
      'Developers, projects, communities, posts and requests for help that match, by kind',
  }),

  'GET/api/project/channels': route({
    authorize: withSession,
    fn: (ctx, { project }) => channelStatesOf(ctx.session.userId, project),
    input: OBJ({ project: STR('Slug of the project') }),
    output: ARR(OBJ({
      channel: STR('general, tracking, help or announcements'),
      lastReadAt: NUM('Read up to this time, in seconds; 0 if never'),
      notify: STR('all, mentions, mine or none'),
    })),
    description: 'What I read in the channels I read, and their settings',
  }),

  'POST/api/project/channel/read': route({
    authorize: withSession,
    fn: (ctx, { project, channel }) => {
      markRead(ctx.session.userId, project, channel)
    },
    input: OBJ({
      project: STR('Slug of the project'),
      channel: STR('general, tracking, help or announcements'),
    }),
    description: 'Mark a channel read up to now',
  }),

  'POST/api/project/channel/notify': route({
    authorize: withSession,
    fn: (ctx, { project, channel, notify }) => {
      setNotify(ctx.session.userId, project, channel, notify)
    },
    input: OBJ({
      project: STR('Slug of the project'),
      channel: STR('general, tracking, help or announcements'),
      notify: STR('all, mentions, mine (#suivi only) or none'),
    }),
    description: 'Choose what reaches me from a channel',
  }),

  'GET/api/project/tracking': route({
    authorize: withSession,
    fn: (ctx, { project }) => listTracking(ctx.session.userId, project),
    input: OBJ({ project: STR('Slug of the project') }),
    output: ARR(OBJ({
      id: NUM('Id of the entry'),
      kind: STR('PR_OPENED, PR_REVIEWED, CI_FAILED… the type of the entry'),
      at: NUM('When, in seconds'),
      actor: STR('Login of who acted, when on Pamoja, or empty'),
      pullRequest: NUM('Number of the PR, 0 if none'),
      title: STR('Title of the PR or the issue'),
      author: STR('GitHub login of the author of the PR, or empty'),
      issue: NUM('Number of the issue, 0 if none'),
      tag: STR('Tag of a release'),
      state: STR('State of a review, or what an issue did'),
      name: STR('Job of a CI run'),
      branch: STR('Branch of a CI run or a push'),
      count: NUM('Commits of a push'),
      commits: ARR(STR('First line of a commit'), 'The last commits pushed'),
      replies: ARR(channelMessage, 'The thread under the alert'),
    })),
    description: 'The alerts of #suivi and their threads (§6.8)',
  }),

  'GET/api/project/pulse': route({
    authorize: withSession,
    // A query string carries text: the time is read as a number
    fn: (_, { project, since }) =>
      pulseOf(project, since ? Number(since) || null : null),
    input: OBJ({
      project: STR('Slug of the project'),
      since: optional(STR('From this time, in seconds; the last 7 days')),
    }),
    output: OBJ({
      since: NUM('Start of the period counted, in seconds'),
      merged: NUM('PRs merged'),
      issuesClosed: NUM('Issues closed'),
      newContributors: NUM('Members who joined'),
      reviewsAsked: NUM('Code reviews asked for on Pamoja'),
      waitingReview: NUM('Open PRs without a review, now'),
      releases: NUM('Releases published'),
      summary: STR('AI summary of the last 7 days; empty without one'),
      summaryAt: NUM('When the summary was written, in seconds; 0 without'),
    }, 'What happened in a project (§6.4)'),
    description: 'The deterministic Pulse of a project',
  }),

  'POST/api/project/message/create': route({
    authorize: withSession,
    fn: (ctx, input) => createChannelMessage(ctx.session.userId, input),
    input: OBJ({
      project: STR('Slug of the project'),
      channel: STR('general, help or announcements'),
      body: STR('Markdown, empty with an image'),
      media: optional(ARR(NUM('Id of an upload'), 'One image at most')),
      alert: optional(NUM('Alert of #suivi answered, in channel tracking')),
      parent: optional(NUM('Message answered in its thread, same channel')),
    }),
    output: channelMessage,
    description: 'Write in a channel of a project, with an image',
  }),

  'POST/api/project/message/like': route({
    authorize: withSession,
    fn: (ctx, { message, on }) => likeMessage(ctx.session.userId, message, on),
    input: OBJ({
      message: NUM('Id of the message'),
      on: BOOL('Gives the +1, or takes it back'),
    }),
    output: OBJ({
      likes: NUM('Its +1'),
      liked: BOOL('A +1 of the developer'),
    }),
    description: 'A +1 on a message of a channel the developer reads',
  }),

  'GET/api/project/messages': route({
    authorize: withSession,
    fn: (ctx, { project }) => listChannelMessages(ctx.session.userId, project),
    input: OBJ({ project: STR('Slug of the project') }),
    output: ARR(channelMessage),
    description:
      'The latest messages of the channels the developer reads, then their threads',
  }),

  'GET/api/video/preview': route({
    authorize: withSession,
    fn: (_, { url }) => previewVideo(url),
    input: OBJ({ url: STR('YouTube, Loom or Vimeo link') }),
    output: OBJ({
      provider: STR('YouTube, Loom or Vimeo'),
      id: STR('Id of the video at the provider'),
      embedUrl: STR('Address of the player, built from the id'),
      title: STR('Title, empty if the provider did not say'),
      thumbnailUrl: STR('Thumbnail of the provider, empty if none'),
    }),
    description: 'What a page shows of a video link before its player',
  }),

  'GET/api/video/thumbnail': route({
    authorize: withSession,
    fn: (_, { url }) => thumbnailOf(url),
    input: OBJ({ url: STR('YouTube, Loom or Vimeo link') }),
    description: 'The thumbnail of a video, served by Pamoja (§17.3)',
  }),

  'GET/api/media': route({
    authorize: withSession,
    fn: (ctx, { key }) => serveMedia(ctx.session.userId, key),
    input: OBJ({ key: STR('Random key of the file') }),
    description: 'The file of a media, to whom may see it',
  }),

  'POST/api/conversation/message/edit': route({
    authorize: withSession,
    fn: (ctx, { id, body }) => editMessage(ctx.session.userId, id, body),
    input: OBJ({
      id: NUM('Id of the message'),
      body: STR('Markdown, 2 000 characters at most'),
    }),
    description: 'Edit a message of the developer; it then reads as edited',
  }),

  'POST/api/conversation/message/delete': route({
    authorize: withSession,
    fn: (ctx, { id }) => deleteMessage(ctx.session.userId, id),
    input: OBJ({ id: NUM('Id of the message') }),
    description: 'Delete a message of the developer; its place stays',
  }),

  'POST/api/conversation/message/react': route({
    authorize: withSession,
    fn: (ctx, { id, emoji }) => reactToMessage(ctx.session.userId, id, emoji),
    input: OBJ({
      id: NUM('Id of the message'),
      emoji: LIST([...REACTIONS], 'One of the reactions offered'),
    }),
    description: 'Add a reaction to a message, or take it back',
  }),

  'POST/api/conversation/typing': route({
    authorize: withSession,
    fn: (ctx, { id }) => typing(ctx.session.userId, conversationIdOf(id)),
    input: OBJ({ id: conversationKey }),
    description: 'Tell the other one the developer is typing, for a moment',
  }),

  'POST/api/conversation/unread': route({
    authorize: withSession,
    fn: (ctx, { id, from }) =>
      markUnread(ctx.session.userId, conversationIdOf(id), from),
    input: OBJ({
      id: conversationKey,
      from: NUM('First message to read again'),
    }),
    description: 'Mark a conversation unread from a message received',
  }),

  'POST/api/conversation/mute': route({
    authorize: withSession,
    fn: (ctx, { id, muted }) =>
      muteConversation(ctx.session.userId, conversationIdOf(id), muted),
    input: OBJ({ id: conversationKey, muted: BOOL('Muted') }),
    description: 'No toast nor count for a conversation, or back to normal',
  }),

  'POST/api/conversation/archive': route({
    authorize: withSession,
    fn: (ctx, { id, archived }) =>
      archiveConversation(ctx.session.userId, conversationIdOf(id), archived),
    input: OBJ({
      id: conversationKey,
      archived: BOOL('Archived'),
    }),
    description: 'Out of the main list until a new message, or back',
  }),

  'GET/api/conversations/search': route({
    authorize: withSession,
    fn: (ctx, { q }) => searchMessages(ctx.session.userId, q),
    input: OBJ({ q: STR('Two to 100 characters') }),
    output: ARR(
      OBJ({
        conversationId: STR('Public id of the conversation of the message'),
        with: person,
        message: OBJ({
          id: NUM('Id of the message'),
          mine: BOOL('Written by the developer'),
          at: NUM('When'),
          snippet: STR('The words around the match, as plain text'),
        }),
      }),
      'The latest 30 messages found',
    ),
    description: 'Search the messages of the developer',
  }),

  'POST/api/conversation/read': route({
    authorize: withSession,
    fn: (ctx, { id }) =>
      readConversation(ctx.session.userId, conversationIdOf(id)),
    input: OBJ({ id: conversationKey }),
    description: 'Mark the conversation as read',
  }),

  'POST/api/conversation/accept': route({
    authorize: withSession,
    fn: (ctx, { id }) =>
      acceptConversation(ctx.session.userId, conversationIdOf(id)),
    input: OBJ({ id: conversationKey }),
    description: 'Accept a message request',
  }),

  'POST/api/conversation/decline': route({
    authorize: withSession,
    fn: (ctx, { id }) =>
      declineConversation(ctx.session.userId, conversationIdOf(id)),
    input: OBJ({ id: conversationKey }),
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

  /*
   * Profile (§6.1, §9)
   */
  'POST/api/user/profile/update': route({
    authorize: withSession,
    fn: (ctx, fields) => {
      // The text fields have a length limit; the personalization is checked
      // by updateProfile (§9.2), its projects as slugs
      const { displayName, headline, bio, country, city, website } = fields
      assertFits({ displayName, headline, bio, country, city, website })
      assertSlugs(fields.featured ?? [], 'featured projects')
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
      theme: optional(STR('Profile theme id (§9.2); unknown ids are ignored')),
      accent: optional(STR('Accent colour id (§9.2); unknown ids are ignored')),
      sectionOrder: optional(
        ARR(STR('Section key'), 'New order of the profile sections'),
      ),
      featured: optional(
        ARR(STR('Project slug'), 'Projects highlighted, empty for all'),
      ),
    }, 'The whole editable profile: an empty field is emptied'),
    output: profileSaved,
    description: 'Save the profile',
  }),

  'POST/api/user/cover': route({
    authorize: withSession,
    fn: (ctx, { media }) => setCover(ctx.session.userId, media),
    input: OBJ({ media: NUM('Id of an upload, 0 removes the photo') }),
    output: ARR(media),
    description: 'Set or remove the photo of the cover of the profile',
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
    output: profileSaved,
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
    output: profileSaved,
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
  // themselves, what they search in their messages, and the one-time code
  // of the GitHub login (§16, QA-33)
  sensitiveKeys: [
    'password',
    'confPassword',
    'currentPassword',
    'newPassword',
    'code',
    'state',
    'body',
    'message',
    'bio',
    'headline',
    'description',
    'comment',
    'q',
  ],
})
