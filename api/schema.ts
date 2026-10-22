import { createTable, db, sql } from '@01edu/db'
import { migrate } from '/api/migrate.ts'
import { fromFileUrl } from 'jsr:@std/path@^1.0.8'

// Data model of the cahier des charges (§14). Conventions (§12.5):
// - the primary key is named after its table (`userId`), like Tournament and
//   like the entries relations, so joins never mix several `id` columns;
// - uniqueness and lookups are indexes declared after each table;
// - dates are REAL timestamps in seconds, from `now()` of @01edu/time, like
//   Tournament and the `createdAt` of the entries; structured data is JSON;
// - a table cannot `join` itself, and polymorphic targets (`targetType` +
//   `targetId`) have no constraint: the code checks them;
// - `source` says where a row comes from: `demo` (seed), `github` (synced),
//   `platform` (written on Pamoja). Only `github` backs a verified proof.

// @01edu/db sets neither: without foreign_keys, `join` is not enforced, and
// without busy_timeout a concurrent writer fails at once (§12.5)
db.exec('PRAGMA foreign_keys = ON')
db.exec('PRAGMA busy_timeout = 5000')

// Migrations must run before createTable: createTable asserts that the
// existing table matches the declared schema. On a fresh database no
// migration runs: the tables below are the initial schema.
await migrate(fromFileUrl(import.meta.resolve('../migrations')))

// `sql` writes its values into the query text (String.raw), like the indexes
// of @01edu/db/entries: only constants of this file go in, never user input
const index = (name: string, table: string, columns: string) =>
  sql`CREATE INDEX IF NOT EXISTS ${name} ON ${table} (${columns})`.run()
const unique = (name: string, table: string, columns: string) =>
  sql`CREATE UNIQUE INDEX IF NOT EXISTS ${name} ON ${table} (${columns})`.run()

/*
 * Identity and profile (§14.1)
 */

export const User = createTable('user', {
  userId: { type: 'INTEGER', primary: true },
  // Never the username, which can change on GitHub
  githubId: { type: 'INTEGER' },
  githubUsername: { type: 'TEXT' },
  avatarUrl: { type: 'TEXT' },
  email: { type: 'TEXT', optional: true },
  suspendedUntil: { type: 'REAL', optional: true },
  source: { type: 'TEXT' },
  createdAt: { type: 'REAL' },
  updatedAt: { type: 'REAL' },
})
unique('user_github_id', 'user', 'githubId')

export const Profile = createTable('profile', {
  profileId: { type: 'INTEGER', primary: true },
  userId: { type: 'INTEGER', join: User },
  displayName: { type: 'TEXT' },
  headline: { type: 'TEXT', optional: true },
  bio: { type: 'TEXT', optional: true },
  country: { type: 'TEXT', optional: true },
  city: { type: 'TEXT', optional: true },
  website: { type: 'TEXT', optional: true },
  coverUrl: { type: 'TEXT', optional: true },
  theme: { type: 'TEXT' },
  accent: { type: 'TEXT' },
  availability: { type: 'TEXT' },
  sectionOrder: { type: 'JSON', optional: true },
  featured: { type: 'JSON', optional: true },
  // instant, digest or off (§7.4)
  matchingMode: { type: 'TEXT' },
  matchingFilters: { type: 'JSON', optional: true },
  createdAt: { type: 'REAL' },
  updatedAt: { type: 'REAL' },
})
unique('profile_user', 'profile', 'userId')

export const Skill = createTable('skill', {
  skillId: { type: 'INTEGER', primary: true },
  slug: { type: 'TEXT' },
  name: { type: 'TEXT' },
  category: { type: 'TEXT' },
})
unique('skill_slug', 'skill', 'slug')

export const SkillAlias = createTable('skillAlias', {
  skillAliasId: { type: 'INTEGER', primary: true },
  // `postgres` → `postgresql`
  alias: { type: 'TEXT' },
  skillId: { type: 'INTEGER', join: Skill },
})
unique('skill_alias', 'skillAlias', 'alias')

export const UserSkill = createTable('userSkill', {
  userSkillId: { type: 'INTEGER', primary: true },
  userId: { type: 'INTEGER', join: User },
  skillId: { type: 'INTEGER', join: Skill },
  // declared, github or platform_activity, weighted by the matching (§7.3)
  source: { type: 'TEXT' },
  createdAt: { type: 'REAL' },
})
unique('user_skill', 'userSkill', 'userId, skillId, source')

