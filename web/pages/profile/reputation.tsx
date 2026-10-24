import type { JSX } from 'preact'
import { counted } from '/web/lib/plural.ts'
import { A } from '@01edu/signal-router'
import { isMe, type Login } from '/web/fixtures/people.ts'
import {
  type Badge,
  badgesOf,
  dimensions,
  levelNames,
  type LockedBadge,
  lockedBadgesOf,
  nextBadgeOf,
  nextThreshold,
  proofsOf,
  unlockOf,
} from '/web/fixtures/reputation.ts'
import { Button } from '/web/ui/button.tsx'
import { Eyebrow } from '/web/ui/eyebrow.tsx'
import { Progress } from '/web/ui/progress.tsx'
import { prism } from '/web/ui/shapes.tsx'
import { ago } from '/web/lib/time.ts'
import { t, translate } from '/web/lib/language.ts'

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

// Faces of a column, in the viewBox of DimensionColumn
const COLUMN = { cx: 30, ground: 112, a: 20, b: 11.5, max: 84 }

/**
 * One dimension as an isometric column (§12.7: columns encode values): its
 * height follows the proofs, the dotted volume above is what is missing for
 * the next level of its badge.
 */
const DimensionColumn = (
  { count, next, scale }: { count: number; next: number; scale: number },
) => {
  const { cx, ground, a, b, max } = COLUMN
  // Square root: a single proof still stands out next to twenty
  const heightOf = (n: number) => Math.max(3, max * Math.sqrt(n / scale))
  const height = heightOf(count)
  const goal = prism(cx, ground, a, b, Math.max(height, heightOf(next)))
  const solid = prism(cx, ground, a, b, height)
  return (
    <svg
      viewBox='0 0 62 126'
      class='h-[112px] w-auto overflow-visible'
      aria-hidden='true'
    >
      <g
        fill='none'
        stroke='var(--indigo)'
        stroke-width='1'
        stroke-dasharray='3 2.5'
        stroke-linejoin='round'
      >
        <polygon points={goal.left} />
        <polygon points={goal.right} />
        <polygon points={goal.top} />
      </g>
      <g stroke='var(--ink)' stroke-width='1' stroke-linejoin='round'>
        <polygon points={solid.left} fill='var(--surface-100)' />
        <polygon points={solid.right} fill='var(--side)' />
        <polygon
          points={solid.top}
          fill={count ? 'var(--indigo)' : 'var(--surface-200)'}
        />
      </g>
      <text
        x={cx}
        y={ground - Math.max(height, heightOf(next)) - b - 6}
        text-anchor='middle'
        fill='var(--ink)'
        font-size='15'
        class='font-mono font-semibold'
      >
        {count}
      </text>
    </svg>
  )
}

/**
 * The five dimensions as a row of columns standing on the same ground. On
 * the full profile each one opens its proofs; on the passport they are read
 * only.
 */
export const DimensionColumns = (
  { login, readOnly }: { login: Login; readOnly?: boolean },
) => {
  const list = dimensionsOf(login)
  const scale = Math.max(...list.map((d) => Math.max(d.count, d.next)))
  // Three by row on a phone, where five columns would cut « Construction »
  // and « Mentorat » in the middle of the word
  return (
    <div class='grid grid-cols-3 gap-x-1.5 gap-y-3 sm:grid-cols-5'>
      {list.map(({ key, label, count, next, summary }) => {
        const content = (
          <>
            <DimensionColumn count={count} next={next} scale={scale} />
            <span class='text-[12px] leading-4 font-semibold text-balance'>
              {label}
            </span>
            <span class='font-mono text-[11px] leading-4 whitespace-nowrap text-ink-muted tabular-nums'>
              {/* The last level reached: nothing left to aim for */}
              {count >= next ? count : `${count} / ${next}`}
            </span>
          </>
        )
        const cell =
          'flex flex-col items-center gap-1 rounded-md px-1 pt-2 pb-2.5 text-center text-ink no-underline hover:no-underline'
        return readOnly
          ? (
            <div key={key} class={cell} title={summary}>
              {content}
            </div>
          )
          : (
            <A
              key={key}
              params={{ dialog: `proofs-${key}` }}
              aria-label={t`${translate(label)} : ${summary}. Voir les preuves`}
              title={summary}
              class={`${cell} hover:bg-surface-200`}
            >
              {content}
            </A>
          )
      })}
    </div>
  )
}

