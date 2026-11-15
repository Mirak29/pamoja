// The daily digest is hidden until it exists (PAM-509): a developer who
// chose it received nothing at all. They are told at once again.
export const run = (sql) => {
  const has = sql`SELECT name FROM pragma_table_info('profile')`.all()
  if (!has.some((row) => row.name === 'matchingMode')) return
  sql`UPDATE profile SET matchingMode = 'instant' WHERE matchingMode = 'digest'`
    .run()
}
