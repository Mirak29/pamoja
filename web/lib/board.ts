import { api } from '/web/lib/api.ts'
import { notifyFailure } from '/web/lib/failure.ts'
import {
  boardChanged,
  type BoardColumn,
  boards,
  type Card,
  moveCard,
} from '/web/fixtures/board.ts'
import type { ProjectSlug } from '/web/fixtures/projects.ts'

// The board read from the server (PAM-404): its cards take the place of the
// page's, and a move is shown at once then saved; a failure puts it back. A
// merged pull request moves its card to Done through the webhook (§6.7).

/** Read a project's board from the server and show its cards */
export const loadBoard = (slug: string) =>
  api['GET/api/project/board'].fetch({ slug }).then((cards) => {
    boards[slug as ProjectSlug] = cards.map((c) => ({
      id: String(c.id),
      title: c.title,
      column: c.column as BoardColumn,
    }))
    boardChanged.value++
  }, () => {})

/** Move a card to a column, saved on the server */
export const moveTask = (slug: string, card: Card, column: BoardColumn) => {
  const from = card.column
  moveCard(slug as ProjectSlug, card, column)
  const taskId = Number(card.id)
  if (!Number.isInteger(taskId) || taskId <= 0) return
  api['POST/api/task/move'].fetch({ taskId, column }).catch((error) => {
    moveCard(slug as ProjectSlug, card, from)
    notifyFailure('Carte non déplacée', error)
  })
}
