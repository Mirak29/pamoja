// The video of a post (§10.1, §17.3), embedded by its link. Added only where
// the table already exists without it: a database that never had the table
// gets it whole from createTable.
export const run = (sql) => {
  const has = sql`SELECT name FROM pragma_table_info('post')`.all()
  if (!has.length || has.some((row) => row.name === 'videoUrl')) return
  sql`ALTER TABLE post ADD COLUMN videoUrl TEXT`.run()
}
