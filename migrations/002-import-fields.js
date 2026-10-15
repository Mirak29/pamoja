// What the GitHub import keeps (§5.4): the README and figures of a repo, the
// stack of a project, the author login, branch and comment count of issues
// and PRs, whose authors are often not on Pamoja
export const run = (sql) => {
  sql`ALTER TABLE repository ADD COLUMN readme TEXT`.run()
  sql`ALTER TABLE repository ADD COLUMN stats JSON`.run()
  sql`ALTER TABLE project ADD COLUMN skills JSON`.run()
  sql`ALTER TABLE pullRequest ADD COLUMN authorLogin TEXT`.run()
  sql`ALTER TABLE pullRequest ADD COLUMN branch TEXT`.run()
  sql`ALTER TABLE issue ADD COLUMN authorLogin TEXT`.run()
  sql`ALTER TABLE issue ADD COLUMN comments INTEGER`.run()
}
