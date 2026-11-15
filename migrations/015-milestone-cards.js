// The roadmap reads its progress from the board (§6.7, PAM-405): the cards a
// seed already wrote join the milestone in progress of their project. Until
// now no route created a milestone, so only the seeded projects have one,
// and a card already attached is left as it is.
export const run = (sql) => {
  const has = sql`SELECT name FROM pragma_table_info('task')`.all()
  if (!has.some((row) => row.name === 'milestoneId')) return
  sql`
    UPDATE task SET milestoneId = (
      SELECT milestoneId FROM milestone
      WHERE milestone.projectId = task.projectId AND milestone.status = 'active'
      ORDER BY milestone.position LIMIT 1
    )
    WHERE milestoneId IS NULL
  `.run()
}
