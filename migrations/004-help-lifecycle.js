// The lifecycle of a help request (§7.2): when each reminder went out, so
// that it goes out once
export const run = (sql) => {
  sql`ALTER TABLE helpRequest ADD COLUMN helperRemindedAt REAL`.run()
  sql`ALTER TABLE helpRequest ADD COLUMN confirmRemindedAt REAL`.run()
}
