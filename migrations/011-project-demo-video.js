// The demo video of a project (§6.3, §17.3), embedded by its link. Added only
// where the table already exists without it: a database that never had the
// table gets it whole from createTable.
export const run = (sql) => {
  const has = sql`SELECT name FROM pragma_table_info('project')`.all()
  if (!has.length || has.some((row) => row.name === 'demoVideoUrl')) return
  sql`ALTER TABLE project ADD COLUMN demoVideoUrl TEXT`.run()
}