export const UserIntent = createTable('userIntent', {
  userIntentId: { type: 'INTEGER', primary: true },
  userId: { type: 'INTEGER', join: User },
  intent: { type: 'TEXT' },
})
unique('user_intent', 'userIntent', 'userId, intent')

export const Follow = createTable('follow', {
  followId: { type: 'INTEGER', primary: true },
  followerId: { type: 'INTEGER', join: User },
  // user, project or community
  targetType: { type: 'TEXT' },
  targetId: { type: 'INTEGER' },
  createdAt: { type: 'REAL' },
})
unique('follow_target', 'follow', 'followerId, targetType, targetId')

/*
 * Projects (§14.3), before GitHub: a repository belongs to a project
 */

export const Project = createTable('project', {
  projectId: { type: 'INTEGER', primary: true },
  ownerId: { type: 'INTEGER', join: User },
  name: { type: 'TEXT' },
  slug: { type: 'TEXT' },
  description: { type: 'TEXT' },
  vision: { type: 'TEXT', optional: true },
  // public or unlisted
  visibility: { type: 'TEXT' },
  status: { type: 'TEXT' },
  source: { type: 'TEXT' },
  createdAt: { type: 'REAL' },
  updatedAt: { type: 'REAL' },
  // Added by migrations/002: skill ids of the stack
  skills: { type: 'JSON', optional: true },
})
unique('project_slug', 'project', 'slug')

/*
 * GitHub (§14.2). No token table: no user token is ever stored (§5.2)
 */

export const GithubInstallation = createTable('githubInstallation', {
  installationId: { type: 'INTEGER', primary: true },
  githubInstallationId: { type: 'INTEGER' },
  accountLogin: { type: 'TEXT' },
  // User or Organization
  accountType: { type: 'TEXT' },
  // Unknown while only the `installation` webhook has arrived
  installedByUserId: { type: 'INTEGER', join: User, optional: true },
  createdAt: { type: 'REAL' },
  updatedAt: { type: 'REAL' },
})
unique(
  'github_installation',
  'githubInstallation',
  'githubInstallationId',
)

export const Repository = createTable('repository', {
  repositoryId: { type: 'INTEGER', primary: true },
  projectId: { type: 'INTEGER', join: Project },
  githubId: { type: 'INTEGER' },
  installationId: {
    type: 'INTEGER',
    join: GithubInstallation,
    optional: true,
  },
  owner: { type: 'TEXT' },
  name: { type: 'TEXT' },
  fullName: { type: 'TEXT' },
  defaultBranch: { type: 'TEXT' },
  // poll or live (§5.4)
  syncMode: { type: 'TEXT' },
  // ETag of each conditional request (§5.6)
  etag: { type: 'JSON', optional: true },
  lastSyncedAt: { type: 'REAL', optional: true },
  source: { type: 'TEXT' },
  // Added by migrations/002 (§5.4): the README shown on the project, and
  // what the import reads (stars, forks, topics, languages, contributors,
  // release)
  readme: { type: 'TEXT', optional: true },
  stats: { type: 'JSON', optional: true },
})
unique('repository_github_id', 'repository', 'githubId')

export const PullRequest = createTable('pullRequest', {
  pullRequestId: { type: 'INTEGER', primary: true },
  repositoryId: { type: 'INTEGER', join: Repository },
  githubId: { type: 'INTEGER' },
  number: { type: 'INTEGER' },
  title: { type: 'TEXT' },
  state: { type: 'TEXT' },
  authorGithubId: { type: 'INTEGER' },
  additions: { type: 'INTEGER' },
  deletions: { type: 'INTEGER' },
  mergedAt: { type: 'REAL', optional: true },
  source: { type: 'TEXT' },
  createdAt: { type: 'REAL' },
  updatedAt: { type: 'REAL' },
  // Added by migrations/002: the author is often not on Pamoja
  authorLogin: { type: 'TEXT', optional: true },
  branch: { type: 'TEXT', optional: true },
  // Added by migrations/003 (§7.1): skill ids of the languages of the changed
  // files, read at the head commit skillsSha; read again after a push
  headSha: { type: 'TEXT', optional: true },
  skills: { type: 'JSON', optional: true },
  skillsSha: { type: 'TEXT', optional: true },
})
unique('pull_request_number', 'pullRequest', 'repositoryId, number')

