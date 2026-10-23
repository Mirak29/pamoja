import { DESCRIPTION_MAX, MESSAGE_MAX, TITLE_MAX } from '/api/help-rules.ts'

// The size of what a member writes, in characters (§16): the server refuses
// more, the page counts down before it. Close to LinkedIn: a post 3 000, a
// comment 1 250, a headline 220, an « About » 2 600.
export const LIMITS = {
  // Profile (§9.1)
  displayName: 70,
  headline: 220,
  bio: 2600,
  city: 80,
  country: 80,
  website: 200,
  // Feed (§10.1)
  postTitle: 150,
  post: 3000,
  reply: 1250,
  // Project channels (§6.8)
  channelMessage: 2000,
  // Direct messages (§10.6)
  directMessage: 2000,
  // Help requests (§7.1, §7.2)
  helpTitle: TITLE_MAX,
  helpDescription: DESCRIPTION_MAX,
  helpMessage: MESSAGE_MAX,
  // Projects and communities
  projectName: 80,
  projectDescription: 300,
  projectVision: 1000,
  communityName: 60,
  communityDescription: 500,
  // A report, a collaboration proposal, a request to join, a moderation note
  note: 1000,
} as const

export type Limited = keyof typeof LIMITS

/** The first field longer than its limit, if any: for a 400 of the server */
export const tooLong = <K extends Limited>(
  fields: Partial<Record<K, string>>,
) =>
  (Object.keys(fields) as K[]).find((key) =>
    (fields[key] ?? '').trim().length > LIMITS[key]
  )
