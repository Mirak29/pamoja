import type { ComponentChildren } from 'preact'
import { useEffect, useState } from 'preact/hooks'
import { CircleAlert, CircleCheck, TriangleAlert } from '/web/assets/icons.tsx'
import { type HealthIndicator, projectPulse } from '/web/fixtures/pulse.ts'
import type { Project } from '/web/fixtures/projects.ts'
import { EventList } from '/web/pages/project/event-list.tsx'
import { SkillChip } from '/web/ui/badge.tsx'
import { Eyebrow } from '/web/ui/eyebrow.tsx'
import { Progress } from '/web/ui/progress.tsx'
import { prism } from '/web/ui/shapes.tsx'

// The summary arrives a few seconds after the page, like PULSE_READY will
// through SSE (PAM-307)
const SUMMARY_DELAY = 2600

const Summary = ({ text }: { text?: string }) => {
  const [ready, setReady] = useState(false)
  useEffect(() => {
    const timer = setTimeout(() => setReady(true), SUMMARY_DELAY)
    return () => clearTimeout(timer)
  }, [])
  return (
    <section class='slab-selected flex flex-col gap-3 p-[22px]'>
      <div class='flex flex-wrap items-center gap-3'>
        <Eyebrow accent>Résumé IA</Eyebrow>
        <span class='text-[13px] text-ink-muted'>
          7 derniers jours, à partir de l’activité GitHub
        </span>
      </div>
      {ready && text
        ? (
          <p class='max-w-[820px] animate-[enter_250ms_ease-out] text-[17px] leading-[27px] text-pretty'>
            {text}
          </p>
        )
        : (
          <div aria-busy='true' class='flex flex-col gap-[9px]'>
            <div class='h-3 w-[94%] animate-skeleton rounded-sm bg-indigo-soft-side' />
            <div class='h-3 w-[86%] animate-skeleton rounded-sm bg-indigo-soft-side' />
            <div class='h-3 w-[58%] animate-skeleton rounded-sm bg-indigo-soft-side' />
            <span class='text-[13px] text-ink-muted'>
              Analyse de l’activité du projet…
            </span>
          </div>
        )}
    </section>
  )
}

const Metric = (
  { label, value, height, warning }: {
    label: string
    value: number
    height: number
    warning?: boolean
  },
) => {
  const { top, left, right } = prism(22, 58, 14, 8, height)
  return (
    <div class='slab flex items-end gap-2 pt-4 pr-3 pb-3.5 pl-4'>
      <div class='flex min-w-0 flex-1 flex-col gap-1.5'>
        <span
          class={`font-mono text-[30px] leading-8 font-medium tabular-nums ${
            warning ? 'text-warning' : 'text-ink-muted'
          }`}
        >
          {value}
        </span>
        <span class='text-[13px] leading-[17px] text-ink-muted'>{label}</span>
      </div>
      <svg
        width='44'
        height='70'
        viewBox='0 0 44 70'
        aria-hidden='true'
        class='flex-none overflow-visible'
      >
        <polygon
          points={left}
          fill='var(--surface-100)'
          stroke='var(--ink)'
          stroke-width='0.9'
          stroke-linejoin='round'
        />
        <polygon
          points={right}
          fill='var(--side)'
          stroke='var(--ink)'
          stroke-width='0.9'
          stroke-linejoin='round'
        />
        <polygon
          points={top}
          fill={warning ? 'var(--warning-soft)' : 'var(--indigo-soft)'}
          stroke={warning ? 'var(--warning)' : 'var(--indigo)'}
          stroke-width='1'
          stroke-linejoin='round'
        />
      </svg>
    </div>
  )
}

const healthTones = {
  ok: ['text-verified', CircleCheck],
  warning: ['text-warning', TriangleAlert],
  danger: ['text-danger', CircleAlert],
} as const

const Health = ({ indicators }: { indicators: HealthIndicator[] }) => (
  <section class='slab flex flex-col px-5 py-[18px]'>
    <span class='pb-2.5'>
      <Eyebrow>Health</Eyebrow>
    </span>
    {indicators.map(({ label, value, state, rule, tone }) => {
      const [color, Icon] = healthTones[tone]
      return (
        <div
          key={label}
          title={rule}
          tabIndex={0}
          class='flex cursor-help items-center gap-2.5 border-t border-line py-2.5'
        >
          <span class='flex flex-1 flex-col'>
            <span class='text-[14px] font-semibold'>{label}</span>
            <span class='font-mono text-[12px] leading-4 font-medium text-ink-muted'>
              {value}
            </span>
          </span>
          <span
            class={`inline-flex items-center gap-1 text-[13px] font-semibold ${color}`}
          >
            <Icon class='size-3.5' />
            {state}
          </span>
        </div>
      )
    })}
    <span class='pt-1.5 text-[12px] text-ink-muted'>
      Survole un indicateur pour voir sa règle.
    </span>
  </section>
)

