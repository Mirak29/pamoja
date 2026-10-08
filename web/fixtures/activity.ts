import { signal } from '@preact/signals'
import type { Project, ProjectSlug } from '/web/fixtures/projects.ts'

// Project journal: what the API will read from the activity entries (§13).
// Session entries come from actions taken here, until the routes exist.

export type ActivityEntry = {
  text: string
  at: number
  /** Logged during this session rather than seeded */
  session?: boolean
}

const sessionLog: (ActivityEntry & { project: ProjectSlug })[] = []

export const activityChanged = signal(0)

export const logActivity = (project: ProjectSlug, text: string) => {
  sessionLog.unshift({ project, text, at: Date.now(), session: true })
  activityChanged.value++
}

/** Session entries, latest events and older journal, newest first */
export const activityOf = (project: Project): ActivityEntry[] =>
  [
    ...sessionLog.filter((entry) => entry.project === project.slug),
    ...project.events,
    ...(project.journal ?? []),
  ].sort((a, b) => b.at - a.at)

export type ActivityKind = 'github' | 'team' | 'help'

/** GitHub event, team change or help request, read from the text */
export const activityKind = (text: string): ActivityKind =>
  /^(Aide|Demande|Nouvelle demande)|[Dd]emande d’aide|aide/.test(text)
    ? 'help'
    : /PR|CI|[Rr]elease|[Rr]eview|Issue|[Ss]ynchro|GitHub|merg/.test(text)
    ? 'github'
    : 'team'
