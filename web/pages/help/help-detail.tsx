import type { ComponentChildren } from 'preact'
import { useState } from 'preact/hooks'
import { A } from '@01edu/signal-router'
import {
  ChevronDown,
  ChevronUp,
  CircleCheck,
  Clock,
  Flag,
  Info,
  PackageCheck,
  RotateCcw,
  UserCheck,
  UserMinus,
  X,
} from '/web/assets/icons.tsx'
import {
  actOnHelp,
  type HelpAction,
  helpChanged,
  type HelpRequest,
  helpRequests,
  type HelpStatus,
} from '/web/fixtures/help.ts'
import { type Matched, waves } from '/web/fixtures/matching.ts'
import { isMe, me, people } from '/web/fixtures/people.ts'
import { projects } from '/web/fixtures/projects.ts'
import { ago } from '/web/lib/time.ts'
import { BranchLine } from '/web/pages/help/new-help.tsx'
import { Avatar } from '/web/ui/avatar.tsx'
import {
  DemoBadge,
  SkillChip,
  StatusBadge,
  statusLabel,
  VerifiedBadge,
} from '/web/ui/badge.tsx'
import { Button, type ButtonVariant } from '/web/ui/button.tsx'
import { Eyebrow } from '/web/ui/eyebrow.tsx'
import { Page } from '/web/ui/layout.tsx'
import { Cube } from '/web/ui/shapes.tsx'
import { EmptyState, GhostSlab } from '/web/ui/states.tsx'
import { notify } from '/web/ui/toast.tsx'

const firstName = (login: keyof typeof people) =>
  people[login].name.split(' ')[0]

const exits: HelpStatus[] = [
  'expired',
  'closed_unhelpful',
  'closed_unconfirmed',
  'cancelled',
]

const exitLabels: Partial<Record<HelpStatus, string>> = {
  expired: 'Expirée : 7 jours sans acceptation',
  closed_unhelpful: 'Fermée : aide jugée pas utile',
  closed_unconfirmed: 'Fermée : non confirmée sous 7 jours',
  cancelled: 'Annulée',
}

const actionIcons: Record<HelpAction, typeof UserCheck> = {
  accept: UserCheck,
  later: Clock,
  withdraw: UserMinus,
  release: RotateCcw,
  cancel: X,
  reopen: RotateCcw,
  deliver: PackageCheck,
  confirm: CircleCheck,
  decline: Info,
}

const play = (request: HelpRequest, action: HelpAction) => {
  const { title, body, tone } = actOnHelp(request, action)
  notify({ title, body, tone, icon: actionIcons[action] })
}