const metals = ['bronze', 'silver', 'gold', 'platinum']

/** The colour of a level, for its texts: the edge of its metal */
export const metalText = (level: number) =>
  level < 0 ? 'var(--indigo)' : `var(--metal-${metals[level]}-edge)`

// The emblem of each badge, drawn in the 64 × 64 box of the medal, centred
// on (32, 32): flat shapes outlined in ink, the thread in indigo
const emblems: Record<string, (stroke: string, fill: string) => JSX.Element> = {
  // A page of code with its check
  trusted_reviewer: (stroke, fill) => (
    <g stroke={stroke} stroke-width='1.6' stroke-linejoin='round' fill='none'>
      <rect
        x='22'
        y='19'
        width='20'
        height='26'
        rx='2'
        fill='var(--surface-100)'
      />
      <path d='M26 25h12M26 30h8M26 35h10' stroke-linecap='round' />
      <circle cx='41' cy='41' r='7' fill={fill} />
      <path
        d='M37.8 41.2l2.2 2.2 4-4.4'
        stroke='var(--on-indigo)'
        stroke-linecap='round'
      />
    </g>
  ),
  // A spark: the first to answer
  first_responder: (stroke, fill) => (
    <path
      d='M35 17L24 34h8l-3 13 11-18h-8z'
      fill={fill}
      stroke={stroke}
      stroke-width='1.6'
      stroke-linejoin='round'
    />
  ),
  // Two people, the larger one passing the thread on
  mentor: (stroke, fill) => (
    <g stroke={stroke} stroke-width='1.6'>
      <path
        d='M29 30 Q34 24 40 34'
        fill='none'
        stroke={fill}
        stroke-width='2'
      />
      <circle cx='25' cy='33' r='8' fill={fill} />
      <circle cx='41' cy='37' r='5.5' fill='var(--surface-100)' />
    </g>
  ),
  // Two branches merged into one
  open_source: (stroke, fill) => (
    <g stroke={stroke} stroke-width='1.8' fill='none' stroke-linecap='round'>
      <path d='M26 21v22M26 27c0 7 12 5 12 12v4' />
      <circle cx='26' cy='21' r='3.5' fill='var(--surface-100)' />
      <circle cx='38' cy='45' r='3.5' fill={fill} />
      <circle cx='26' cy='45' r='3.5' fill='var(--surface-100)' />
    </g>
  ),
  // Two cubes, one on the other
  builder: (stroke, fill) => {
    const lower = prism(32, 44, 11, 6.4, 11)
    const upper = prism(32, 32.6, 7, 4, 8)
    return (
      <g stroke={stroke} stroke-width='1.4' stroke-linejoin='round'>
        <polygon points={lower.left} fill='var(--surface-100)' />
        <polygon points={lower.right} fill='var(--side)' />
        <polygon points={lower.top} fill='var(--surface-100)' />
        <polygon points={upper.left} fill='var(--surface-100)' />
        <polygon points={upper.right} fill='var(--side)' />
        <polygon points={upper.top} fill={fill} />
      </g>
    )
  },
  // Months in a row: a calendar with its streak
  maintainer: (stroke, fill) => (
    <g stroke={stroke} stroke-width='1.6' stroke-linejoin='round'>
      <rect
        x='19'
        y='21'
        width='26'
        height='23'
        rx='3'
        fill='var(--surface-100)'
      />
      <path d='M19 28h26M25 18v6M39 18v6' stroke-linecap='round' />
      <path
        d='M24 38l5-4 5 3 6-6'
        fill='none'
        stroke={fill}
        stroke-width='2.2'
      />
    </g>
  ),
  // A pillar holding up the community
  community_pillar: (stroke, fill) => {
    const pillar = prism(32, 44, 7, 4, 22)
    const base = prism(32, 48, 12, 7, 4)
    return (
      <g stroke={stroke} stroke-width='1.4' stroke-linejoin='round'>
        <polygon points={base.left} fill='var(--surface-100)' />
        <polygon points={base.right} fill='var(--side)' />
        <polygon points={base.top} fill='var(--surface-100)' />
        <polygon points={pillar.left} fill='var(--surface-100)' />
        <polygon points={pillar.right} fill='var(--side)' />
        <polygon points={pillar.top} fill={fill} />
      </g>
    )
  },
  // A globe crossed by a thread
  cross_border: (stroke, fill) => (
    <g stroke={stroke} stroke-width='1.5' fill='none'>
      <circle cx='32' cy='32' r='12' fill='var(--surface-100)' />
      <ellipse cx='32' cy='32' rx='5' ry='12' />
      <path d='M20.5 28h23M20.5 36h23' />
      <path
        d='M19 39 Q32 14 45 25'
        stroke={fill}
        stroke-width='2.2'
        stroke-linecap='round'
      />
    </g>
  ),
}

