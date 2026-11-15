import { db, sql } from '@01edu/db'
import { now } from '@01edu/time'
import { respond } from '@01edu/api/response'
import { Milestone } from '/api/schema.ts'
import { Entry } from '/api/entries.ts'
import { leads } from '/api/channels.ts'
import { getProjectId, isMember } from '/api/board.ts'
import { LIMITS } from '/api/limits.ts'
import { memoryLimit } from '/api/lib/rate.ts'

// The roadmap of a project (§6.7): milestones with a title, a description
// and a status, to which board cards are attached. Its progress is the done
// cards over the cards of the milestone. Owners and maintainers manage it;
// a change is a MILESTONE_UPDATED entry, so the open roadmaps read it again.

export const MILESTONE_STATES = ['planned', 'active', 'done']

// Generous: a maintainer plans a whole roadmap in one sitting (§16)
export const MILESTONE_RATE = { count: 120, per: 3600 }
const edited = memoryLimit(MILESTONE_RATE, 'Too many roadmap changes')

const badRequest = (m: string) => new respond.BadRequestError({ message: m })
const forbidden = (m: string) => new respond.ForbiddenError({ message: m })

type MilestoneRow = {
  milestoneId: number
  title: string
  description: string | null
  status: string
  done: number
  total: number
}

const listMilestones = sql<MilestoneRow, number>`
  SELECT milestone.milestoneId, milestone.title, milestone.description,
    milestone.status,
    count(task.taskId) AS total,
    coalesce(sum(task.boardColumn = 'done'), 0) AS done
  FROM milestone
  LEFT JOIN task ON task.milestoneId = milestone.milestoneId
  WHERE milestone.projectId = ?
  GROUP BY milestone.milestoneId
  ORDER BY milestone.position, milestone.milestoneId
`.all

const nextPosition = sql<{ position: number }, number>`
  SELECT coalesce(max(position) + 1, 0) AS position FROM milestone
  WHERE projectId = ?
`.get

const getMilestone = sql<{ projectId: number }, number>`
  SELECT projectId FROM milestone WHERE milestoneId = ?
`.get

const setMilestone = sql<
  undefined,
  {
    milestoneId: number
    title: string
    description: string | null
    status: string
  }
>`
  UPDATE milestone
  SET title = :title, description = :description, status = :status
  WHERE milestoneId = :milestoneId
`.run

const getTask = sql<{ projectId: number }, number>`
  SELECT projectId FROM task WHERE taskId = ?
`.get

const setTaskMilestone = sql<
  undefined,
  { taskId: number; milestoneId: number | null; at: number }
>`
  UPDATE task SET milestoneId = :milestoneId, updatedAt = :at
  WHERE taskId = :taskId
`.run

const visible = (me: number, slug: string) => {
  const project = getProjectId({ slug, me })
  if (!project) throw badRequest('Unknown project')
  return project.projectId
}

type MilestoneInput = { title: string; description: string; status: string }

// A title, a short description, a known status
const checked = (input: MilestoneInput) => {
  const title = input.title.trim()
  const description = input.description.trim()
  if (!title) throw badRequest('A milestone needs a title')
  if (title.length > LIMITS.milestoneTitle) throw badRequest('Title too long')
  if (description.length > LIMITS.milestoneDescription) {
    throw badRequest('Description too long')
  }
  if (!MILESTONE_STATES.includes(input.status)) {
    throw badRequest('Unknown status')
  }
  return { title, description: description || null, status: input.status }
}

const changed = (me: number, projectId: number) =>
  Entry.insert.MILESTONE_UPDATED({ userId: me, projectId, source: 'platform' })

/** The milestones of a project, in order, with their progress (§6.7) */
export const listRoadmap = (me: number, slug: string) => {
  const projectId = visible(me, slug)
  return {
    canManage: leads(projectId, me),
    milestones: listMilestones(projectId).map((m) => ({
      id: m.milestoneId,
      title: m.title,
      description: m.description ?? '',
      status: m.status,
      done: m.done,
      total: m.total,
    })),
  }
}

/** Adds a milestone at the end of the roadmap: owners and maintainers */
export const createMilestone = (
  me: number,
  slug: string,
  input: MilestoneInput,
) => {
  const projectId = visible(me, slug)
  if (!leads(projectId, me)) throw forbidden('Only maintainers plan')
  const fields = checked(input)
  edited(me)
  const milestoneId = db.transaction(() => {
    const id = Milestone.insert({
      projectId,
      ...fields,
      position: nextPosition(projectId)!.position,
      createdAt: now(),
    })
    changed(me, projectId)
    return id
  })()
  return { id: milestoneId }
}

/** Changes the title, the description or the status of a milestone */
export const updateMilestone = (
  me: number,
  milestoneId: number,
  input: MilestoneInput,
) => {
  const milestone = getMilestone(milestoneId)
  if (!milestone) throw badRequest('Unknown milestone')
  if (!leads(milestone.projectId, me)) throw forbidden('Only maintainers plan')
  const fields = checked(input)
  edited(me)
  db.transaction(() => {
    setMilestone({ milestoneId, ...fields })
    changed(me, milestone.projectId)
  })()
  return { id: milestoneId }
}

/**
 * Attaches a card of the board to a milestone of the same project, or
 * detaches it (0): a member of the project may, as they move cards
 */
export const attachTask = (me: number, taskId: number, milestoneId: number) => {
  const task = getTask(taskId)
  if (!task) throw badRequest('Unknown card')
  if (!isMember(task.projectId, me)) throw forbidden('Only members plan')
  if (milestoneId && getMilestone(milestoneId)?.projectId !== task.projectId) {
    throw badRequest('Unknown milestone')
  }
  edited(me)
  db.transaction(() => {
    setTaskMilestone({ taskId, milestoneId: milestoneId || null, at: now() })
    changed(me, task.projectId)
    Entry.insert.TASK_UPDATED({
      userId: me,
      projectId: task.projectId,
      taskId,
      source: 'platform',
    })
  })()
  return { id: taskId, milestone: milestoneId }
}
