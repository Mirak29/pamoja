// The initial schema is api/schema.ts: on a fresh database runMigrations
// runs nothing and records this version. Each later file migrates an
// existing database, inside a transaction (§12.5).
export const run = (sql) => {
  sql`SELECT 1`.get()
}