/**
 * A badge as a medal, like the achievements of GitHub: a ring in the metal
 * of its level (Bronze, Silver, Gold, Platinum), the emblem of what it
 * proves, and from Silver on a « x2 » to « x4 » pill. On the way to Bronze,
 * an indigo arc shows the progress; a badge not started is dotted.
 */
export const BadgeMedal = (
  { badge, level, locked, progress = 0, size = 64 }: {
    /** Key of the badge, which picks its emblem */
    badge: string
    level: number
    /** A badge not started yet */
    locked?: boolean
    /** Share of the way to the next level, drawn while on the way to Bronze */
    progress?: number
    size?: number
  },
) => {
  const metal = level >= 0 && !locked ? metals[level] : undefined
  const ring = metal ? `var(--metal-${metal})` : 'var(--surface-200)'
  const face = metal ? `var(--metal-${metal}-soft)` : 'var(--surface-100)'
  const edge = metal ? `var(--metal-${metal}-edge)` : 'var(--line-control)'
  const stroke = locked ? 'var(--line-control)' : 'var(--ink)'
  const fill = locked ? 'var(--surface-200)' : 'var(--indigo)'
  // Arc of the progress, on the ring, from the top clockwise
  const angle = Math.min(0.999, progress) * 2 * Math.PI
  const arc = `M32 3 A29 29 0 ${angle > Math.PI ? 1 : 0} 1 ${
    (32 + 29 * Math.sin(angle)).toFixed(2)
  } ${(32 - 29 * Math.cos(angle)).toFixed(2)}`
  return (
    <svg
      width={size}
      height={size}
      viewBox='0 0 68 68'
      aria-hidden='true'
      class='flex-none overflow-visible'
    >
      {
        /* Thickness: the same disc, offset at 30°, never a blurred shadow */
      }
      {!locked && <circle cx='34.6' cy='33.5' r='31' fill={edge} />}
      <circle
        cx='32'
        cy='32'
        r='31'
        fill={ring}
        stroke={locked ? 'var(--line-control)' : 'var(--ink)'}
        stroke-width='1.2'
        stroke-dasharray={locked ? '3 2.5' : undefined}
      />
      <circle
        cx='32'
        cy='32'
        r='24'
        fill={face}
        stroke={locked ? 'var(--line-control)' : edge}
        stroke-width='1.2'
      />
      {!metal && !locked && progress > 0 && (
        <path
          d={arc}
          fill='none'
          stroke='var(--indigo)'
          stroke-width='4'
          stroke-linecap='round'
        />
      )}
      <g opacity={locked ? 0.8 : 1}>
        {(emblems[badge] ?? emblems.trusted_reviewer)(stroke, fill)}
      </g>
      {metal && level > 0 && (
        <g>
          <rect
            x='42'
            y='50'
            width='24'
            height='15'
            rx='7.5'
            fill={face}
            stroke={edge}
            stroke-width='1.2'
          />
          <text
            x='54'
            y='61'
            text-anchor='middle'
            fill={edge}
            font-size='11'
            class='font-display font-bold'
          >
            x{level + 1}
          </text>
        </g>
      )}
    </svg>
  )
}

