import { sqlCheck } from '@01edu/db'
import { initEntries } from '@01edu/db/entries'
import {
  Community,
  HelpRequest,
  Issue,
  Notification,
  Post,
  Project,
  ProjectMessage,
  PullRequest,
  Task,
  User,
} from '/api/schema.ts'

// Entries are the journal of everything that happens: reputation, activity,
// search and realtime read them (§13, §14.6). A number is never reused nor
// renumbered, and they go from 1 to N without a gap: at startup the library
// inserts the missing types and asserts that each id is the declared number.
// Always add new types at the end.
export const entries = {
  USER_LOGIN: 1,
  PROFILE_UPDATED: 2,
  BADGE_UNLOCKED: 3,
  NOTIFICATION_CREATED: 4,
  PROJECT_CREATED: 5,
  PROJECT_UPDATED: 6,
  PROJECT_MEMBER_JOINED: 7,
  TASK_UPDATED: 8,
  MESSAGE_CREATED: 9,
  PULSE_READY: 10,
  PR_OPENED: 11,
  PR_UPDATED: 12,
  PR_REVIEWED: 13,
  PR_MERGED: 14,
  PR_CLOSED: 15,
  PR_REVIEW_STALE: 16,
  ISSUE_UPDATED: 17,
  RELEASE_PUBLISHED: 18,
  CI_FAILED: 19,
  CI_FIXED: 20,
  COMMITS_PUSHED: 21,
  HELP_REQUEST_CREATED: 22,
  HELP_REQUEST_MATCHED: 23,
  HELP_REQUEST_ACCEPTED: 24,
  REVIEW_SUBMITTED: 25,
  REVIEW_HELP_CONFIRMED: 26,
  HELP_CONFIRMED: 27,
  HELP_REQUEST_WITHDRAWN: 28,
  HELP_REQUEST_RELEASED: 29,
  HELP_REQUEST_REOPENED: 30,
  HELP_REQUEST_EXPIRED: 31,
  POST_CREATED: 32,
  POST_UPDATED: 33,
  POST_REPLIED: 34,
  POST_REPOSTED: 35,
  ANSWER_ACCEPTED: 36,
  CONTENT_REPORTED: 37,
  MODERATION_ACTION: 38,
} as const

export type Entries = typeof entries
export type EntryTypeName = keyof Entries
export type EntryTypeId = Entries[EntryTypeName]
export const entryNames = Object.fromEntries(
  Object.entries(entries).map((e) => e.reverse()),
) as { [Name in EntryTypeName as Entries[Name]]: Name }

// `userId` is the developer the entry is about: the author of the action, or
// the owner of the proof for a reputation entry (§13.3)
const relations = {
  userId: User,
  projectId: Project,
  helpRequestId: HelpRequest,
  pullRequestId: PullRequest,
  issueId: Issue,
  taskId: Task,
  messageId: ProjectMessage,
  postId: Post,
  communityId: Community,
  notificationId: Notification,
}

/*
 * Fields. Each one is an `entry<Field>` table whose value is NOT NULL: a field
 * that does not apply is not declared on the type (§14.6).
 */

const source = {
  type: 'TEXT',
  description:
    'demo, github or platform: only github is « vérifié par GitHub »',
} as const

// What a reputation entry freezes so it never changes afterwards (§8.3)
const decision = {
  eligible: { type: 'INTEGER', description: '1 if it counts, else 0' },
  exclusionReason: {
    type: 'TEXT',
    description: 'why it does not count (§8.4), empty when eligible',
  },
  rulesVersion: {
    type: 'INTEGER',
    description: 'version of the rules applied',
  },
  source,
} as const

const help = {
  ...decision,
  requesterId: { type: 'INTEGER', description: 'who asked for help' },
  skills: {
    type: 'JSON',
    description: 'skills of the request at that time: skillId, slug, name',
  },
  helpCategory: { type: 'TEXT', description: 'type of help' },
} as const

