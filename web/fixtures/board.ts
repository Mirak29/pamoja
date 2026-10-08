import { signal } from '@preact/signals'
import { logActivity } from '/web/fixtures/activity.ts'
import type { ProjectSlug } from '/web/fixtures/projects.ts'

/** Columns of the Kanban board (cahier des charges §6.7) */
export const boardColumns = [
  ['backlog', 'Backlog'],
  ['ready', 'Prêt'],
  ['in_progress', 'En cours'],
  ['review', 'Review'],
  ['done', 'Terminé'],
] as const

export type BoardColumn = typeof boardColumns[number][0]

export type Card = {
  id: string
  title: string
  column: BoardColumn
  issue?: number
  pullRequest?: number
}

export const boards: Partial<Record<ProjectSlug, Card[]>> = {
  'openpay-africa': [
    {
      id: 'c1',
      title: 'Docs : setup deno task dev',
      column: 'review',
      pullRequest: 78,
    },
    {
      id: 'c2',
      title: 'Ledger reconciliation job',
      column: 'review',
      pullRequest: 84,
    },
    {
      id: 'c3',
      title: 'Lever le verrou SQLite',
      column: 'in_progress',
      issue: 44,
    },
    { id: 'c4', title: 'Tests de charge des callbacks', column: 'backlog' },
    {
      id: 'c5',
      title: 'Support de MTN MoMo Cameroun',
      column: 'ready',
      issue: 49,
    },
    {
      id: 'c6',
      title: 'Documenter les codes d’erreur Orange Money',
      column: 'backlog',
      issue: 46,
    },
    {
      id: 'c7',
      title: 'Gestion des devises XOF et XAF',
      column: 'done',
      pullRequest: 77,
    },
    { id: 'c8', title: 'Signature des webhooks Wave', column: 'ready' },
    {
      id: 'c9',
      title: 'Test unitaire du formatage XOF',
      column: 'backlog',
      issue: 47,
    },
  ],
}

// Session changes until the task routes exist (PAM-404)
export const boardChanged = signal(0)

const columnName = (column: BoardColumn) =>
  boardColumns.find(([key]) => key === column)![1]

/** POST/api/task/move */
export const moveCard = (
  project: ProjectSlug,
  card: Card,
  column: BoardColumn,
) => {
  if (card.column === column) return
  card.column = column
  logActivity(
    project,
    `Carte « ${card.title} » déplacée vers ${columnName(column)}`,
  )
  boardChanged.value++
}

/** POST/api/task/create: a new card goes to the backlog */
export const addCard = (
  project: ProjectSlug,
  title: string,
  issue?: number,
) => {
  const cards = boards[project] ??= []
  const id = `c${Object.values(boards).flat().length + 1}`
  cards.push({ id, title, column: 'backlog', issue })
  logActivity(project, `Carte « ${title} » ajoutée au board`)
  boardChanged.value++
}
