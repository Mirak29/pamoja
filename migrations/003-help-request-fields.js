// What a help request needs (§7.1): the video link of the request, and the
// skills of a PR read from its changed files, with the head commit they were
// read at, so a new push reads them again
export const run = (sql) => {
  sql`ALTER TABLE helpRequest ADD COLUMN videoUrl TEXT`.run()
  sql`ALTER TABLE pullRequest ADD COLUMN headSha TEXT`.run()
  sql`ALTER TABLE pullRequest ADD COLUMN skills JSON`.run()
  sql`ALTER TABLE pullRequest ADD COLUMN skillsSha TEXT`.run()
}
