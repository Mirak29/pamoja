import { navigate, url } from '@01edu/signal-router'
import { CircleAlert, CircleDot, Columns3 } from '/web/assets/icons.tsx'
import {
  addCard,
  boardChanged,
  boardColumns,
  boards,
} from '/web/fixtures/board.ts'
import { issues } from '/web/fixtures/issues.ts'
import { me, nameOf } from '/web/fixtures/people.ts'
import type { Project, ProjectSlug } from '/web/fixtures/projects.ts'
import { githubUrl } from '/web/lib/links.ts'
import { ago } from '/web/lib/time.ts'
import { DemoBadge } from '/web/ui/badge.tsx'
import { Button, OptionButton } from '/web/ui/button.tsx'
import { Eyebrow } from '/web/ui/eyebrow.tsx'
import { notify } from '/web/ui/toast.tsx'

const GOOD_FIRST_ISSUE = 'good first issue'

const labelTones: Record<string, string> = {
  blocked: 'border-danger bg-danger-soft text-danger',
  bug: 'border-danger bg-danger-soft text-danger',
  [GOOD_FIRST_ISSUE]: 'border-verified bg-verified-soft text-verified',
  enhancement: 'border-indigo bg-indigo-soft text-indigo',
  question: 'border-warning bg-warning-soft text-warning',
}

const columnNames: Record<string, string> = Object.fromEntries(boardColumns)

/** Issues synced from GitHub, filterable on good first issue */
export const IssuesTab = ({ project }: { project: Project }) => {
  boardChanged.value
  const open = issues
    .filter((issue) => issue.project === project.slug && issue.state === 'open')
    .sort((a, b) => b.at - a.at)
  const beginners = open.filter((issue) =>
    issue.labels.includes(GOOD_FIRST_ISSUE)
  )
  const onlyBeginners = url.params.filtre === 'good-first-issue'
  const list = onlyBeginners ? beginners : open
  const cards = boards[project.slug as ProjectSlug] ?? []
  const isMember = project.owner === me.login ||
    project.members.some((m) => m.login === me.login)

  return (
    <section class='slab mr-2 overflow-hidden'>
      <div class='flex flex-wrap items-end justify-between gap-4 px-5 pt-[18px] pb-4'>
        <div class='flex min-w-0 flex-[1_1_260px] flex-col gap-1.5'>
          <Eyebrow>Issues · synchronisées depuis GitHub</Eyebrow>
          <h2 class='font-display text-heading'>
            {open.length}{' '}
            {open.length > 1 ? 'issues ouvertes' : 'issue ouverte'}
          </h2>
        </div>
        <div class='flex flex-wrap gap-2 pb-1'>
          <OptionButton
            pressed={!onlyBeginners}
            onClick={() => navigate({ params: { filtre: null } })}
          >
            Toutes · {open.length}
          </OptionButton>
          <OptionButton
            pressed={onlyBeginners}
            onClick={() => navigate({ params: { filtre: 'good-first-issue' } })}
          >
            {GOOD_FIRST_ISSUE} · {beginners.length}
          </OptionButton>
        </div>
      </div>
      {list.map((issue) => {
        const blocked = issue.labels.includes('blocked')
        const card = cards.find((c) => c.issue === issue.number)
        const column = card && columnNames[card.column]
        return (
          <div
            key={issue.number}
            class='flex flex-wrap items-start gap-3.5 border-t border-line px-5 py-3.5 hover:bg-surface-000'
          >
            <span
              class={`tile flex size-[34px] flex-none items-center justify-center ${
                blocked ? 'text-danger' : 'text-verified'
              }`}
            >
              {blocked
                ? <CircleAlert class='size-[18px]' />
                : <CircleDot class='size-[18px]' />}
            </span>
            <div class='flex min-w-[220px] flex-1 flex-col gap-[7px]'>
              <a
                href={githubUrl(project, 'issues', issue.number)}
                class='font-semibold text-pretty text-ink hover:text-indigo'
              >
                <span class='font-mono text-[14px] leading-5 font-medium text-ink-muted'>
                  #{issue.number}
                </span>{' '}
                {issue.title}
              </a>
              <div class='flex flex-wrap gap-1.5'>
                {issue.labels.map((label) => (
                  <span
                    key={label}
                    class={`inline-flex h-[22px] items-center rounded-sm border px-2 font-mono text-[12px] leading-none font-medium whitespace-nowrap ${
                      labelTones[label] ?? 'border-line-control text-ink-muted'
                    }`}
                  >
                    {label}
                  </span>
                ))}
              </div>
              <span class='text-[13px] leading-5 text-ink-muted'>
                {nameOf(issue.author).split(' ')[0]} · ouverte {ago(issue.at)} ·
                {' '}
                {issue.comments}{' '}
                {issue.comments > 1 ? 'commentaires' : 'commentaire'}
              </span>
            </div>
            <div class='flex flex-col items-end gap-2 pb-1'>
              {issue.demo && <DemoBadge />}
              {column && (
                <span class='inline-flex items-center gap-1.5 text-[13px] text-ink-muted'>
                  <Columns3 class='size-3.5' />
                  Board · {column}
                </span>
              )}
              {isMember && !column && (
                <Button
                  variant='secondary'
                  size={32}
                  aria-label={`Ajouter l’issue #${issue.number} au board`}
                  onClick={() => {
                    addCard(
                      project.slug as ProjectSlug,
                      issue.title,
                      issue.number,
                    )
                    notify({
                      title: 'Ajoutée au board',
                      body: `Issue #${issue.number} dans la colonne Backlog.`,
                      icon: Columns3,
                      tone: 'verified',
                      href: `projet/${project.slug}/board`,
                    })
                  }}
                >
                  Ajouter au board
                </Button>
              )}
            </div>
          </div>
        )
      })}
      {!list.length && (
        <p class='border-t border-line px-6 py-10 text-center text-ink-muted'>
          {onlyBeginners
            ? 'Aucune good first issue ouverte pour l’instant.'
            : 'Aucune issue ouverte. Tout est fermé sur GitHub.'}
        </p>
      )}
    </section>
  )
}
