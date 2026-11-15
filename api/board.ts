import { db, sql } from '@01edu/db'
import { now } from '@01edu/time'
import { respond } from '@01edu/api/response'
import { Task } from '/api/schema.ts'
import { Entry, maybe } from '/api/entries.ts'
import { getRole } from '/api/channels.ts'
import { rankBetween } from '/api/lib/rank.ts'

// The Kanban board of a project (§6.7): five columns, cards ordered by a
// fractional rank so two people move cards at the same time without loss. A
// card is internal, or linked to an issue or a PR of the project's repo
// (read only on GitHub): a PR opened gets its card in Review, and a merged
// PR moves its card to Done. Every change is a TASK_UPDATED entry, so the
// other boards redraw in real time (§13.3).

export const BOARD_COLUMNS = [
  'backlog',
  'ready',
  'in_progress',
  'review',
  'done',
]

const badRequest = (m: string) => new respond.BadRequestError({ message: m })
const forbidden = (m: string) => new respond.ForbiddenError({ message: m })
// A link taken by another card: the page says which, not a general refusal
const conflict = (m: string) =>
  new respond.ConflictError({ message: m, reason: 'linked' })

// A public project, or a private one the developer is a member of
export const getProjectId = sql<
  { projectId: number },
  { slug: string; me: number }
>`
  SELECT projectId FROM project
  WHERE slug = :slug AND (visibility = 'public' OR EXISTS (
    SELECT 1 FROM projectMember
    WHERE projectMember.projectId = project.projectId
      AND projectMember.userId = :me))
`.get

export const isMember = (projectId: number, userId: number) =>
  !!getRole({ projectId, userId })

type TaskRow = {
  taskId: number
  boardColumn: string
  title: string
  rank: string
  milestoneId: number | null
  issue: number | null
  pullRequest: number | null
}
const listTasks = sql<TaskRow, number>`
  SELECT task.taskId, task.boardColumn, task.title, task.rank,
    task.milestoneId, issue.number AS issue, pullRequest.number AS pullRequest
  FROM task
  LEFT JOIN issue ON issue.issueId = task.issueId
  LEFT JOIN pullRequest ON pullRequest.pullRequestId = task.pullRequestId
  WHERE task.projectId = ? ORDER BY task.boardColumn, task.rank
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

const taskOfIssue = sql<{ taskId: number }, number>`
  SELECT taskId FROM task WHERE issueId = ?
`.get

const setColumn = sql<
  undefined,
  { taskId: number; column: string; rank: string; at: number }
>`
  UPDATE task SET boardColumn = :column, rank = :rank, updatedAt = :at
  WHERE taskId = :taskId
`.run

const setLinks = sql<
  undefined,
  {
    taskId: number
    issueId: number | null
    pullRequestId: number | null
    at: number
  }
>`
  UPDATE task SET issueId = :issueId, pullRequestId = :pullRequestId,
    updatedAt = :at
  WHERE taskId = :taskId
`.run

// The issue or the PR of a number, in the repo of the project
const issueOf = sql<
  { issueId: number; title: string },
  { projectId: number; number: number }
>`
  SELECT issue.issueId, issue.title FROM issue
  JOIN repository ON repository.repositoryId = issue.repositoryId
  WHERE repository.projectId = :projectId AND issue.number = :number
`.get

const pullOf = sql<
  { pullRequestId: number; title: string; state: string },
  { projectId: number; number: number }
>`
  SELECT pullRequest.pullRequestId, pullRequest.title, pullRequest.state
  FROM pullRequest
  JOIN repository ON repository.repositoryId = pullRequest.repositoryId
  WHERE repository.projectId = :projectId AND pullRequest.number = :number
