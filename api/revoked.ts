// A proof withdrawn by a moderator for proven fraud (§10.5): its entry stays
// as it was frozen (§8.3), a moderation action says it no longer counts.
// Every query that counts proofs adds this condition.

/** SQL: the entry of `column` was not withdrawn */
export const notRevoked = (column = 'entry.id') =>
  `NOT EXISTS (SELECT 1 FROM moderationAction
    WHERE moderationAction.targetType = 'proof'
      AND moderationAction.targetId = ${column}
      AND moderationAction.action = 'revoke_evidence')`

/**
 * SQL: the account of `table` is not suspended now (§10.5). Suspended, it
 * leaves Explore, the search, the previews and the sitemap
 */
export const notSuspended = (table = 'user') =>
  `(${table}.suspendedUntil IS NULL OR ${table}.suspendedUntil < unixepoch())`