/** Open, accepted, review submitted or delivered, completed (§7.2) */
const Lifecycle = ({ request }: { request: HelpRequest }) => {
  const third: HelpStatus = request.pullRequest ||
      request.type === 'Review de code'
    ? 'review_submitted'
    : 'delivered'
  const order: HelpStatus[] = ['open', 'accepted', third, 'completed']
  const exit = exits.includes(request.status)
  const current = !exit ? order.indexOf(request.status) : request.status ===
      'expired'
    ? 0
    : request.status === 'cancelled'
    ? request.helper ? 1 : 0
    : 2
  const helper = request.helper && firstName(request.helper)
  const stateLine = request.status === 'accepted'
    ? `Acceptée par ${helper} ${ago(request.acceptedAt ?? request.at)}`
    : request.status === 'review_submitted'
    ? `Review de ${helper} détectée ${ago(request.at)}`
    : request.status === 'completed'
    ? 'Confirmée'
    : request.status === 'delivered'
    ? `Livrée par ${helper}`
    : `Publiée ${ago(request.at)}`
  return (
    <section class='slab flex flex-col gap-4 p-[22px]'>
      <Eyebrow>Cycle de vie</Eyebrow>
      <div class='flex items-start'>
        {order.map((status, i) => {
          const done = i < current ||
            (i === current && request.status === 'completed')
          const active = i === current && !exit &&
            request.status !== 'completed'
          return (
            <div key={status} class='flex min-w-0 flex-1 flex-col gap-2.5'>
              <div class='flex items-center'>
                <svg
                  width='30'
                  height='18'
                  viewBox='0 0 30 18'
                  aria-hidden='true'
                  class='flex-none overflow-visible'
                >
                  <polygon
                    points='15,1 29,9 15,17 1,9'
                    fill={done
                      ? 'var(--indigo)'
                      : active
                      ? 'var(--indigo-soft)'
                      : 'var(--surface-100)'}
                    stroke={done || active
                      ? 'var(--indigo)'
                      : 'var(--line-control)'}
                    stroke-width='1.3'
                    stroke-dasharray={done || active ? '0' : '3 2'}
                    stroke-linejoin='round'
                  />
                </svg>
                {i < order.length - 1 && (
                  <span
                    class={`mx-1.5 flex-1 border-t-[1.5px] ${
                      i < current
                        ? 'border-indigo'
                        : 'border-dashed border-line-control'
                    }`}
                  />
                )}
              </div>
              <span
                class={`pr-2 text-[13px] leading-[18px] ${
                  done || active ? 'text-ink' : 'text-ink-muted'
                } ${active ? 'font-semibold' : ''}`}
              >
                {statusLabel(status)}
              </span>
            </div>
          )
        })}
      </div>
      <span class='text-[14px] text-ink-muted'>{stateLine}</span>
      {exit && (
        <span class='inline-flex h-6 items-center self-start rounded-sm border border-dashed border-line-control px-2 text-[13px] text-ink-muted'>
          {exitLabels[request.status]}
        </span>
      )}
    </section>
  )
}

type Action = {
  label: string
  variant: ButtonVariant
  action?: HelpAction
  href?: string
  hint?: string
  disabled?: boolean
}

// What the viewer can do depends on their role and on the state (§7.2)
const promptOf = (
  request: HelpRequest,
  notified: Matched[],
): [string, Action[]] => {
  const helper = request.helper && firstName(request.helper)
  const { status } = request
  if (isMe(request.author)) {
    if (status === 'open') {
      return [
        `La demande a été envoyée à ${notified.length} développeurs. Tu seras notifié dès que l’un d’eux accepte.`,
        [{
          label: 'Annuler la demande',
          variant: 'danger',
          action: 'cancel',
        }],
      ]
    }
    if (status === 'accepted') {
      return [
        `Acceptée par ${helper}. ${
          request.pullRequest
            ? 'Pamoja détectera automatiquement sa review sur GitHub.'
            : 'Tu seras notifié quand l’aide sera livrée.'
        }`,
        [
          {
            label: 'Libérer la demande',
            variant: 'secondary',
            action: 'release',
            disabled: true,
            hint: 'Possible après 72 h sans activité de l’aidant.',
          },
          { label: 'Annuler', variant: 'danger', action: 'cancel' },
        ],
      ]
    }
    if (status === 'review_submitted' || status === 'delivered') {
      return ['Cette aide t’a été utile ?', [
        { label: 'Oui, elle m’a aidé', variant: 'primary', action: 'confirm' },
        { label: 'Non', variant: 'secondary', action: 'decline' },
      ]]
    }
    if (status === 'completed') {
      return [
        `Aide confirmée. Une preuve a été ajoutée au profil de ${helper}.`,
        [{
          label: `Voir le profil de ${helper}`,
          variant: 'secondary',
          href: `@${request.helper}`,
        }],
      ]
    }
    if (status === 'cancelled') return ['Cette demande a été annulée.', []]
    return ['Tu peux rouvrir la demande avec les mêmes données.', [
      { label: 'Rouvrir', variant: 'primary', action: 'reopen' },
    ]]
  }
  if (request.helper && isMe(request.helper)) {
    if (status === 'accepted') {
      return [
        request.pullRequest
          ? 'Tu as accepté. Fais ta review sur GitHub : Pamoja la détectera.'
          : 'Tu as accepté. Marque l’aide comme livrée quand c’est fait.',
        [
          request.pullRequest && request.project
            ? {
              label: `Ouvrir la PR #${request.pullRequest} sur GitHub`,
              variant: 'primary',
              href: `https://github.com/${
                projects[request.project].owner
              }/${request.project}/pull/${request.pullRequest}`,
            }
            : {
              label: 'Marquer comme livrée',
              variant: 'primary',
              action: 'deliver',
            },
          { label: 'Se désister', variant: 'danger', action: 'withdraw' },
        ],
      ]
    }
    if (status === 'review_submitted' || status === 'delivered') {
      return [
        `Ta contribution est détectée. En attente de la confirmation de ${
          firstName(request.author)
        }.`,
        [],
      ]
    }
    if (status === 'completed') {
      return [
        `${
          firstName(request.author)
        } a confirmé ton aide. La preuve est sur ton profil.`,
        [{
          label: 'Voir mon profil',
          variant: 'secondary',
          href: `@${me.login}`,
        }],
      ]
    }
  }
  if (status === 'open') {
    const inWave = notified.some((m) => isMe(m.login))
    return [
      inWave
        ? 'Tu fais partie des développeurs notifiés pour cette demande.'
        : 'Cette demande est ouverte.',
      [
        { label: 'Accepter', variant: 'primary', action: 'accept' },
        ...(inWave
          ? [
            {
              label: 'Plus tard',
              variant: 'secondary',
              action: 'later',
            } as const,
          ]
          : []),
      ],
    ]
  }
  if (helper) return [`Déjà prise par ${helper}.`, []]
  return [exitLabels[status] ?? '', []]
}

