export const run = (sql) => {
  const columns = sql`SELECT name FROM pragma_table_info('post')`.all()
  if (!columns.length || columns.some((row) => row.name === 'deletedAt')) return
  sql`ALTER TABLE post ADD COLUMN deletedAt REAL`.run()
}
