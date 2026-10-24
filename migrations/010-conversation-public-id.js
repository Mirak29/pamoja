// The public id of a conversation (PAM-125): its address is
// /messages/<publicId>, random so it reveals nothing and cannot be guessed.
// Filled for the conversations that exist; a database that never had the
// table gets it whole from createTable. Only letters and digits go into the
// query text.
const alphabet =
  '0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz'
const randomId = () =>
  Array.from(
    crypto.getRandomValues(new Uint8Array(12)),
    (byte) => alphabet[byte % alphabet.length],
  ).join('')

export const run = (sql) => {
  const has = sql`SELECT name FROM pragma_table_info('conversation')`.all()
  if (!has.length || has.some((row) => row.name === 'publicId')) return
  sql`ALTER TABLE conversation ADD COLUMN publicId TEXT`.run()
  const rows = sql`SELECT conversationId FROM conversation`.all()
  for (const { conversationId } of rows) {
    sql`UPDATE conversation SET publicId = '${randomId()}'
      WHERE conversationId = ${Number(conversationId)}`.run()
  }
}