const Prompt = (
  { request, notified }: { request: HelpRequest; notified: Matched[] },
) => {
  const [prompt, actions] = promptOf(request, notified)
  if (!prompt) return null
  return (
    <section class='slab-selected flex flex-col gap-3.5 p-[22px]'>
      <span class='font-display text-[18px] leading-[25px] font-semibold'>
        {prompt}
      </span>
      {actions.length > 0 && (
        <div class='flex flex-wrap items-center gap-3.5 pb-1'>
          {actions.map(({ label, variant, action, href, disabled }) => (
            <Button
              key={label}
              variant={variant}
              disabled={disabled}
              href={href}
              onClick={action && (() => play(request, action))}
            >
              {label}
            </Button>
          ))}
        </div>
      )}
      {actions.filter((a) => a.hint).map(({ hint }) => (
        <span key={hint} class='text-[12px] text-ink-muted'>{hint}</span>
      ))}
    </section>
  )
}

const Section = (
  { title, children }: { title: string; children: ComponentChildren },
) => (
  <section class='slab flex flex-col gap-3.5 p-[22px]'>
    <Eyebrow>{title}</Eyebrow>
    {children}
  </section>
)

const MatchRow = (
  { request, matched, open: initiallyOpen }: {
    request: HelpRequest
    matched: Matched
    open: boolean
  },
) => {
  const [open, setOpen] = useState(initiallyOpen)
  const person = people[matched.login]
  const status = request.helper === matched.login
    ? 'A accepté'
    : request.withdrawn?.includes(matched.login)
    ? 'S’est désisté'
    : 'Notifié'
  return (
    <div class='flex flex-col gap-2 border-t border-line py-3.5'>
      <div class='flex items-center gap-3'>
        <A
          href={`@${matched.login}`}
          class='flex min-w-0 flex-1 items-center gap-3 text-ink no-underline hover:no-underline'
        >
          <Avatar name={person.name} size={34} />
          <span class='flex min-w-0 flex-col'>
            <span class='font-display text-[14px] leading-5 font-semibold'>
              {person.name}
            </span>
            <span class='text-[12px] leading-4 text-ink-muted'>{status}</span>
          </span>
        </A>
        <span class='tile flex h-[30px] min-w-11 items-center justify-center rounded-[5px] px-2 font-mono text-[14px] leading-5 font-medium tabular-nums'>
          {matched.score}
        </span>
      </div>
      {matched.promising && (
        <span class='inline-flex h-[22px] items-center gap-1.5 self-start rounded-sm border border-dashed border-indigo px-2 font-mono text-[11px] leading-none font-medium tracking-[.06em] text-indigo uppercase'>
          <span
            aria-hidden='true'
            class='diamond size-1.5 border border-current'
          />
          Nouveau profil prometteur
        </span>
      )}
      <button
        type='button'
        onClick={() => setOpen(!open)}
        aria-expanded={open}
        class='inline-flex cursor-pointer items-center gap-1 self-start p-0 font-mono text-label text-indigo uppercase'
      >
        Pourquoi ce match ?
        {open
          ? <ChevronUp class='size-3.5' />
          : <ChevronDown class='size-3.5' />}
      </button>
      {open && (
        <ul class='flex flex-col gap-1.5 rounded-md border border-line-strong bg-surface-000 px-3 py-2.5 inset-shadow-well'>
          {matched.criteria.map(({ label, points }) => (
            <li
              key={label}
              class='flex justify-between gap-2 text-[13px] leading-[18px]'
            >
              <span class='flex items-center gap-2'>
                <span aria-hidden='true' class='diamond size-1.5 bg-indigo' />
                {label}
              </span>
              <span class='font-mono text-[13px] leading-[18px] font-medium text-indigo'>
                +{points}
              </span>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}

const Matching = (
  { request, notified, next }: {
    request: HelpRequest
    notified: Matched[]
    next: Matched[]
  },
) => {
  const secondWave = (request.wave ?? 1) > 1
  return (
    <aside class='slab flex min-w-0 flex-col gap-2 p-[22px]'>
      <Eyebrow accent>Matching</Eyebrow>
      <span class='font-display text-[18px] leading-[25px] font-semibold'>
        Vague 1 · {notified.length} développeurs notifiés
      </span>
      <span class='text-[12px] leading-[18px] text-ink-muted'>
        Score sur 100 : skills 45, type d’aide 15, aides confirmées 15,
        proximité 10, disponibilité 10, affinité 5.
      </span>
      <div class='flex flex-col'>
        {notified.map((m, i) => (
          <MatchRow key={m.login} request={request} matched={m} open={!i} />
        ))}
      </div>
      <span class='border-t border-line pt-3.5'>
        <Eyebrow>Vague 2</Eyebrow>
      </span>
      {secondWave && next.length > 0 && (
        <div class='flex flex-col'>
          {next.map((m) => (
            <MatchRow
              key={m.login}
              request={request}
              matched={m}
              open={false}
            />
          ))}
        </div>
      )}
      {!(secondWave && next.length) && (
        <span class='text-[13px] text-ink-muted'>
          {secondWave
            ? 'Aucun autre développeur correspondant pour l’instant.'
            : 'Vague 2 dans 2 h si personne n’accepte.'}
        </span>
      )}
    </aside>
  )
}

/** /aide/:id: lifecycle, actions by role and the matching panel */
export const HelpDetail = ({ id }: { id: string }) => {
  helpChanged.value
  const request = helpRequests.find((h) => h.id === id)
  if (!request) {
    return (
      <Page title='Demande introuvable' class='pt-5'>
        <GhostSlab>
          <EmptyState
            action={<Button href='aide'>Voir les demandes d’aide</Button>}
          >
            Cette demande d’aide n’existe pas ou a été supprimée.
          </EmptyState>
        </GhostSlab>
      </Page>
    )
  }
  const [notified, next] = waves(request)
  const project = request.project && projects[request.project]
  const verified = request.log?.some((entry) => entry.verified)
  return (
    <Page
      title={request.title}
      class='mr-2 grid items-start gap-8 pt-5 lg:grid-cols-[minmax(0,2fr)_minmax(0,1fr)]'
    >
      <div class='flex min-w-0 flex-col gap-7'>
        <div class='flex flex-col gap-2.5'>
          <Eyebrow>Aide / {request.type}</Eyebrow>
          <h1 class='font-display text-[30px] leading-9 font-bold tracking-[-.015em] text-pretty'>
            {request.title}
          </h1>
          <div class='flex flex-wrap items-center gap-2'>
            <StatusBadge status={request.status} />
            {verified && <VerifiedBadge />}
            {request.demo && <DemoBadge />}
            {project && (
              <A
                href={`projet/${project.slug}`}
                class='inline-flex items-center gap-1.5 text-[14px] font-semibold'
              >
                <Cube size={18} />
                {project.name}
              </A>
            )}
            {project && request.pullRequest && (
              <A
                href={`projet/${project.slug}/prs`}
                class='font-mono text-[14px] leading-5 font-medium'
              >
                PR #{request.pullRequest}
              </A>
            )}
          </div>
          <div class='flex flex-wrap items-center gap-2.5 text-[13px] text-ink-muted'>
            <A
              href={`@${request.author}`}
              class='flex items-center gap-2 font-semibold text-ink no-underline hover:no-underline'
            >
              <Avatar name={people[request.author].name} size={26} />
              {people[request.author].name}
            </A>
            <span>
              {ago(request.at)} · {request.level} · {request.duration}
            </span>
            {!isMe(request.author) && (
              // The report dialog comes with PAM-516
              <A
                params={{ dialog: 'report', report: `help:${request.id}` }}
                title='Signaler'
                class='inline-flex h-[26px] items-center gap-1 rounded-md px-2 text-[12px] leading-none font-medium text-ink-muted no-underline hover:bg-danger-soft hover:text-danger hover:no-underline'
              >
                <Flag class='size-3' />
                Signaler
              </A>
            )}
          </div>
        </div>
        <Lifecycle request={request} />
        <Prompt request={request} notified={notified} />
        <Section title='Description'>
          <p class='whitespace-pre-wrap text-pretty'>
            {request.description || 'Pas de description détaillée.'}
          </p>
          <div class='flex flex-wrap gap-1.5'>
            {request.skills.map((skill) => (
              <SkillChip key={skill} match={me.skills.includes(skill)}>
                {skill}
              </SkillChip>
            ))}
          </div>
          {request.branch && (
            <BranchLine branch={request.branch} job={request.job} />
          )}
          {!!request.captures?.length && (
            <div class='grid grid-cols-4 gap-3.5'>
              {request.captures.map((capture, i) => (
                <div
                  key={capture}
                  class='flex aspect-[4/3] items-end rounded-md border border-figure-edge bg-surface-000 bg-cover bg-center p-1.5 shadow-tile'
                  style={{ backgroundImage: `url(${capture})` }}
                >
                  <span class='rounded-sm bg-surface-100 px-1 py-px font-mono text-[10px] leading-[14px] font-medium text-ink-muted'>
                    capture-{i + 1}.png
                  </span>
                </div>
              ))}
            </div>
          )}
        </Section>
        <section class='slab overflow-hidden'>
          <div class='flex px-5 pt-[18px] pb-4'>
            <Eyebrow>Historique</Eyebrow>
          </div>
          {[...(request.log ?? [{ text: 'Demande publiée', at: request.at }])]
            .reverse()
            .map((entry) => (
              <div
                key={`${entry.text}${entry.at}`}
                class='flex flex-wrap items-center gap-3 border-t border-line px-5 py-[11px]'
              >
                <span
                  aria-hidden='true'
                  class='diamond size-[7px] border border-indigo'
                />
                <span class='min-w-[180px] flex-1 text-[14px]'>
                  {entry.text}
                </span>
                <span class='text-[12px] text-ink-muted'>{ago(entry.at)}</span>
                {entry.verified && <VerifiedBadge />}
              </div>
            ))}
        </section>
      </div>
      <Matching request={request} notified={notified} next={next} />
    </Page>
  )
}