const pullRequest = {
  repository: { type: 'TEXT', description: 'owner/name on GitHub' },
  prNumber: { type: 'INTEGER', description: 'number of the PR' },
  url: { type: 'TEXT', description: 'link to GitHub' },
} as const

/*
 * Who receives what (§13.3). The library only sends a type that has a
 * trigger, so a type without one is never broadcast.
 */

// Computed by the server when the SSE connection opens: the client never
// chooses what it receives (§13.2)
export type EntryListener = {
  userId: number
  projectIds: Set<number>
  followedProjectIds: Set<number>
  communityIds: Set<number>
  moderatedCommunityIds: Set<number>
  followedUserIds: Set<number>
  connectionId: string
  controller: ReadableStreamDefaultController
}

type Id = number | null | undefined
type Target = {
  userId?: Id
  projectId?: Id
  helpRequestId?: Id
  messageId?: Id
  communityId?: Id
}

// The library types a listener with the relations only
const listener = (sub: unknown) => sub as EntryListener
const has = (ids: Set<number>, id: Id) => id != null && ids.has(id)

const self = (entry: Target, sub: unknown) =>
  entry.userId != null && entry.userId === listener(sub).userId
const member = (entry: Target, sub: unknown) =>
  has(listener(sub).projectIds, entry.projectId)
const projectAudience = (entry: Target, sub: unknown) =>
  member(entry, sub) || has(listener(sub).followedProjectIds, entry.projectId)
const communityMember = (entry: Target, sub: unknown) =>
  has(listener(sub).communityIds, entry.communityId)
const moderator = (entry: Target, sub: unknown) =>
  has(listener(sub).moderatedCommunityIds, entry.communityId)

const isRequester = sqlCheck<{ helpRequestId: Id; userId: number }>`
  FROM helpRequest
  WHERE helpRequestId = :helpRequestId AND authorId = :userId
`
// The requester, the helper who accepted, the target of a collaboration
// request and every developer matched (§7.2)
const isHelpParticipant = sqlCheck<{ helpRequestId: Id; userId: number }>`
  FROM helpRequest
  WHERE helpRequestId = :helpRequestId
    AND (authorId = :userId OR acceptedBy = :userId OR targetUserId = :userId)
  UNION ALL
  SELECT 1 FROM helpMatch
  WHERE helpRequestId = :helpRequestId AND userId = :userId
`
const isAnnouncement = sqlCheck<{ messageId: Id }>`
  FROM projectMessage
  WHERE messageId = :messageId AND channel = 'announcements'
`

const requester = (entry: Target, sub: unknown) =>
  isRequester({
    helpRequestId: entry.helpRequestId,
    userId: listener(sub).userId,
  })
const helpParticipant = (entry: Target, sub: unknown) =>
  self(entry, sub) || isHelpParticipant({
    helpRequestId: entry.helpRequestId,
    userId: listener(sub).userId,
  })

