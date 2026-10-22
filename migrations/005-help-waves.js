// The matching of a request (§7.3): when its last wave went out, so the next
// one leaves 2 h later without an acceptance
export const run = (sql) => {
  sql`ALTER TABLE helpRequest ADD COLUMN lastWaveAt REAL`.run()
}
