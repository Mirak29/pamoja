// Direct messages, the rest of §10.6: edited and deleted messages, a reply
// to a message, a muted or archived conversation. The tables came with
// PAM-522; a database that never had them gets them whole from createTable,
// so a column is added only where its table already exists without it.
const columns = [
  ['directMessage', 'editedAt', 'REAL'],
  ['directMessage', 'deletedAt', 'REAL'],
  ['directMessage', 'replyToId', 'INTEGER'],
  ['conversationMember', 'mutedAt', 'REAL'],
  ['conversationMember', 'archivedAt', 'REAL'],
]

export const run = (sql) => {
  for (const [table, column, type] of columns) {
    const has = sql`SELECT name FROM pragma_table_info('${table}')`.all()
    if (!has.length || has.some((row) => row.name === column)) continue
    sql`ALTER TABLE ${table} ADD COLUMN ${column} ${type}`.run()
  }
}
