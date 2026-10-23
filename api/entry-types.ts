// Pure module, also bundled for the web (web/lib/realtime.ts): no database
// here, the entries themselves are declared in api/entries.ts

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
  HELP_REQUEST_CANCELLED: 39,
  HELP_REQUEST_DELIVERED: 40,
  HELP_MESSAGE_CREATED: 41,
  HELP_REQUEST_CLOSED: 42,
  DIRECT_MESSAGE_CREATED: 43,
  CONVERSATION_UPDATED: 44,
} as const

export type Entries = typeof entries
export type EntryTypeName = keyof Entries
export type EntryTypeId = Entries[EntryTypeName]
export const entryNames = Object.fromEntries(
  Object.entries(entries).map((e) => e.reverse()),
) as { [Name in EntryTypeName as Entries[Name]]: Name }
