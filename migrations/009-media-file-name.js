// The name of a file sent in a direct message (§10.6, §17.3), given back on
// download. Added only where the table already exists without it: a database
// that never had the table gets it whole from createTable.
export const run = (sql) => {
  const has = sql`SELECT name FROM pragma_table_info('media')`.all()
  if (!has.length || has.some((row) => row.name === 'fileName')) return
  sql`ALTER TABLE media ADD COLUMN fileName TEXT`.run()
}