export const levelName = (badge: Badge) =>
  badge.level < 0 ? 'En route' : levelNames[badge.level]

/**
 * Progress towards the next level, one segment per proof while they can be
 * counted at a glance; the missing ones are dotted.
 */
const Segments = (
  { count, next, label }: { count: number; next: number; label: string },
) =>
  next > 25 ? <Progress value={count} max={next} label={label} thin /> : (
    <span
      role='progressbar'
      aria-label={label}
      aria-valuenow={count}
      aria-valuemax={next}
      class='flex gap-[3px]'
    >
      {Array.from({ length: next }, (_, i) => (
        <span
          key={i}
          class={`h-2 flex-1 rounded-[2px] ${
            i < count
              ? 'border border-indigo-edge bg-indigo'
              : 'border border-dashed border-indigo bg-surface-100'
          }`}
        />
      ))}
    </span>
  )

// The action that makes a badge grow: helping, contributing, building
const actions: Record<string, [string, string]> = {
  trusted_reviewer: ['help', 'Voir les demandes de review'],
  first_responder: ['help', 'Voir les demandes d’aide'],
  mentor: ['help', 'Voir les demandes de mentorat'],
  open_source: ['explore/work', 'Trouver où contribuer'],
  builder: ['projects', 'Créer un projet'],
  cross_border: ['explore', 'Trouver des développeurs'],
  maintainer: ['projects', 'Voir mes projets'],
  community_pillar: ['communities', 'Répondre dans les communautés'],
}

/**
 * The next level within reach, put forward: what is missing, when the
 * current level was unlocked and, on one's own profile, where to earn it.
 */
