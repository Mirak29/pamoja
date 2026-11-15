import { signal } from '@preact/signals'
import { api } from '/web/lib/api.ts'
import { notifyFailure } from '/web/lib/failure.ts'
import { boardChanged, boards, type Card } from '/web/fixtures/board.ts'
import type { Milestone, Project, ProjectSlug } from '/web/fixtures/projects.ts'

// The roadmap read from the server (PAM-405, §6.7): its milestones take the
// place of the page's, with their progress counted on the board. Owners and
// maintainers plan it; a member attaches a card to a milestone.

type Roadmap = { canManage: boolean; milestones: Milestone[] }

/** The roadmaps read, by project */
export const roadmaps = signal<Partial<Record<string, Roadmap>>>({})

/** The milestones of a project: the server's once read, else the page's */
export const milestonesOf = (project: Project) =>
  roadmaps.value[project.slug]?.milestones ?? project.milestones

/** Whether the developer plans this roadmap: an owner or a maintainer */
export const canPlan = (project: Project) =>
  !!roadmaps.value[project.slug]?.canManage

/** Reads the roadmap of a project */
export const loadRoadmap = (slug: string) =>
  api['GET/api/project/roadmap'].fetch({ slug }).then((roadmap) => {
    roadmaps.value = {
      ...roadmaps.peek(),
      [slug]: {
        canManage: roadmap.canManage,
        milestones: roadmap.milestones.map((m) => ({
          id: m.id,
          title: m.title,
          description: m.description,
          state: m.status as Milestone['state'],
          done: m.done,
          total: m.total,
          date: '',
        })),
      },
    }
  }, () => {})

export type MilestoneDraft = {
  title: string
  description: string
  state: Milestone['state']
}

/** Adds a milestone at the end of the roadmap; true once saved */
export const addMilestone = (slug: string, draft: MilestoneDraft) =>
  api['POST/api/milestone/create'].fetch({
    slug,
    title: draft.title,
    description: draft.description,
    status: draft.state,
  }).then(
    () => (loadRoadmap(slug), true),
    (error) => (notifyFailure('Milestone non créée', error), false),
  )

/** Changes a milestone; true once saved */
export const saveMilestone = (
  slug: string,
  milestoneId: number,
  draft: MilestoneDraft,
) =>
  api['POST/api/milestone/update'].fetch({
    milestoneId,
    title: draft.title,
    description: draft.description,
    status: draft.state,
  }).then(
    () => (loadRoadmap(slug), true),
    (error) => (notifyFailure('Milestone non enregistrée', error), false),
  )

/**
 * Attaches a card of the board to a milestone, or detaches it (0): shown at
 * once, then saved; a failure puts it back
 */
export const attachCard = (slug: string, card: Card, milestoneId: number) => {
  const before = card.milestone
  const taskId = Number(card.id)
  if (!Number.isInteger(taskId) || taskId <= 0) return
  card.milestone = milestoneId || undefined
  boardChanged.value++
  api['POST/api/task/update'].fetch({ taskId, milestoneId }).then(
    () => loadRoadmap(slug),
    (error) => {
      card.milestone = before
      boardChanged.value++
      notifyFailure('Tâche non rattachée', error)
    },
  )
}

/** The cards of the board a milestone counts */
export const cardsOf = (slug: string, milestoneId: number) =>
  (boards[slug as ProjectSlug] ?? []).filter((c) => c.milestone === milestoneId)

/** Reads the roadmaps open on the page again */
export const reloadOpenedRoadmaps = () => {
  for (const slug of Object.keys(roadmaps.peek())) loadRoadmap(slug)
}