const Blockers = (
  { blockers }: { blockers: ReturnType<typeof projectPulse>['blockers'] },
) => (
  <section class='flex flex-col gap-2.5 rounded-lg border border-danger bg-surface-100 p-[18px] shadow-key-danger'>
    <span class='flex items-center gap-2 font-mono text-label text-danger uppercase'>
      <CircleAlert />
      Bloqueur
    </span>
    {blockers.map((issue) => (
      <div key={issue.number} class='flex flex-col gap-0.5'>
        <span class='font-semibold'>
          <span class='font-mono text-[14px] leading-5 font-medium text-ink-muted'>
            #{issue.number}
          </span>{' '}
          {issue.title}
        </span>
        <span class='font-mono text-[12px] leading-4 text-ink-muted'>
          {issue.labels.join(' · ')}
        </span>
      </div>
    ))}
    <span class='text-[13px] leading-5 text-ink-muted'>
      Une review ne lève pas un bloqueur : il reste affiché jusqu’à la fermeture
      de l’issue.
    </span>
  </section>
)

const SubTitle = ({ children }: { children: ComponentChildren }) => (
  <span class='pt-1.5'>
    <Eyebrow>{children}</Eyebrow>
  </span>
)

const Dna = (
  { project, pulse }: {
    project: Project
    pulse: ReturnType<typeof projectPulse>
  },
) => (
  <section class='slab flex flex-col gap-3.5 p-[22px]'>
    <Eyebrow>DNA</Eyebrow>
    {pulse.languages.map(([language, share]) => (
      <div key={language} class='flex items-center gap-3'>
        <span class='w-[84px] text-[13px]'>{language}</span>
        <span class='flex-1'>
          <Progress value={share} max={100} label={language} />
        </span>
        <span class='w-10 text-right font-mono text-[12px] leading-4 font-medium text-ink-muted'>
          {share}%
        </span>
      </div>
    ))}
    <SubTitle>Domaines</SubTitle>
    <div class='flex flex-wrap gap-1.5'>
      {pulse.domains.map((domain) => (
        <SkillChip key={domain}>{domain}</SkillChip>
      ))}
    </div>
    <SubTitle>Besoins</SubTitle>
    <div class='flex flex-wrap gap-1.5'>
      {project.needs.map((need) => (
        <SkillChip key={need} match>{need}</SkillChip>
      ))}
    </div>
  </section>
)

const Story = ({ story }: { story: [string, string][] }) => (
  <section class='slab flex flex-col p-[22px]'>
    <span class='pb-3.5'>
      <Eyebrow>Story</Eyebrow>
    </span>
    {story.map(([date, text]) => (
      <div key={text} class='flex gap-3.5'>
        <div class='flex w-4 flex-col items-center'>
          <svg
            width='16'
            height='10'
            viewBox='0 0 16 10'
            aria-hidden='true'
            class='mt-1.5 flex-none'
          >
            <polygon
              points='8,1 15,5 8,9 1,5'
              fill='var(--surface-100)'
              stroke='var(--indigo)'
              stroke-width='1.2'
            />
          </svg>
          <span class='my-1 flex-1 border-l border-line-strong' />
        </div>
        <div class='flex flex-col gap-0.5 pb-4'>
          <span class='font-mono text-[12px] leading-4 font-medium text-ink-muted'>
            {date}
          </span>
          <span class='text-[14px] leading-5 text-pretty'>{text}</span>
        </div>
      </div>
    ))}
    {!story.length && (
      <span class='text-[14px] text-ink-muted'>
        Les moments marquants du projet apparaîtront ici.
      </span>
    )}
  </section>
)

/** Understand a project in a few seconds (§6.4, §6.5) */
export const PulseTab = ({ project }: { project: Project }) => {
  const pulse = projectPulse(project)
  const highest = Math.max(1, ...pulse.metrics.map((m) => m.value))
  return (
    <div class='mr-2 flex flex-col gap-8'>
      <Summary key={project.slug} text={pulse.summary} />
      <div class='grid grid-cols-[repeat(auto-fill,minmax(176px,1fr))] gap-6'>
        {pulse.metrics.map((metric) => (
          <Metric
            key={metric.label}
            {...metric}
            height={4 + Math.round(36 * metric.value / highest)}
          />
        ))}
      </div>
      <div class='grid items-start gap-8 lg:grid-cols-[minmax(0,2fr)_minmax(0,1fr)]'>
        <EventList project={project} title='Cette semaine' limit={7} />
        <div class='flex min-w-0 flex-col gap-8'>
          {pulse.blockers.length > 0 && <Blockers blockers={pulse.blockers} />}
          <Health indicators={pulse.health} />
        </div>
      </div>
      <div class='grid grid-cols-[repeat(auto-fit,minmax(min(100%,320px),1fr))] items-start gap-8'>
        <Dna project={project} pulse={pulse} />
        <Story story={pulse.story} />
      </div>
    </div>
  )
}
