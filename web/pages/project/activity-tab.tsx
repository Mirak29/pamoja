import type { JSX } from 'preact'
import { navigate, url } from '@01edu/signal-router'
import {
  CircleCheck,
  CircleDot,
  CircleX,
  Columns3,
  GitMerge,
  GitPullRequest,
  LifeBuoy,
  Tag,
  UserPlus,
  Zap,
} from '/web/assets/icons.tsx'
import {
  activityChanged,
  type ActivityKind,
  activityKind,
  activityOf,
} from '/web/fixtures/activity.ts'
import type { Project } from '/web/fixtures/projects.ts'
import { ago } from '/web/lib/time.ts'
import { EventText } from '/web/pages/project/event-list.tsx'
import { DemoBadge, VerifiedBadge } from '/web/ui/badge.tsx'
import { OptionButton } from '/web/ui/button.tsx'
import { Eyebrow } from '/web/ui/eyebrow.tsx'
import { EmptyState } from '/web/ui/states.tsx'

type IconComponent = (props: JSX.IntrinsicElements['svg']) => JSX.Element

// URL key, kind and label of each filter
const filters: [string, ActivityKind | null, string][] = [
  ['tout', null, 'Tout'],
  ['github', 'github', 'GitHub'],
  ['equipe', 'team', 'Équipe'],
  ['aide', 'help', 'Aide'],
]

// Icon and color of an entry, read from its text like its kind
const icons: [RegExp, IconComponent, string][] = [
  [/merg/, GitMerge, 'text-indigo'],
  [/CI en échec/, CircleX, 'text-danger'],
  [/CI réparée/, CircleCheck, 'text-verified'],
  [/[Rr]elease/, Tag, 'text-indigo'],
  [/[Rr]eview/, GitPullRequest, 'text-verified'],
  [/PR/, GitPullRequest, 'text-indigo'],
  [/rejoint|devient/, UserPlus, 'text-indigo'],
  [/Carte/, Columns3, 'text-ink-muted'],
  [/[Ss]ynchro|import/, Zap, 'text-indigo'],
  [/Issue/, CircleDot, 'text-warning'],
  [/aide|[Dd]emande/, LifeBuoy, 'text-indigo'],
]

const iconOf = (text: string): [IconComponent, string] => {
  const found = icons.find(([pattern]) => pattern.test(text))
  return found ? [found[1], found[2]] : [CircleDot, 'text-ink-muted']
}

const dayOf = (at: number) =>
  new Date(at).toLocaleDateString('fr-FR', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
  })

/** Project journal by day, filtered by kind (§6.6) */
export const ActivityTab = ({ project }: { project: Project }) => {
  activityChanged.value
  const entries = activityOf(project)
  const current = filters.find(([key]) => key === url.params.filtre) ??
    filters[0]
  const shown = entries.filter((entry) =>
    !current[1] || activityKind(entry.text) === current[1]
  )
  const days = new Map<string, typeof shown>()
  for (const entry of shown) {
    const day = dayOf(entry.at)
    days.set(day, [...(days.get(day) ?? []), entry])
  }
  return (
    <section class='slab mr-2 overflow-hidden'>
      <div class='flex flex-wrap items-end justify-between gap-4 px-5 pt-[18px] pb-4'>
        <div class='flex min-w-0 flex-[1_1_260px] flex-col gap-1.5'>
          <Eyebrow>Journal du projet</Eyebrow>
          <h2 class='font-display text-heading'>Activité</h2>
        </div>
        <div class='flex flex-wrap gap-2 pb-1'>
          {filters.map(([key, kind, label], i) => (
            <OptionButton
              key={key}
              pressed={key === current[0]}
              onClick={() => navigate({ params: { filtre: i ? key : null } })}
            >
              {label} · {entries.filter((entry) =>
                !kind || activityKind(entry.text) === kind
              ).length}
            </OptionButton>
          ))}
        </div>
      </div>
      {[...days].map(([day, list]) => (
        <div key={day}>
          <div class='border-t border-line bg-surface-000 px-5 py-2.5'>
            <Eyebrow>{day}</Eyebrow>
          </div>
          {list.map((entry) => {
            const [Icon, color] = iconOf(entry.text)
            return (
              <div
                key={`${entry.at}${entry.text}`}
                class='flex flex-wrap items-center gap-3 border-t border-line px-5 py-3'
              >
                <span
                  class={`tile flex size-8 flex-none items-center justify-center ${color}`}
                >
                  <Icon />
                </span>
                <EventText project={project} text={entry.text} />
                <span class='text-[12px] text-ink-muted'>{ago(entry.at)}</span>
                {entry.session && activityKind(entry.text) === 'github' && (
                  <VerifiedBadge />
                )}
                {!entry.session && project.demo && <DemoBadge />}
              </div>
            )
          })}
        </div>
      ))}
      {!shown.length && (
        <div class='border-t border-line'>
          <EmptyState>Rien dans cette catégorie pour l’instant.</EmptyState>
        </div>
      )}
    </section>
  )
}
