import { sql } from '@01edu/db'
// The entry tables exist before the query below is prepared
import '/api/entries.ts'
import { entries } from '/api/entry-types.ts'

// Version of the reputation rules a proof is decided with, frozen in its
// fields (§8.3). Applying new rules to the past is an explicit, versioned
// migration: raise this number with the rules.
export const RULES_VERSION = 1

// Anti-abuse (§8.4): at most 2 confirmations counted per requester / helper
// pair over 30 rolling days
export const PAIR_LIMIT = 2
export const PAIR_WINDOW = 30 * 24 * 3600

const countPair = sql<
  { n: number },
  { helperId: number; requesterId: number; since: number }
>`
  SELECT count(*) AS n FROM entry
  JOIN entryRequesterId AS requester ON requester.entryId = entry.id
  JOIN entryEligible AS eligible ON eligible.entryId = entry.id
  WHERE entry.type IN (${entries.REVIEW_HELP_CONFIRMED}, ${entries.HELP_CONFIRMED})
    AND entry.userId = :helperId AND requester.requesterId = :requesterId
    AND eligible.eligible = 1 AND entry.createdAt >= :since
`.get

/**
 * Whether a confirmed help counts in the reputation of the helper, decided
 * once at the confirmation and frozen (§8.3). An excluded one stays in the
 * activity, without counting.
 */
export const eligibilityOf = (
  helperId: number,
  requesterId: number,
  at: number,
) => {
  const counted = countPair({ helperId, requesterId, since: at - PAIR_WINDOW })
    ?.n ?? 0
  return counted >= PAIR_LIMIT
    ? { eligible: 0, exclusionReason: 'pair_limit' }
    : { eligible: 1, exclusionReason: '' }
}
