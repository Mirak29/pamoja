import { useState } from 'preact/hooks'
import {
  ChevronLeft,
  ChevronRight,
  CircleDot,
  GitMerge,
  GitPullRequest,
  Plus,
  StickyNote,
} from '/web/assets/icons.tsx'
import {
  addCard,
  boardChanged,
  type BoardColumn,
  boardColumns,
  boards,
  type Card,
  moveCard,
} from '/web/fixtures/board.ts'
import { issues } from '/web/fixtures/issues.ts'
import { me } from '/web/fixtures/people.ts'
import type { Project, ProjectSlug } from '/web/fixtures/projects.ts'
import { pullRequests } from '/web/fixtures/pull-requests.ts'
import { StatusBadge } from '/web/ui/badge.tsx'
import { Button } from '/web/ui/button.tsx'
import { t, translate } from '/web/lib/language.ts'

// Diamond of each column: from a dashed outline to a filled indigo
const marks: Record<BoardColumn, string> = {
  backlog: 'border border-dashed border-line-control',
  ready: 'border border-indigo',
  in_progress: 'border border-indigo bg-indigo-soft',
  review: 'border border-warning bg-warning-soft',
  done: 'border border-indigo-edge bg-indigo',
}

const moveKey =
  'flex size-7 cursor-pointer items-center justify-center rounded-[5px] border border-line-control bg-surface-100 text-ink shadow-[1.73px_1px_0_0_var(--line-control)] disabled:cursor-default disabled:opacity-35'

type CardProps = {
  project: Project
  card: Card
  index: number
  canMove: boolean
  dragged: boolean
  /** Just moved: it slides into its new column */
  moved: boolean
  onDrag: (id: string | null) => void
  onMove: (card: Card, column: BoardColumn) => void
}

const BoardCard = (
  { project, card, index, canMove, dragged, moved, onDrag, onMove }: CardProps,
) => {
  const pr = card.pullRequest !== undefined &&
    pullRequests.find((p) =>
      p.number === card.pullRequest && p.project === project.slug
    )
  const issue = card.issue !== undefined &&
    issues.find((i) => i.number === card.issue && i.project === project.slug)
  const merged = pr
    ? pr.state === 'merged'
    : card.pullRequest !== undefined && card.column === 'done'
  const LinkIcon = card.pullRequest !== undefined
    ? merged ? GitMerge : GitPullRequest
    : card.issue !== undefined
    ? CircleDot
    : StickyNote
  const previous = boardColumns[index - 1]
  const next = boardColumns[index + 1]
  return (
    <div
      draggable={canMove}
      onDragStart={(event) => {
        event.dataTransfer?.setData('text/plain', card.id)
        setTimeout(() => onDrag(card.id))
      }}
      onDragEnd={() => onDrag(null)}
      data-card={card.id}
      class={`mr-1 flex flex-col gap-2.5 rounded-[8px] border border-figure-edge bg-surface-100 p-3 shadow-tile transition-[translate,box-shadow,opacity] duration-150 ease-out hover:-translate-x-[.87px] hover:-translate-y-[.5px] hover:shadow-key-hi ${
        canMove ? 'cursor-grab' : ''
      } ${dragged ? 'opacity-40' : ''} ${moved ? 'animate-enter' : ''}`}
    >
      <span class='text-[14px] leading-5 font-semibold text-pretty'>
        {card.title}
      </span>
      <div class='flex flex-wrap items-center gap-1.5'>
        <span
          class={`inline-flex h-[22px] items-center gap-1 rounded-sm border border-line-control px-[7px] font-mono text-[11px] leading-none font-medium whitespace-nowrap text-ink-muted ${
            card.pullRequest !== undefined || card.issue !== undefined
              ? ''
              : 'border-dashed'
          }`}
        >
          <LinkIcon class='size-3' />
          {card.pullRequest !== undefined
            ? `PR #${card.pullRequest}`
            : card.issue !== undefined
            ? `Issue #${card.issue}`
            : 'Carte interne'}
        </span>
        {pr && pr.state !== 'merged' && (
          <StatusBadge status={pr.ci === 'ok' ? 'ci-ok' : 'ci-failed'} />
        )}
        {merged && <StatusBadge status='merged' />}
        {issue && issue.labels.includes('blocked') && (
          <span class='inline-flex h-[22px] items-center rounded-sm border border-danger bg-danger-soft px-[7px] font-mono text-[11px] leading-none font-medium text-danger'>
            blocked
          </span>
        )}
      </div>
      {canMove && (
        <div class='flex justify-end gap-2 pr-[3px] pb-0.5'>
          <button
            type='button'
            disabled={!previous}
            data-move='previous'
            onClick={() => previous && onMove(card, previous[0])}
            aria-label={previous
              ? t`Déplacer « ${card.title} » vers ${translate(previous[1])}`
              : 'Première colonne'}
            title={previous
              ? t`Déplacer vers ${translate(previous[1])}`
              : 'Première colonne'}
            class={moveKey}
          >
            <ChevronLeft class='size-3.5' />
          </button>
          <button
            type='button'
            disabled={!next}
            data-move='next'
            onClick={() => next && onMove(card, next[0])}
            aria-label={next
              ? t`Déplacer « ${card.title} » vers ${translate(next[1])}`
              : 'Dernière colonne'}
            title={next
              ? t`Déplacer vers ${translate(next[1])}`
              : 'Dernière colonne'}
            class={moveKey}
          >
            <ChevronRight class='size-3.5' />
          </button>
        </div>
      )}
    </div>
  )
}

