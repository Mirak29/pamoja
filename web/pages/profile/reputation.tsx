import { counted } from '/web/lib/plural.ts'
import { A } from '@01edu/signal-router'
import type { Login } from '/web/fixtures/people.ts'
import {
  type Badge,
  badgesOf,
  dimensions,
  levelNames,
  nextThreshold,
  proofsOf,
} from '/web/fixtures/reputation.ts'
import { Progress } from '/web/ui/progress.tsx'
import { prism } from '/web/ui/shapes.tsx'
import { t } from '/web/lib/language.ts'

/** The five dimensions, each with its count of proofs (§8.1) */
export const dimensionsOf = (login: Login) => {
  const mine = proofsOf(login)
  return dimensions.map(([key, label]) => {
    const list = mine.filter((p) => p.dimension === key)
    const verified = list.filter((p) => p.verified).length
    return {
      key,
      label,
      count: list.length,
      next: nextThreshold(key, list.length),
      summary: counted(list.length, 'preuve') +
        (verified ? t` · ${counted(verified, 'vérifiée')} par GitHub` : ''),
    }
  })
}

/**
 * Bars of the five dimensions. On the full profile each one opens its
 * proofs; on the passport they are read only.
 */
export const DimensionBars = (
  { login, readOnly }: { login: Login; readOnly?: boolean },
) => (
  <>
    {dimensionsOf(login).map(({ key, label, count, next, summary }) => {
      const content = (
        <>
          <span class='flex justify-between gap-2 text-[14px]'>
            <span class='font-semibold'>{label}</span>
            <span class='font-mono text-data tabular-nums'>{count}</span>
          </span>
          <Progress value={count} max={next} label={label} />
          <span class='text-[12px] text-ink-muted'>
            {summary}
            {!readOnly && ' · Voir les preuves'}
          </span>
        </>
      )
      return readOnly
        ? <div key={key} class='flex flex-col gap-1.5'>{content}</div>
        : (
          <A
            key={key}
            params={{ dialog: `preuves-${key}` }}
            class='flex w-full flex-col gap-2 border-t border-line py-3.5 text-ink no-underline hover:text-indigo hover:no-underline'
          >
            {content}
          </A>
        )
    })}
  </>
)

/** A badge is a column: the higher the level, the taller it stands */
const BadgeColumn = ({ level }: { level: number }) => {
  const { top, left, right } = prism(16, 32, 11, 6.3, 3 + (level + 1) * 5)
  return (
    <svg
      width='32'
      height='42'
      viewBox='0 0 32 42'
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
        fill='var(--indigo-soft)'
        stroke='var(--indigo)'
        stroke-width='1'
        stroke-linejoin='round'
      />
    </svg>
  )
}

export const levelName = (badge: Badge) =>
  badge.level < 0 ? 'En route' : levelNames[badge.level]

const BadgeContent = ({ badge, compact }: {
  badge: Badge
  compact?: boolean
}) => (
  <>
    <BadgeColumn level={badge.level} />
    <span
      class={`flex min-w-0 flex-1 flex-col ${
        compact ? 'gap-[5px]' : 'gap-1.5'
      }`}
    >
      <span class='flex items-center justify-between gap-2 text-[14px]'>
        <span class='font-semibold'>{badge.name}</span>
        <span class='font-mono text-[11px] leading-[18px] font-medium tracking-[.06em] text-indigo uppercase'>
          {levelName(badge)}
        </span>
      </span>
      <Progress
        value={badge.count}
        max={badge.next ?? badge.count}
        label={badge.name}
        thin
      />
      {!compact && (
        <span class='flex justify-between gap-2 text-[12px] text-ink-muted'>
          <span>{badge.nextLabel}</span>
          <span class='font-mono text-[13px] leading-4 font-medium text-ink'>
            {badge.next ? `${badge.count} / ${badge.next}` : badge.count}
          </span>
        </span>
      )}
    </span>
  </>
)

const badgeRow =
  'flex w-full items-end gap-3 rounded-md border border-line-strong bg-surface-000 py-3 pr-3.5 pl-2.5 text-left text-ink inset-shadow-well'

/**
 * Badges with their level and what is left before the next one (§8.2).
 * `compact` keeps the three highest, for the passport.
 */
export const BadgeList = (
  { login, compact }: { login: Login; compact?: boolean },
) => {
  const badges = badgesOf(login)
  if (compact) {
    return (
      <>
        {[...badges]
          .sort((a, b) => b.level - a.level || b.count - a.count)
          .slice(0, 3)
          .map((badge) => (
            <div key={badge.name} class='flex items-end gap-3'>
              <BadgeContent badge={badge} compact />
            </div>
          ))}
      </>
    )
  }
  return (
    <>
      {badges.map((badge) =>
        badge.dimension
          ? (
            <A
              key={badge.name}
              params={{ dialog: `preuves-${badge.dimension}` }}
              class={`${badgeRow} no-underline hover:border-figure-edge hover:no-underline`}
            >
              <BadgeContent badge={badge} />
            </A>
          )
          : (
            <div key={badge.name} class={badgeRow}>
              <BadgeContent badge={badge} />
            </div>
          )
      )}
    </>
  )
}
