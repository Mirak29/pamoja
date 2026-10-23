// The login on GitHub, apart from the login of Pamoja (the address
// /@login): a demo account a real one logs into keeps its demo login (§14).
// A login names one account only, whatever its case (QA-26): the later
// accounts that share one get `login~githubId`, until their next login.
export const run = (sql) => {
  sql`ALTER TABLE user ADD COLUMN githubLogin TEXT`.run()
  sql`UPDATE user SET githubUsername = githubUsername || '~' || abs(githubId)
    WHERE userId NOT IN (
      SELECT min(userId) FROM user GROUP BY lower(githubUsername)
    )`.run()
}
