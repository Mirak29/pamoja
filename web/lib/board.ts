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
// page's. A card is internal, or linked to an issue or a PR of the project;
// a PR opened gets its card in Review and a merged one goes to Done through
// the webhook (§6.7). What the developer does is shown at once then saved;
// a failure puts it back.

/**
 * Read a project's board from the server and show its cards; the board of
 * the others follows a move in real time (TASK_UPDATED, live-data.ts)
 */
export const loadBoard = (slug: string) => {
  return api['GET/api/project/board'].fetch({ slug }).then((cards) => {
    boards[slug as ProjectSlug] = cards.map((c) => ({
      id: String(c.id),
      title: c.title,
      column: c.column as BoardColumn,
      milestone: c.milestone || undefined,
      issue: c.issue || undefined,
      pullRequest: c.pullRequest || undefined,
    }))
    boardChanged.value++
  }, () => {})
}

// The boards shown now, followed in real time; one left is forgotten
const opened = new Map<string, number>()

/** Reads a board and follows it while it is shown: the cleanup of a page */
export const followBoard = (slug: string) => {
  opened.set(slug, (opened.get(slug) ?? 0) + 1)
  loadBoard(slug)
  return () => {
    const left = (opened.get(slug) ?? 1) - 1
    left ? opened.set(slug, left) : opened.delete(slug)
  }
}

/** What a card points at on GitHub */
export type CardLink = { issue?: number; pullRequest?: number }

let pending = 0

/**
 * Adds a card, saved on the server: internal with a title, or from an issue
 * or a PR, titled after it. Shown at once, it takes the id and the column
 * the server gave it
 */
export const createCard = (
  slug: string,
  title: string,
  link: CardLink = {},
) => {
  const cards = boards[slug as ProjectSlug] ??= []
  const local: Card = {
    id: `new-${++pending}`,
    title: title ||
      (link.pullRequest
        ? `PR #${link.pullRequest}`
        : link.issue
        ? `Issue #${link.issue}`
        : ''),
    column: link.pullRequest ? 'review' : 'backlog',
    issue: link.issue,
    pullRequest: link.pullRequest,
  }
  cards.push(local)
  boardChanged.value++
  return api['POST/api/task/create'].fetch({
    slug,
    title,
    issue: link.issue ?? 0,
    pullRequest: link.pullRequest ?? 0,
  }).then(
    (saved) => {
      Object.assign(local, {
        id: String(saved.id),
        title: saved.title,
        column: saved.column as BoardColumn,
      })
      boardChanged.value++
      return true
    },
    (error) => {
      const index = cards.indexOf(local)
      index >= 0 && cards.splice(index, 1)
      boardChanged.value++
      notifyFailure('Carte non ajoutée', error, {
        linked: 'Cette issue ou cette PR a déjà sa carte.',
      })
      return false
    },
  )
}

/** Links a card to an issue or a PR of its project, or makes it internal */
export const linkCard = (slug: string, card: Card, link: CardLink) => {
  const taskId = Number(card.id)
  if (!Number.isInteger(taskId) || taskId <= 0) return
  const before = { issue: card.issue, pullRequest: card.pullRequest }
  card.issue = link.issue
  card.pullRequest = link.pullRequest
  boardChanged.value++
  api['POST/api/task/link'].fetch({
    taskId,
    issue: link.issue ?? 0,
    pullRequest: link.pullRequest ?? 0,
  }).then(
    (saved) => {
      // A PR already merged moves the card to Done
      if (saved.column !== card.column) {
        moveCard(slug as ProjectSlug, card, saved.column as BoardColumn)
      }
    },
    (error) => {
      Object.assign(card, before)
      boardChanged.value++
      notifyFailure('Lien non enregistré', error, {
        linked: 'Cette issue ou cette PR a déjà sa carte.',
      })
    },
  )
}

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

/** Reads the boards open on the page again */
export const reloadOpenedBoards = () => {
  for (const slug of opened.keys()) loadBoard(slug)
}
