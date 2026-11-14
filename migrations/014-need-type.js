// Needs saved from the settings were typed 'skill' (PAM-402); every other
// need is a 'contribution', the type the pages and the Assistant read
export const run = (sql) => {
  sql`UPDATE projectNeed SET type = 'contribution' WHERE type = 'skill'`.run()
}
