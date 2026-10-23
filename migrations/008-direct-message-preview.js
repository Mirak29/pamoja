// The preview of the first link of a direct message (§10.6), read by the
// server. Added only where the table already exists without it: a database
// that never had the table gets it whole from createTable.
export const run = (sql) => {
  const has = sql`SELECT name FROM pragma_table_info('directMessage')`.all()
  if (!has.length || has.some((row) => row.name === 'linkPreview')) return
  sql`ALTER TABLE directMessage ADD COLUMN linkPreview JSON`.run()
}
