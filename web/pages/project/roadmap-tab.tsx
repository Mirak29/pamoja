import { counted } from '/web/lib/plural.ts'
import type { Milestone, Project } from '/web/fixtures/projects.ts'
import { StatusBadge } from '/web/ui/badge.tsx'
import { Eyebrow } from '/web/ui/eyebrow.tsx'
import { Progress } from '/web/ui/progress.tsx'
import { prism } from '/web/ui/shapes.tsx'

// A planned milestone is drawn dashed and empty, a done one filled
const looks: Record<
  Milestone['state'],
  { top: string; topLine: string; left: string; right: string; line: string }
> = {
  done: {
    top: 'var(--indigo)',
    topLine: 'var(--indigo-edge)',
    left: 'var(--surface-100)',
    right: 'var(--side)',
    line: 'var(--ink)',
  },
  active: {
    top: 'var(--indigo-soft)',
    topLine: 'var(--indigo)',
    left: 'var(--surface-100)',
    right: 'var(--side)',
    line: 'var(--ink)',
  },
  planned: {
    top: 'none',
    topLine: 'var(--line-control)',
    left: 'none',
    right: 'none',
    line: 'var(--line-control)',
  },
}

/** Each milestone is a column that grows with the roadmap (§6.7) */
const Column = (
  { milestone, index }: { milestone: Milestone; index: number },
) => {
  const look = looks[milestone.state]
  const dash = milestone.state === 'planned' ? '3 3' : '0'
  const { top, left, right } = prism(
    60,
    118,
    44,
    25,
    Math.min(80, 14 + index * 20),
  )
  return (
    <svg
      width='100%'
      height='130'
      viewBox='0 0 120 130'
      aria-hidden='true'
      class='block overflow-visible'
    >
      <polygon
        points={left}
        fill={look.left}
        stroke={look.line}
        stroke-width='0.9'
        stroke-dasharray={dash}
        stroke-linejoin='round'
      />
      <polygon
        points={right}
        fill={look.right}
        stroke={look.line}
        stroke-width='0.9'
        stroke-dasharray={dash}
        stroke-linejoin='round'
      />
      <polygon
        points={top}
        fill={look.top}
        stroke={look.topLine}
        stroke-width='1'
        stroke-dasharray={dash}
        stroke-linejoin='round'
      />
    </svg>
  )
}

export const RoadmapTab = ({ project }: { project: Project }) => {
  const { milestones } = project
  const count = (state: Milestone['state']) =>
    milestones.filter((m) => m.state === state).length
  return (
    <div class='mr-2 flex flex-col gap-5'>
      <div class='flex flex-col gap-1.5'>
        <Eyebrow>Roadmap</Eyebrow>
        <h2 class='font-display text-heading'>
          {counted(milestones.length, 'milestone')} ·{' '}
          {counted(count('done'), 'terminée')} · {count('active')} en cours ·
          {' '}
          {counted(count('planned'), 'prévue')}
        </h2>
      </div>
      <div class='grid grid-cols-[repeat(auto-fit,minmax(min(100%,220px),1fr))] items-end gap-x-6 gap-y-7'>
        {milestones.map((milestone, index) => (
          <div key={milestone.title} class='flex flex-col gap-3.5'>
            <Column milestone={milestone} index={index} />
            <div class='slab mr-2 flex flex-col gap-2.5 p-4'>
              <div class='flex flex-wrap items-center justify-between gap-2'>
                <StatusBadge status={`milestone-${milestone.state}`} />
                <span class='font-mono text-[12px] leading-4 font-medium text-ink-muted'>
                  {milestone.date}
                </span>
              </div>
              <span class='font-display text-[16px] leading-[22px] font-semibold text-pretty'>
                {milestone.title}
              </span>
              {milestone.description && (
                <span class='text-[13px] leading-5 text-ink-muted'>
                  {milestone.description}
                </span>
              )}
              <Progress
                value={milestone.done}
                max={milestone.total}
                label={milestone.title}
              />
              <span class='font-mono text-[13px] leading-[18px] font-medium text-ink-muted'>
                {milestone.done} / {milestone.total} tâches
              </span>
            </div>
          </div>
        ))}
      </div>
      {!milestones.length && (
        <span class='text-[14px] text-ink-muted'>
          Aucune milestone pour l’instant.
        </span>
      )}
    </div>
  )
}