export const Issue = createTable('issue', {
  issueId: { type: 'INTEGER', primary: true },
  repositoryId: { type: 'INTEGER', join: Repository },
  githubId: { type: 'INTEGER' },
  number: { type: 'INTEGER' },
  title: { type: 'TEXT' },
  state: { type: 'TEXT' },
  labels: { type: 'JSON' },
  authorGithubId: { type: 'INTEGER' },
  source: { type: 'TEXT' },
  createdAt: { type: 'REAL' },
  updatedAt: { type: 'REAL' },
  // Added by migrations/002
  authorLogin: { type: 'TEXT', optional: true },
  comments: { type: 'INTEGER', optional: true },
})
unique('issue_number', 'issue', 'repositoryId, number')

// Detects « CI réparée » after a failure (§6.8)
export const CiRun = createTable('ciRun', {
  ciRunId: { type: 'INTEGER', primary: true },
  repositoryId: { type: 'INTEGER', join: Repository },
  githubId: { type: 'INTEGER' },
  // actions, checks or status
  source: { type: 'TEXT' },
  name: { type: 'TEXT' },
  headSha: { type: 'TEXT' },
  branch: { type: 'TEXT' },
  pullRequestId: { type: 'INTEGER', join: PullRequest, optional: true },
  conclusion: { type: 'TEXT', optional: true },
  url: { type: 'TEXT' },
  completedAt: { type: 'REAL', optional: true },
})
unique('ci_run_github', 'ciRun', 'repositoryId, source, githubId')

// The persistent queue of webhooks: it survives restarts (§5.5)
export const WebhookDelivery = createTable('webhookDelivery', {
  deliveryId: { type: 'INTEGER', primary: true },
  githubDeliveryId: { type: 'TEXT' },
  event: { type: 'TEXT' },
  repositoryId: { type: 'INTEGER', join: Repository, optional: true },
  payload: { type: 'JSON' },
  // received, processing, done or failed
  status: { type: 'TEXT' },
  attempts: { type: 'INTEGER' },
  lastError: { type: 'TEXT', optional: true },
  receivedAt: { type: 'REAL' },
  processingStartedAt: { type: 'REAL', optional: true },
  processedAt: { type: 'REAL', optional: true },
})
unique('webhook_delivery_github', 'webhookDelivery', 'githubDeliveryId')
index('webhook_delivery_queue', 'webhookDelivery', 'status, receivedAt')

/*
 * Inside a project (§14.3)
 */

export const ProjectMember = createTable('projectMember', {
  projectMemberId: { type: 'INTEGER', primary: true },
  projectId: { type: 'INTEGER', join: Project },
  userId: { type: 'INTEGER', join: User },
  // owner, maintainer, contributor, reviewer or observer
  role: { type: 'TEXT' },
  joinedAt: { type: 'REAL' },
})
unique('project_member', 'projectMember', 'projectId, userId')

export const JoinRequest = createTable('joinRequest', {
  joinRequestId: { type: 'INTEGER', primary: true },
  projectId: { type: 'INTEGER', join: Project },
  userId: { type: 'INTEGER', join: User },
  areas: { type: 'JSON' },
  availability: { type: 'TEXT' },
  message: { type: 'TEXT' },
  status: { type: 'TEXT' },
  createdAt: { type: 'REAL' },
})
index('join_request_project', 'joinRequest', 'projectId, status')

export const ProjectNeed = createTable('projectNeed', {
  projectNeedId: { type: 'INTEGER', primary: true },
  projectId: { type: 'INTEGER', join: Project },
  type: { type: 'TEXT' },
  title: { type: 'TEXT' },
  description: { type: 'TEXT', optional: true },
  // Skill ids
  skills: { type: 'JSON' },
  status: { type: 'TEXT' },
  createdAt: { type: 'REAL' },
  updatedAt: { type: 'REAL' },
})
index('project_need_project', 'projectNeed', 'projectId, status')

export const Milestone = createTable('milestone', {
  milestoneId: { type: 'INTEGER', primary: true },
  projectId: { type: 'INTEGER', join: Project },
  title: { type: 'TEXT' },
  description: { type: 'TEXT', optional: true },
  // planned, active or done
  status: { type: 'TEXT' },
  position: { type: 'INTEGER' },
  createdAt: { type: 'REAL' },
})

