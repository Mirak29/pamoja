import type { ComponentChildren, JSX } from 'preact'
import {
  Check,
  CircleCheck,
  CircleDot,
  CircleSlash,
  CircleX,
  Clock,
  GitMerge,
  GitPullRequest,
  MessageSquareText,
  PackageCheck,
  ShieldCheck,
  UserCheck,
  X,
} from '/web/assets/icons.tsx'

const tones = {
  indigo: 'border-indigo bg-indigo-soft text-indigo',
  warning: 'border-warning bg-warning-soft text-warning',
  verified: 'border-verified bg-verified-soft text-verified',
  danger: 'border-danger bg-danger-soft text-danger',
  muted: 'border-line-control text-ink-muted',
} as const

type Tone = keyof typeof tones
type IconComponent = (props: JSX.IntrinsicElements['svg']) => JSX.Element

const pill =
  'inline-flex items-center gap-1 h-[22px] px-2 rounded-sm border font-mono text-[11px] leading-none font-medium tracking-[.06em] uppercase whitespace-nowrap'

/** A state is never carried by color alone: a word and an icon go with it */
const statuses = {
  open: ['Ouverte', CircleDot, 'indigo'],
  accepted: ['Acceptée', UserCheck, 'indigo'],
  review_submitted: ['Review soumise', GitPullRequest, 'warning'],
  delivered: ['Livrée', PackageCheck, 'warning'],
  completed: ['Terminée', CircleCheck, 'verified'],
  expired: ['Expirée', Clock, 'muted'],
  closed_unhelpful: ['Fermée', CircleSlash, 'muted'],
  closed_unconfirmed: ['Fermée', CircleSlash, 'muted'],
  cancelled: ['Annulée', X, 'muted'],
  'ci-ok': ['CI au vert', CircleCheck, 'verified'],
  'ci-failed': ['CI en échec', CircleX, 'danger'],
  'review-waiting': ['En attente de review', Clock, 'warning'],
  'review-received': ['Review reçue', MessageSquareText, 'verified'],
  'review-approved': ['Approuvée', Check, 'verified'],
  merged: ['Mergée', GitMerge, 'indigo'],
} as const satisfies Record<string, [string, IconComponent, Tone]>

export type Status = keyof typeof statuses

/**
 * State of a help request, a CI run or a review.
 *
 * @example
 * <StatusBadge status='review_submitted' />
 * <StatusBadge status='ci-failed' />
 */
export const StatusBadge = ({ status }: { status: Status }) => {
  const [label, Icon, tone] = statuses[status]
  return (
    <span class={`${pill} ${tones[tone]}`}>
      <Icon class='size-3' />
      {label}
    </span>
  )
}

/** Solid line: the proof comes from a real GitHub action */
export const VerifiedBadge = () => (
  <span class={`${pill} ${tones.verified}`}>
    <ShieldCheck class='size-3' />
    Vérifié par GitHub
  </span>
)

/** Dashed line: demonstration data, never confused with a real proof */
export const DemoBadge = () => (
  <span class={`${pill} border-dashed ${tones.muted}`}>Donnée de démo</span>
)

/**
 * A skill, highlighted when the viewer has it.
 *
 * @example
 * <SkillChip match>Go</SkillChip>
 */
export const SkillChip = (
  { match, children }: { match?: boolean; children: ComponentChildren },
) => (
  <span
    class={`inline-flex items-center h-6 px-2 rounded-sm text-[13px] leading-none font-medium whitespace-nowrap ${
      match ? 'bg-indigo-soft text-indigo' : 'bg-surface-200 text-ink'
    }`}
  >
    {children}
  </span>
)
