// A repost taken back by its author had hiddenAt, the column of moderation:
// re-reposting cleared it, even on a repost a moderator had hidden. It now
// has its own column; the reposts withdrawn so far move to it (§10.1, §10.5).
export const run = (sql) => {
  const has = sql`SELECT name FROM pragma_table_info('post')`.all()
  if (!has.length || has.some((row) => row.name === 'withdrawnAt')) return
  sql`ALTER TABLE post ADD COLUMN withdrawnAt REAL`.run()
  sql`
    UPDATE post SET withdrawnAt = hiddenAt, hiddenAt = NULL
    WHERE repostOfId IS NOT NULL AND hiddenAt IS NOT NULL
  `.run()
}