export const Task = createTable('task', {
  taskId: { type: 'INTEGER', primary: true },
  projectId: { type: 'INTEGER', join: Project },
  milestoneId: { type: 'INTEGER', join: Milestone, optional: true },
  // backlog, ready, in_progress, review or done (`column` is an SQL keyword)
  boardColumn: { type: 'TEXT' },
  title: { type: 'TEXT' },
  description: { type: 'TEXT', optional: true },
  priority: { type: 'TEXT', optional: true },
  assigneeId: { type: 'INTEGER', join: User, optional: true },
  issueId: { type: 'INTEGER', join: Issue, optional: true },
  pullRequestId: { type: 'INTEGER', join: PullRequest, optional: true },
  // Fractional rank: a card goes between two others without renumbering
  rank: { type: 'TEXT' },
  createdAt: { type: 'REAL' },
  updatedAt: { type: 'REAL' },
})
index('task_board', 'task', 'projectId, boardColumn, rank')

// #suivi has no table: it shows the entries of the webhooks (§6.8)
export const ProjectMessage = createTable('projectMessage', {
  messageId: { type: 'INTEGER', primary: true },
  projectId: { type: 'INTEGER', join: Project },
  // general, help or announcements
  channel: { type: 'TEXT' },
  authorId: { type: 'INTEGER', join: User },
  body: { type: 'TEXT' },
  // A thread under a message, or under an alert of #suivi (an entry id)
  parentMessageId: { type: 'INTEGER', optional: true },
  parentEntryId: { type: 'INTEGER', optional: true },
  hiddenAt: { type: 'REAL', optional: true },
  source: { type: 'TEXT' },
  createdAt: { type: 'REAL' },
})
index(
  'project_message_channel',
  'projectMessage',
  'projectId, channel, createdAt',
)

export const ChannelState = createTable('channelState', {
  channelStateId: { type: 'INTEGER', primary: true },
  userId: { type: 'INTEGER', join: User },
  projectId: { type: 'INTEGER', join: Project },
  // general, tracking, help or announcements
  channel: { type: 'TEXT' },
  lastReadAt: { type: 'REAL', optional: true },
  // all, mentions, mine or none; « mine » by default for #suivi
  notify: { type: 'TEXT' },
})
unique('channel_state', 'channelState', 'userId, projectId, channel')

export const MessageReaction = createTable('messageReaction', {
  messageReactionId: { type: 'INTEGER', primary: true },
  messageId: { type: 'INTEGER', join: ProjectMessage },
  userId: { type: 'INTEGER', join: User },
  emoji: { type: 'TEXT' },
})
unique('message_reaction', 'messageReaction', 'messageId, userId, emoji')

// AI summaries of the Pulse, stored, never computed while a page shows (§11)
export const ProjectSummary = createTable('projectSummary', {
  projectSummaryId: { type: 'INTEGER', primary: true },
  projectId: { type: 'INTEGER', join: Project },
  period: { type: 'TEXT' },
  content: { type: 'TEXT' },
  inputHash: { type: 'TEXT' },
  createdAt: { type: 'REAL' },
})

/*
 * Help, matching, reputation (§14.4). Reputation itself is computed from the
 * entries and their frozen fields (§8.3), not from these tables.
 */

export const HelpRequest = createTable('helpRequest', {
  helpRequestId: { type: 'INTEGER', primary: true },
  authorId: { type: 'INTEGER', join: User },
  // A collaboration request is a help request to one person (§7.6)
  targetUserId: { type: 'INTEGER', join: User, optional: true },
  projectId: { type: 'INTEGER', join: Project, optional: true },
  pullRequestId: { type: 'INTEGER', join: PullRequest, optional: true },
  category: { type: 'TEXT' },
  title: { type: 'TEXT' },
  description: { type: 'TEXT' },
  // Skill ids
  skills: { type: 'JSON' },
  expectedLevel: { type: 'TEXT', optional: true },
  estimatedMinutes: { type: 'INTEGER', optional: true },
  // The lifecycle of §7.2
  status: { type: 'TEXT' },
  acceptedBy: { type: 'INTEGER', join: User, optional: true },
  acceptedAt: { type: 'REAL', optional: true },
  deliveredAt: { type: 'REAL', optional: true },
  confirmedAt: { type: 'REAL', optional: true },
  expiresAt: { type: 'REAL' },
  source: { type: 'TEXT' },
  createdAt: { type: 'REAL' },
  updatedAt: { type: 'REAL' },
  // Added by migrations/003: a video that shows the problem (§7.1)
  videoUrl: { type: 'TEXT', optional: true },
  // Added by migrations/004 (§7.2): each reminder goes out once
  helperRemindedAt: { type: 'REAL', optional: true },
  confirmRemindedAt: { type: 'REAL', optional: true },
})
index('help_request_status', 'helpRequest', 'status')
index('help_request_author', 'helpRequest', 'authorId')

