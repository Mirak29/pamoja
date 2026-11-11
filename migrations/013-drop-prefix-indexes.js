// Two indexes that a longer one now begins with (§12.7): `authorId` is the
// start of help_request_by_author, `userId, status` of help_match_for_me.
// The longer ones serve the same reads; the short ones only cost a write on
// every change of a request or a match.
export const run = (sql) => {
  sql`DROP INDEX IF EXISTS help_request_author`.run()
  sql`DROP INDEX IF EXISTS help_match_user`.run()
}