const NextLevel = ({ login, badge }: { login: Login; badge: Badge }) => {
  const unlock = unlockOf(login, badge)
  const [href, label] = actions[badge.key] ?? actions.cross_border
  return (
    <div class='slab-selected flex flex-wrap items-center gap-x-5 gap-y-3 p-4'>
      <BadgeMedal
        badge={badge.key}
        level={badge.level}
        progress={badge.count / badge.next!}
        size={72}
      />
      <div class='flex min-w-[220px] flex-1 flex-col gap-1.5'>
        <span class='font-mono text-[11px] leading-[18px] font-medium tracking-[.06em] text-indigo uppercase'>
          {t`Prochain palier · ${translate(levelNames[badge.level + 1])}`}
        </span>
        <span class='font-display text-[19px] leading-6 font-bold'>
          {badge.name}
        </span>
        <Segments count={badge.count} next={badge.next!} label={badge.name} />
        <span class='flex flex-wrap justify-between gap-x-3 gap-y-1 text-[12px] text-ink-muted'>
          <span>
            {badge.nextLabel}
            {unlock && (
              ` · ${t`${translate(levelNames[badge.level])} débloqué ${
                ago(unlock.at)
              }`}${
                unlock.pullRequest ? t` avec la PR #${unlock.pullRequest}` : ''
              }`
            )}
          </span>
          <span class='font-mono text-[13px] leading-4 font-medium text-ink'>
            {badge.count} / {badge.next}
          </span>
        </span>
      </div>
      {isMe(login) && <Button href={href} size={38}>{label}</Button>}
    </div>
  )
}

const tileClass =
  'flex flex-col items-center gap-1.5 rounded-md px-3 pt-3.5 pb-3 text-center text-ink no-underline hover:no-underline'

const BadgeTile = ({ badge }: { badge: Badge }) => {
  const content = (
    <>
      <BadgeMedal
        badge={badge.key}
        level={badge.level}
        progress={badge.next ? badge.count / badge.next : 1}
      />
      <span class='text-[13px] leading-[17px] font-semibold text-balance'>
        {badge.name}
      </span>
      <span
        class='font-mono text-[11px] leading-4 font-medium tracking-[.06em] uppercase'
        style={{ color: metalText(badge.level) }}
      >
        {levelName(badge)}
      </span>
      <span class='font-mono text-[12px] leading-4 text-ink-muted tabular-nums'>
        {badge.next ? `${badge.count} / ${badge.next}` : badge.count}
      </span>
    </>
  )
  return badge.dimension
    ? (
      <A
        params={{ dialog: `proofs-${badge.dimension}` }}
        aria-label={t`Voir les preuves du badge ${translate(badge.name)}`}
        class={`${tileClass} tile slab-lift`}
      >
        {content}
      </A>
    )
    : <div class={`${tileClass} tile`}>{content}</div>
}

const LockedTile = ({ badge }: { badge: LockedBadge }) => (
  <div class={`${tileClass} border border-dashed border-line-control`}>
    <BadgeMedal badge={badge.key} level={-1} locked />
    <span class='text-[13px] leading-[17px] font-semibold text-ink-muted text-balance'>
      {badge.name}
    </span>
    <span class='text-[12px] leading-4 text-ink-muted text-balance'>
      {badge.hint}
    </span>
  </div>
)

/**
 * Badges as a showcase (§8.2): the next level within reach first, then every
 * badge as a stack of plates, those on the way and those still to discover.
 * Each badge opens its proofs.
 */
export const BadgeShowcase = ({ login }: { login: Login }) => {
  const badges = [...badgesOf(login)]
    .sort((a, b) => b.level - a.level || b.count - a.count)
  const locked = lockedBadgesOf(login)
  const next = nextBadgeOf(login)
  const unlocked = badges.filter((b) => b.level >= 0).length
  const onTheWay = badges.length - unlocked
  return (
    <section class='slab flex flex-col gap-4 p-[22px]'>
      <div class='flex flex-wrap items-baseline justify-between gap-3'>
        <Eyebrow>Badges</Eyebrow>
        <span class='text-[13px] text-ink-muted'>
          {[
            counted(unlocked, 'débloqué'),
            onTheWay && counted(onTheWay, 'en route', 'en route'),
            locked.length &&
            counted(locked.length, 'à découvrir', 'à découvrir'),
          ].filter(Boolean).join(' · ')}
        </span>
      </div>
      {next && <NextLevel login={login} badge={next} />}
      <div class='grid grid-cols-2 gap-3 sm:grid-cols-3'>
        {badges.map((badge) => <BadgeTile key={badge.key} badge={badge} />)}
        {locked.map((badge) => <LockedTile key={badge.key} badge={badge} />)}
      </div>
      <span class='text-[12px] text-ink-muted'>
        L’anneau dit le niveau : Bronze, Argent, Or, Platine. En route vers le
        Bronze, l’arc indigo montre le chemin parcouru.
      </span>
    </section>
  )
}

/** The three highest badges, for the passport */
export const BadgeList = ({ login }: { login: Login }) => (
  <>
    {[...badgesOf(login)]
      .sort((a, b) => b.level - a.level || b.count - a.count)
      .slice(0, 3)
      .map((badge) => (
        <div key={badge.key} class='flex items-center gap-3'>
          <BadgeMedal
            badge={badge.key}
            level={badge.level}
            progress={badge.next ? badge.count / badge.next : 1}
            size={40}
          />
          <span class='flex min-w-0 flex-1 flex-col gap-[5px]'>
            <span class='flex items-center justify-between gap-2 text-[14px]'>
              <span class='font-semibold'>{badge.name}</span>
              <span
                class='font-mono text-[11px] leading-[18px] font-medium tracking-[.06em] uppercase'
                style={{ color: metalText(badge.level) }}
              >
                {levelName(badge)}
              </span>
            </span>
            <Progress
              value={badge.count}
              max={badge.next ?? badge.count}
              label={badge.name}
              thin
            />
          </span>
        </div>
      ))}
  </>
)