export const Review = createTable('review', {
  reviewId: { type: 'INTEGER', primary: true },
  pullRequestId: { type: 'INTEGER', join: PullRequest },
  githubReviewId: { type: 'INTEGER' },
  reviewerGithubId: { type: 'INTEGER' },
  reviewerUserId: { type: 'INTEGER', join: User, optional: true },
  state: { type: 'TEXT' },
  commentCount: { type: 'INTEGER' },
  submittedAt: { type: 'REAL' },
  // Set when the review validates a help request (§7.5)
  helpRequestId: { type: 'INTEGER', join: HelpRequest, optional: true },
  source: { type: 'TEXT' },
})
unique('review_github', 'review', 'githubReviewId')

export const HelpMatch = createTable('helpMatch', {
  helpMatchId: { type: 'INTEGER', primary: true },
  helpRequestId: { type: 'INTEGER', join: HelpRequest },
  userId: { type: 'INTEGER', join: User },
  score: { type: 'INTEGER' },
  // The criteria shown in « Pourquoi ce match ? »
  reasons: { type: 'JSON' },
  wave: { type: 'INTEGER' },
  // 1 for the seat kept for a promising newcomer
  newcomerSlot: { type: 'INTEGER' },
  notifiedAt: { type: 'REAL', optional: true },
  // notified, accepted, declined, withdrawn or released
  status: { type: 'TEXT' },
})
unique('help_match', 'helpMatch', 'helpRequestId, userId')

// Only the requester and the accepted helper read and write it (§7.2)
export const HelpMessage = createTable('helpMessage', {
  helpMessageId: { type: 'INTEGER', primary: true },
  helpRequestId: { type: 'INTEGER', join: HelpRequest },
  authorId: { type: 'INTEGER', join: User },
  body: { type: 'TEXT' },
  createdAt: { type: 'REAL' },
})
index('help_message_thread', 'helpMessage', 'helpRequestId, createdAt')

export const Notification = createTable('notification', {
  notificationId: { type: 'INTEGER', primary: true },
  userId: { type: 'INTEGER', join: User },
  type: { type: 'TEXT' },
  // for-you, projects, communities, social or system
  category: { type: 'TEXT' },
  entryId: { type: 'INTEGER', optional: true },
  actorId: { type: 'INTEGER', join: User, optional: true },
  payload: { type: 'JSON' },
  readAt: { type: 'REAL', optional: true },
  createdAt: { type: 'REAL' },
})
index('notification_inbox', 'notification', 'userId, readAt, createdAt')

// Badges themselves are constants of the code (§8.2)
export const BadgeProgress = createTable('badgeProgress', {
  badgeProgressId: { type: 'INTEGER', primary: true },
  userId: { type: 'INTEGER', join: User },
  badge: { type: 'TEXT' },
  level: { type: 'INTEGER' },
  count: { type: 'INTEGER' },
  updatedAt: { type: 'REAL' },
})
unique('badge_progress', 'badgeProgress', 'userId, badge')

export const Embedding = createTable('embedding', {
  embeddingId: { type: 'INTEGER', primary: true },
  // user or help_request
  targetType: { type: 'TEXT' },
  targetId: { type: 'INTEGER' },
  model: { type: 'TEXT' },
  vector: { type: 'BLOB' },
  inputHash: { type: 'TEXT' },
  createdAt: { type: 'REAL' },
})
unique('embedding_target', 'embedding', 'targetType, targetId, model')

/*
 * Communities, feed and moderation (§14.5)
 */

export const Community = createTable('community', {
  communityId: { type: 'INTEGER', primary: true },
  slug: { type: 'TEXT' },
  name: { type: 'TEXT' },
  // technology, country or domain
  type: { type: 'TEXT' },
  description: { type: 'TEXT' },
  countryCode: { type: 'TEXT', optional: true },
  source: { type: 'TEXT' },
  createdAt: { type: 'REAL' },
})
unique('community_slug', 'community', 'slug')

