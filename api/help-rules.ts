// The delays of the help request lifecycle (§7.2), in seconds: initial
// values, kept together so they can be tuned in one place

const HOUR = 3600
const DAY = 24 * HOUR

/** An open request nobody accepted expires */
export const OPEN_FOR = 7 * DAY
/** Without activity of the helper, a reminder */
export const HELPER_REMINDER_AFTER = 24 * HOUR
/** Without activity of the helper, the requester may release the request */
export const RELEASE_AFTER = 72 * HOUR
/** The requester is reminded to confirm the help */
export const CONFIRM_REMINDER_AFTER = 24 * HOUR
/** Without an answer of the requester, closed_unconfirmed */
export const CONFIRM_WITHIN = 7 * DAY

// The matching (§7.3)
/** Developers notified by one wave, the newcomer seat included */
export const WAVE_SIZE = 5
/** Without an acceptance, the next wave leaves */
export const NEXT_WAVE_AFTER = 2 * HOUR
/** Matching notifications a developer receives in a day, at most */
export const DAILY_MATCHES = 10
/** Below this many confirmed helps, a profile may take the newcomer seat */
export const NEWCOMER_BELOW = 3
/** The score a developer asks for when they did not choose one */
export const DEFAULT_MIN_SCORE = 50

// What a request may hold (§7.1)
export const TITLE_MAX = 140
export const DESCRIPTION_MAX = 8000
export const SKILLS_MAX = 8
export const VIDEO_URL_MAX = 500
/** A message of the thread of a request */
export const MESSAGE_MAX = 4000
