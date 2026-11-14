import { db, sql } from '@01edu/db'
import { now } from '@01edu/time'
import { respond } from '@01edu/api/response'
import { Task } from '/api/schema.ts'
import { Entry, maybe } from '/api/entries.ts'
import { getRole } from '/api/channels.ts'
import { rankBetween } from '/api/lib/rank.ts'

// The Kanban board of a project (§6.7): five columns, cards ordered by a
// fractional rank so two people move cards at the same time without loss. A
// merged pull request moves its card to Done. Every change is a TASK_UPDATED
// entry, so the other boards redraw in real time (§13.3).

export const BOARD_COLUMNS = [
  'backlog',
  'ready',
  'in_progress',
  'review',
  'done',
]

const badRequest = (m: string) => new respond.BadRequestError({ message: m })
const forbidden = (m: string) => new respond.ForbiddenError({ message: m })

// A public project, or a private one the developer is a member of
const getProjectId = sql<{ projectId: number }, { slug: string; me: number }>`
  SELECT projectId FROM project
  WHERE slug = :slug AND (visibility = 'public' OR EXISTS (
    SELECT 1 FROM projectMember
    WHERE projectMember.projectId = project.projectId
      AND projectMember.userId = :me))
`.get

const isMember = (projectId: number, userId: number) =>
  !!getRole({ projectId, userId })

type TaskRow = {
  taskId: number
  boardColumn: string
  title: string
  rank: string
}
const listTasks = sql<TaskRow, number>`
  SELECT taskId, boardColumn, title, rank FROM task
  WHERE projectId = ? ORDER BY boardColumn, rank
`.all

const lastRank = sql<
  { rank: string | null },
  { projectId: number; column: string }
>`
  SELECT max(rank) AS rank FROM task
  WHERE projectId = :projectId AND boardColumn = :column
`.get

const getTask = sql<
  { taskId: number; projectId: number; boardColumn: string },
  number
>`
  SELECT taskId, projectId, boardColumn FROM task WHERE taskId = ?
`.get

const taskOfPull = sql<
  { taskId: number; projectId: number; boardColumn: string },
  number
>`
  SELECT taskId, projectId, boardColumn FROM task WHERE pullRequestId = ?
`.get

const setColumn = sql<
  undefined,
  { taskId: number; column: string; rank: string; at: number }
>`
  UPDATE task SET boardColumn = :column, rank = :rank, updatedAt = :at
  WHERE taskId = :taskId
`.run

// A rank after the last card of a column, so a move appends to it
const appendRank = (projectId: number, column: string) =>
  rankBetween(lastRank({ projectId, column })?.rank ?? '', '')

const card = (t: TaskRow) => ({
  id: t.taskId,
  column: t.boardColumn,
  title: t.title,
  rank: t.rank,
})

/** The cards of a project's board, by column and rank (§6.7) */
export const listBoard = (me: number, slug: string) => {
  const project = getProjectId({ slug, me })
  if (!project) throw badRequest('Unknown project')
  return listTasks(project.projectId).map(card)
}

/** Add an internal card to the Backlog; only a member may (§6.7) */
export const createTask = (me: number, slug: string, title: string) => {
  const project = getProjectId({ slug, me })
  if (!project) throw badRequest('Unknown project')
  if (!isMember(project.projectId, me)) {
    throw forbidden('Only members add cards')
  }
  if (!title.trim()) throw badRequest('A card needs a title')
  const at = now()
  const rank = appendRank(project.projectId, 'backlog')
  const taskId = db.transaction(() => {
    const id = Task.insert({
      projectId: project.projectId,
      boardColumn: 'backlog',
      title: title.trim(),
      rank,
      createdAt: at,
      updatedAt: at,
    })
    Entry.insert.TASK_UPDATED({
      userId: me,
      projectId: project.projectId,
      taskId: id,
      source: 'platform',
    })
    return id
  })()
  return { id: taskId, column: 'backlog', title: title.trim(), rank }
}

/** Move a card to a column; only a member may (§6.7) */
export const moveTask = (me: number, taskId: number, column: string) => {
  if (!BOARD_COLUMNS.includes(column)) throw badRequest('Unknown column')
  const task = getTask(taskId)
  if (!task) throw badRequest('Unknown card')
  if (!isMember(task.projectId, me)) throw forbidden('Only members move cards')
  const at = now()
  const rank = appendRank(task.projectId, column)
  db.transaction(() => {
    setColumn({ taskId, column, rank, at })
    Entry.insert.TASK_UPDATED({
      userId: me,
      projectId: task.projectId,
      taskId,
      source: 'platform',
    })
  })()
  return { id: taskId, column, rank }
}

/**
 * A merged pull request moves its card to Done (§6.7); called by the webhook
 * worker. `userId` is the author on Pamoja, if known.
 */
export const markPullRequestDone = (
  pullRequestId: number,
  userId: number | null,
) => {
  const task = taskOfPull(pullRequestId)
  if (!task || task.boardColumn === 'done') return
  const at = now()
  setColumn({
    taskId: task.taskId,
    column: 'done',
    rank: appendRank(task.projectId, 'done'),
    at,
  })
  Entry.insert.TASK_UPDATED({
    userId: maybe(userId),
    projectId: task.projectId,
    taskId: task.taskId,
    source: 'platform',
  })
}