export const Entry = initEntries(entries, relations, {
  /*
   * Identity
   */
  USER_LOGIN: { userId: 'user who logged in', fields: { source } },
  PROFILE_UPDATED: {
    userId: 'user whose profile changed, reindexed in Meilisearch',
    fields: { source },
  },
  BADGE_UNLOCKED: {
    userId: 'user who reached a new level',
    data: 'badge and level',
    fields: { source },
    trigger: self,
  },
  NOTIFICATION_CREATED: {
    userId: 'recipient',
    notificationId: 'the notification',
    fields: { source },
    trigger: self,
  },

  /*
   * Projects
   */
  PROJECT_CREATED: {
    userId: 'owner',
    projectId: 'project created',
    fields: { source },
  },
  PROJECT_UPDATED: {
    userId: 'user who changed it',
    projectId: 'project changed',
    fields: { source },
    trigger: projectAudience,
  },
  PROJECT_MEMBER_JOINED: {
    userId: 'new member',
    projectId: 'project joined',
    data: 'role',
    fields: { source },
    trigger: (entry, sub) => self(entry, sub) || projectAudience(entry, sub),
  },
  TASK_UPDATED: {
    userId: 'user who moved or edited the card',
    projectId: 'project of the board',
    taskId: 'card',
    fields: { source },
    trigger: member,
  },
  MESSAGE_CREATED: {
    userId: 'author',
    projectId: 'project of the channel',
    messageId: 'message',
    fields: { source },
    // Followers read #annonces too (§6.8)
    trigger: (entry, sub) =>
      member(entry, sub) ||
      (has(listener(sub).followedProjectIds, entry.projectId) &&
        isAnnouncement({ messageId: entry.messageId })),
  },
  PULSE_READY: {
    projectId: 'project summarized',
    data: 'period',
    fields: { source },
    trigger: projectAudience,
  },

  /*
   * GitHub, from the webhooks or the resync: they feed #suivi (§6.8)
   */
  PR_OPENED: {
    userId: 'author, when on Pamoja',
    projectId: 'project',
    pullRequestId: 'pull request',
    fields: { source },
    trigger: projectAudience,
  },
  PR_UPDATED: {
    userId: 'author, when on Pamoja',
    projectId: 'project',
    pullRequestId: 'pull request',
    fields: { source },
    trigger: projectAudience,
  },
  PR_REVIEWED: {
    userId: 'reviewer, when on Pamoja',
    projectId: 'project',
    pullRequestId: 'pull request reviewed',
    data: 'githubReviewId and state',
    fields: { source },
    trigger: projectAudience,
  },
  PR_MERGED: {
    userId: 'author, when on Pamoja: Open Source and Project Building',
    projectId: 'project',
    pullRequestId: 'pull request merged',
    fields: {
      ...decision,
      ...pullRequest,
      authorGithubId: { type: 'INTEGER', description: 'author on GitHub' },
      authorIsOwner: {
        type: 'INTEGER',
        description: '1 if the author owned the project: not Open Source',
      },
    },
    trigger: projectAudience,
  },
  PR_CLOSED: {
    userId: 'author, when on Pamoja',
    projectId: 'project',
    pullRequestId: 'pull request closed without merge',
    fields: { source },
    trigger: projectAudience,
  },
  PR_REVIEW_STALE: {
    projectId: 'project',
    pullRequestId: 'pull request without review for 2 days',
    fields: { source },
    trigger: projectAudience,
  },
  ISSUE_UPDATED: {
    userId: 'author, when on Pamoja',
    projectId: 'project',
    issueId: 'issue',
    fields: { source },
    trigger: projectAudience,
  },
  RELEASE_PUBLISHED: {
    userId: 'owner of the project: Project Building',
    projectId: 'project',
    fields: {
      ...decision,
      repository: pullRequest.repository,
      url: pullRequest.url,
      tag: { type: 'TEXT', description: 'tag of the release' },
    },
    trigger: projectAudience,
  },
  CI_FAILED: {
    userId: 'author of the commit, when on Pamoja',
    projectId: 'project',
    pullRequestId: 'pull request, if any',
    data: 'ciRunId, name, branch',
    fields: { source },
    trigger: projectAudience,
  },
  CI_FIXED: {
    userId: 'author of the commit, when on Pamoja',
    projectId: 'project',
    pullRequestId: 'pull request, if any',
    data: 'ciRunId, name, branch',
    fields: { source },
    trigger: projectAudience,
  },
  COMMITS_PUSHED: {
    userId: 'pusher, when on Pamoja',
    projectId: 'project',
    pullRequestId: 'pull request, if any',
    data: 'branch and commits, grouped',
    fields: { source },
    trigger: projectAudience,
  },

  /*
   * Help requests (§7)
   */
  HELP_REQUEST_CREATED: {
    userId: 'requester',
    projectId: 'project, if any',
    helpRequestId: 'request, indexed in Meilisearch',
    fields: { source },
  },
  HELP_REQUEST_MATCHED: {
    userId: 'developer matched',
    helpRequestId: 'request',
    fields: { source },
    trigger: self,
  },
  HELP_REQUEST_ACCEPTED: {
    userId: 'helper who accepted',
    projectId: 'project, if any',
    helpRequestId: 'request',
    fields: { source },
    trigger: (entry, sub) => requester(entry, sub) || member(entry, sub),
  },
  REVIEW_SUBMITTED: {
    userId: 'helper who reviewed',
    projectId: 'project, if any',
    helpRequestId: 'request now review_submitted',
    pullRequestId: 'pull request reviewed',
    fields: { source },
    trigger: (entry, sub) => requester(entry, sub) || member(entry, sub),
  },
  REVIEW_HELP_CONFIRMED: {
    userId: 'helper, who owns the proof: Code Review',
    projectId: 'project, if any',
    helpRequestId: 'request completed',
    pullRequestId: 'pull request reviewed',
    fields: {
      ...help,
      ...pullRequest,
      githubReviewId: { type: 'INTEGER', description: 'review on GitHub' },
      reviewState: {
        type: 'TEXT',
        description: 'approved, changes_requested or commented',
      },
    },
    trigger: (entry, sub) => self(entry, sub) || member(entry, sub),
  },
  HELP_CONFIRMED: {
    userId: 'helper, who owns the proof: Mentoring or Community Help',
    projectId: 'project, if any',
    helpRequestId: 'request completed',
    fields: help,
    trigger: (entry, sub) => self(entry, sub) || member(entry, sub),
  },
  HELP_REQUEST_WITHDRAWN: {
    userId: 'helper who withdrew',
    helpRequestId: 'request open again',
    fields: { source },
    trigger: helpParticipant,
  },
  HELP_REQUEST_RELEASED: {
    userId: 'helper released by the requester',
    helpRequestId: 'request open again',
    fields: { source },
    trigger: helpParticipant,
  },
  HELP_REQUEST_REOPENED: {
    userId: 'requester',
    helpRequestId: 'request open again',
    fields: { source },
    trigger: helpParticipant,
  },
  HELP_REQUEST_EXPIRED: {
    userId: 'requester',
    helpRequestId: 'request expired',
    fields: { source },
    trigger: helpParticipant,
  },

  /*
   * Feed and communities (§10)
   */
  POST_CREATED: {
    userId: 'author',
    communityId: 'community, if any',
    postId: 'post',
    fields: { source },
    trigger: communityMember,
  },
  POST_UPDATED: {
    userId: 'author',
    communityId: 'community, if any',
    postId: 'post, reindexed in Meilisearch',
    fields: { source },
  },
  POST_REPLIED: {
    userId: 'author of the reply',
    communityId: 'community, if any',
    postId: 'the reply',
    fields: { source },
    trigger: communityMember,
  },
  POST_REPOSTED: {
    userId: 'developer who reposted',
    communityId: 'community, if any',
    postId: 'the repost',
    fields: { source },
    trigger: (entry, sub) =>
      communityMember(entry, sub) ||
      has(listener(sub).followedUserIds, entry.userId),
  },
  ANSWER_ACCEPTED: {
    userId: 'author of the answer: Community Help',
    communityId: 'community, if any',
    postId: 'answer accepted',
    fields: {
      ...decision,
      askerId: { type: 'INTEGER', description: 'author of the question' },
    },
  },

  /*
   * Moderation (§10.5)
   */
  CONTENT_REPORTED: {
    userId: 'reporter, never shown to the author',
    communityId: 'community of the content, if any',
    postId: 'post reported, if it is a post',
    data: 'targetType and targetId',
    fields: { source },
    trigger: moderator,
  },
  MODERATION_ACTION: {
    userId: 'author targeted by the action',
    communityId: 'community, if any',
    postId: 'post, if it is a post',
    data: 'moderationActionId and action',
    fields: { source },
    trigger: (entry, sub) => self(entry, sub) || moderator(entry, sub),
  },
})

// The library requires every relation declared on a type, while the column
// is optional. For a relation marked « if any », pass `maybe(id)`: an absent
// id is stored as NULL.
export const maybe = (id: number | null | undefined) => (id ?? null) as number

export const entryInsertListeners = Entry.insertListeners
export const archiveEntry = Entry.archive