`.get

// A rank after the last card of a column, so a move appends to it
const appendRank = (projectId: number, column: string) =>
  rankBetween(lastRank({ projectId, column })?.rank ?? '', '')

const card = (t: TaskRow) => ({
  id: t.taskId,
  column: t.boardColumn,
  title: t.title,
  rank: t.rank,
  milestone: t.milestoneId ?? 0,
  issue: t.issue ?? 0,
  pullRequest: t.pullRequest ?? 0,
})

/** The cards of a project's board, by column and rank (§6.7) */
export const listBoard = (me: number, slug: string) => {
  const project = getProjectId({ slug, me })
  if (!project) throw badRequest('Unknown project')
  return listTasks(project.projectId).map(card)
}

/** What a card points at on GitHub: an issue, a PR, or nothing */
export type CardLink = { issue?: number; pullRequest?: number }

// The ids of a link, checked: of the project, one card each
const linkOf = (projectId: number, link: CardLink, taskId = 0) => {
  if (link.issue && link.pullRequest) {
    throw badRequest('An issue or a PR, not both')
  }
  if (link.issue) {
    const issue = issueOf({ projectId, number: link.issue })
    if (!issue) throw badRequest('Unknown issue')
    const other = taskOfIssue(issue.issueId)
    if (other && other.taskId !== taskId) {
      throw conflict('This issue already has its card')
    }
    return {
      issueId: issue.issueId,
      pullRequestId: null,
      title: issue.title,
      merged: false,
    }
  }
  if (link.pullRequest) {
    const pull = pullOf({ projectId, number: link.pullRequest })
    if (!pull) throw badRequest('Unknown PR')
    const other = taskOfPull(pull.pullRequestId)
    if (other && other.taskId !== taskId) {
      throw conflict('This PR already has its card')
    }
    return {
      issueId: null,
      pullRequestId: pull.pullRequestId,
      title: pull.title,
      merged: pull.state === 'merged',
    }
  }
  return { issueId: null, pullRequestId: null, title: '', merged: false }
}

const insertCard = (
  projectId: number,
  userId: number | null,
  fields: {
    title: string
    column: string
    issueId: number | null
    pullRequestId: number | null
  },
) => {
  const at = now()
  const rank = appendRank(projectId, fields.column)
  const id = Task.insert({
    projectId,
    boardColumn: fields.column,
    title: fields.title,
    issueId: fields.issueId,
    pullRequestId: fields.pullRequestId,
    rank,
    createdAt: at,
    updatedAt: at,
  })
  Entry.insert.TASK_UPDATED({
    userId: maybe(userId),
    projectId,
    taskId: id,
    source: 'platform',
  })
  return { id, rank }
}

/**
 * Add a card; only a member may (§6.7). Internal, it goes to the Backlog;
 * from an issue too, titled after it unless named; from a PR, to Review, or
 * to Done once merged
 */
export const createTask = (
  me: number,
  slug: string,
  title: string,
  link: CardLink = {},
) => {
  const project = getProjectId({ slug, me })
  if (!project) throw badRequest('Unknown project')
  if (!isMember(project.projectId, me)) {
    throw forbidden('Only members add cards')
  }
  const name = title.trim()
  const column = link.pullRequest ? 'review' : 'backlog'
  const { id, rank, card } = db.transaction(() => {
    const linked = linkOf(project.projectId, link)
    const card = {
      title: name || linked.title,
      column: linked.merged ? 'done' : column,
      issueId: linked.issueId,
      pullRequestId: linked.pullRequestId,
    }
    if (!card.title) throw badRequest('A card needs a title')
    return { ...insertCard(project.projectId, me, card), card }
  })()
  return {
    id,
    column: card.column,
    title: card.title,
    rank,
    issue: link.issue ?? 0,
    pullRequest: link.pullRequest ?? 0,
  }
}

/**
 * Links a card to an issue or a PR of its project, or unlinks it (both 0);
 * only a member may. A PR already merged moves the card to Done
 */
export const linkTask = (me: number, taskId: number, link: CardLink) => {
  const task = getTask(taskId)
  if (!task) throw badRequest('Unknown card')
  if (!isMember(task.projectId, me)) throw forbidden('Only members link cards')
  const at = now()
  let column = task.boardColumn
  db.transaction(() => {
    const linked = linkOf(task.projectId, link, taskId)
    setLinks({
      taskId,
      issueId: linked.issueId,
      pullRequestId: linked.pullRequestId,
      at,
    })
    if (linked.merged && column !== 'done') {
      column = 'done'
      setColumn({
        taskId,
        column,
        rank: appendRank(task.projectId, column),
        at,
      })
    }
    Entry.insert.TASK_UPDATED({
      userId: me,
      projectId: task.projectId,
      taskId,
      source: 'platform',
    })
  })()
  return {
    id: taskId,
    column,
    issue: link.issue ?? 0,
    pullRequest: link.pullRequest ?? 0,
  }
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

const getPull = sql<
  { projectId: number; title: string; state: string },
  number
>`
  SELECT repository.projectId, pullRequest.title, pullRequest.state
  FROM pullRequest
  JOIN repository ON repository.repositoryId = pullRequest.repositoryId
  WHERE pullRequest.pullRequestId = ?
`.get

/**
 * A PR opened on GitHub gets its card in Review, unless one points at it
 * already (§6.7); called by the webhook worker
 */
export const cardForPullRequest = (
  pullRequestId: number,
  userId: number | null,
) => {
  if (taskOfPull(pullRequestId)) return
  const pull = getPull(pullRequestId)
  if (!pull || pull.state !== 'open') return
  insertCard(pull.projectId, userId, {
    title: pull.title,
    column: 'review',
    issueId: null,
    pullRequestId,
  })
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

const pullOfNumber = sql<
  { pullRequestId: number; state: string },
  { repositoryId: number; number: number }
>`
  SELECT pullRequestId, state FROM pullRequest
  WHERE repositoryId = :repositoryId AND number = :number
`.get

/** The state of a PR as last stored, before a refresh writes it again */
export const storedPullState = (repositoryId: number, number: number) =>
  pullOfNumber({ repositoryId, number })?.state

/**
 * A PR the refresh found merged, that was not before, moves its card to
 * Done: a project without webhooks, or a delivery lost (§5.2, §6.7). Once
 * merged, a member may move the card elsewhere: it stays there
 */
export const markMergedPullDone = (repositoryId: number, number: number) => {
  const pull = pullOfNumber({ repositoryId, number })
  pull && markPullRequestDone(pull.pullRequestId, null)
}