export const CommunityMember = createTable('communityMember', {
  communityMemberId: { type: 'INTEGER', primary: true },
  communityId: { type: 'INTEGER', join: Community },
  userId: { type: 'INTEGER', join: User },
  // member or moderator
  role: { type: 'TEXT' },
  joinedAt: { type: 'REAL' },
})
unique('community_member', 'communityMember', 'communityId, userId')

// A reply is a post; a repost points at its original (§10.1)
export const Post = createTable('post', {
  postId: { type: 'INTEGER', primary: true },
  authorId: { type: 'INTEGER', join: User },
  // None: the post lives on the author's profile
  communityId: { type: 'INTEGER', join: Community, optional: true },
  projectId: { type: 'INTEGER', join: Project, optional: true },
  type: { type: 'TEXT' },
  title: { type: 'TEXT', optional: true },
  body: { type: 'TEXT' },
  attachments: { type: 'JSON', optional: true },
  parentId: { type: 'INTEGER', optional: true },
  rootId: { type: 'INTEGER', optional: true },
  repostOfId: { type: 'INTEGER', optional: true },
  acceptedReplyId: { type: 'INTEGER', optional: true },
  hiddenAt: { type: 'REAL', optional: true },
  source: { type: 'TEXT' },
  createdAt: { type: 'REAL' },
  updatedAt: { type: 'REAL' },
})
index('post_community', 'post', 'communityId, createdAt')
index('post_replies', 'post', 'parentId, createdAt')
index('post_thread', 'post', 'rootId')

export const Reaction = createTable('reaction', {
  reactionId: { type: 'INTEGER', primary: true },
  userId: { type: 'INTEGER', join: User },
  targetType: { type: 'TEXT' },
  targetId: { type: 'INTEGER' },
  // like, useful or thanks
  kind: { type: 'TEXT' },
})
unique('reaction_target', 'reaction', 'userId, targetType, targetId, kind')

export const Bookmark = createTable('bookmark', {
  bookmarkId: { type: 'INTEGER', primary: true },
  userId: { type: 'INTEGER', join: User },
  postId: { type: 'INTEGER', join: Post },
  createdAt: { type: 'REAL' },
})
unique('bookmark_post', 'bookmark', 'userId, postId')

export const Report = createTable('report', {
  reportId: { type: 'INTEGER', primary: true },
  reporterId: { type: 'INTEGER', join: User },
  targetType: { type: 'TEXT' },
  targetId: { type: 'INTEGER' },
  reason: { type: 'TEXT' },
  comment: { type: 'TEXT', optional: true },
  // open, resolved or dismissed
  status: { type: 'TEXT' },
  createdAt: { type: 'REAL' },
  resolvedAt: { type: 'REAL', optional: true },
})
unique('report_target', 'report', 'reporterId, targetType, targetId')
index('report_queue', 'report', 'status, createdAt')

// Immutable history of the moderation (§10.5)
export const ModerationAction = createTable('moderationAction', {
  moderationActionId: { type: 'INTEGER', primary: true },
  moderatorId: { type: 'INTEGER', join: User },
  reportId: { type: 'INTEGER', join: Report, optional: true },
  targetType: { type: 'TEXT' },
  targetId: { type: 'INTEGER' },
  // dismiss, hide, warn, suspend or revoke_evidence
  action: { type: 'TEXT' },
  reason: { type: 'TEXT' },
  until: { type: 'REAL', optional: true },
  createdAt: { type: 'REAL' },
})

// Uploaded images; an image without a target after 24 h is deleted (§17.3)
export const Media = createTable('media', {
  mediaId: { type: 'INTEGER', primary: true },
  ownerId: { type: 'INTEGER', join: User },
  storageKey: { type: 'TEXT' },
  mime: { type: 'TEXT' },
  width: { type: 'INTEGER' },
  height: { type: 'INTEGER' },
  bytes: { type: 'INTEGER' },
  // profile_cover, project_gallery, post, help_request or message
  targetType: { type: 'TEXT', optional: true },
  targetId: { type: 'INTEGER', optional: true },
  position: { type: 'INTEGER' },
  hiddenAt: { type: 'REAL', optional: true },
  source: { type: 'TEXT' },
  createdAt: { type: 'REAL' },
})
index('media_target', 'media', 'targetType, targetId')