const NewCard = ({ project }: { project: Project }) => {
  const [title, setTitle] = useState('')
  const add = () => {
    if (!title.trim()) return
    addCard(project.slug as ProjectSlug, title.trim())
    setTitle('')
  }
  return (
    <div class='mt-auto flex gap-2 pr-1'>
      <input
        value={title}
        onInput={(event) => setTitle(event.currentTarget.value)}
        onKeyDown={(event) => event.key === 'Enter' && add()}
        placeholder='Nouvelle carte'
        aria-label='Titre de la nouvelle carte'
        class='well h-9 min-w-0 flex-1 px-3 text-[14px] leading-none text-ink'
      />
      <Button size={36} square onClick={add} aria-label='Ajouter la carte'>
        <Plus />
      </Button>
    </div>
  )
}

/** Kanban board of the project, cards moved by drag or arrows (§6.7) */
export const BoardTab = ({ project }: { project: Project }) => {
  boardChanged.value
  const [dragged, setDragged] = useState<string | null>(null)
  const [over, setOver] = useState<BoardColumn | null>(null)
  const [moved, setMoved] = useState<string | null>(null)
  const [announce, setAnnounce] = useState('')
  const cards = boards[project.slug as ProjectSlug] ?? []
  const move = (card: Card, column: BoardColumn) => {
    const from = boardColumns.findIndex(([key]) => key === card.column)
    const to = boardColumns.findIndex(([key]) => key === column)
    moveCard(project.slug as ProjectSlug, card, column)
    setMoved(card.id)
    setAnnounce(t`« ${card.title} » est dans ${translate(boardColumns[to][1])}`)
    // The card is drawn again in its new column: keep the focus on its key
    setTimeout(() => {
      const keys = document.querySelector(`[data-card='${card.id}']`)
      const same = keys?.querySelector<HTMLButtonElement>(
        `[data-move='${to > from ? 'next' : 'previous'}']:not(:disabled)`,
      )
      ;(same ?? keys?.querySelector<HTMLButtonElement>(
        '[data-move]:not(:disabled)',
      ))?.focus()
    })
  }
  const canMove = project.owner === me.login ||
    project.members.some((m) => m.login === me.login)
  return (
    <div class='mr-2 flex flex-col gap-4'>
      <span aria-live='polite' class='sr-only'>{announce}</span>
      <span class='text-[13px] text-ink-muted'>
        {canMove
          ? 'Glisse une carte d’une colonne à l’autre, ou utilise les flèches. Une PR mergée passe sa carte en Terminé.'
          : 'Lecture seule : rejoins le projet pour déplacer les cartes.'}
      </span>
      <div class='grid grid-cols-[repeat(5,minmax(228px,1fr))] gap-[18px] overflow-x-auto px-0.5 pt-0.5 pb-3.5'>
        {boardColumns.map(([key, label], index) => {
          const list = cards.filter((card) => card.column === key)
          return (
            <div
              key={key}
              role='group'
              aria-label={label}
              onDragOver={(event) => {
                if (!canMove) return
                event.preventDefault()
                setOver(key)
              }}
              onDragLeave={() => setOver(null)}
              onDrop={(event) => {
                event.preventDefault()
                const card = cards.find((c) => c.id === dragged)
                if (card) move(card, key)
                setDragged(null)
                setOver(null)
              }}
              // As high as the screen at most: the cards scroll inside
              class={`flex h-[max(480px,calc(100dvh-260px))] flex-col gap-3 rounded-lg border pt-3 pr-1 pb-2 pl-2.5 inset-shadow-well transition-[background-color] duration-150 ease-out ${
                over === key
                  ? 'border-dashed border-indigo bg-indigo-soft'
                  : 'border-line-strong bg-surface-000'
              }`}
            >
              <div class='flex items-center gap-2 px-1 pt-0.5 pb-1'>
                <span
                  aria-hidden='true'
                  class={`diamond size-2.5 ${marks[key]}`}
                />
                <span class='flex-1 font-mono text-label uppercase'>
                  {label}
                </span>
                <span class='font-mono text-[12px] leading-4 font-medium text-ink-muted'>
                  {list.length}
                </span>
              </div>
              <div class='-ml-1 flex min-h-0 flex-1 flex-col gap-3 overflow-y-auto overscroll-contain pt-0.5 pr-2 pb-2 pl-1'>
                {list.map((card) => (
                  <BoardCard
                    key={card.id}
                    project={project}
                    card={card}
                    index={index}
                    canMove={canMove}
                    dragged={dragged === card.id}
                    moved={moved === card.id}
                    onDrag={setDragged}
                    onMove={move}
                  />
                ))}
                {!list.length && (
                  <div class='flex min-h-[84px] items-center justify-center rounded-[8px] border border-dashed border-line-strong p-3 text-center text-[13px] text-ink-muted'>
                    Dépose une carte ici
                  </div>
                )}
                {key === 'backlog' && canMove && <NewCard project={project} />}
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
