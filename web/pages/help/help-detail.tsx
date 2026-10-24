import type { ComponentChildren } from 'preact'
import { useEffect, useState } from 'preact/hooks'
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
  type HelpMessage,
  type HelpRequest,
  helpRequests,
  type HelpStatus,
  sendHelpMessage,
} from '/web/fixtures/help.ts'
import { match, type Matched, waves } from '/web/fixtures/matching.ts'
import { isMe, type Login, me, personOf } from '/web/fixtures/people.ts'
import { projects } from '/web/fixtures/projects.ts'
import { githubUrl } from '/web/lib/links.ts'
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
import { Textarea } from '/web/ui/input.tsx'
import { Page } from '/web/ui/layout.tsx'
import { Markdown } from '/web/ui/rich-text.tsx'
import { Cube } from '/web/ui/shapes.tsx'
import { EmptyState, GhostSlab, LoadingState } from '/web/ui/states.tsx'
import { notify } from '/web/ui/toast.tsx'
import { t } from '/web/lib/language.ts'
import { retryAfterOf } from '/web/lib/api.ts'
import { waitLabel } from '/web/lib/messages.ts'
import { loadHelpDetail, playOnServer, sendOnServer } from '/web/lib/help.ts'
import { useEvent } from '/web/lib/realtime.ts'
import { counted } from '/web/lib/plural.ts'
import { LIMITS } from '/api/limits.ts'

const firstName = (login: string) => personOf(login).name.split(' ')[0]

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

// A demo request plays in the page; a real one on the server (§7.2)
const play = async (request: HelpRequest, action: HelpAction) => {
  const { title, body, tone } = request.demo
    ? actOnHelp(request, action)
    : await playOnServer(request, action) ?? { title: '', tone: 'muted' }
  title && notify({ title, body, tone, icon: actionIcons[action] })
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
    ? t`Acceptée par ${helper} ${ago(request.acceptedAt ?? request.at)}`
    : request.status === 'review_submitted'
    ? t`Review de ${helper} détectée ${ago(request.at)}`
    : request.status === 'completed'
    ? 'Confirmée'
    : request.status === 'delivered'
    ? t`Livrée par ${helper}`
    : t`Publiée ${ago(request.at)}`
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
  /** Asked before the action is played */
  confirm?: { question: string; label: string; cancel: string }
  /** Id of the field this button focuses */
  focus?: string
}

// The requester and the helper talk in the thread of the request (§7.2)
const contactOf = (other: Login): Action => ({
  label: t`Écrire à ${firstName(other)}`,
  variant: 'secondary',
  focus: 'help-thread-input',
})

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
        notified.length
          ? t`La demande a été envoyée à ${
            counted(notified.length, 'développeur')
          }. Tu seras notifié dès que l’un d’eux accepte.`
          : 'Aucun développeur ne dépasse le score minimum pour l’instant. La demande reste visible dans Aide.',
        [{
          label: 'Annuler la demande',
          variant: 'danger',
          action: 'cancel',
        }],
      ]
    }
    if (status === 'accepted') {
      return [
        request.pullRequest
          ? t`Acceptée par ${helper}. Pamoja détectera automatiquement sa review sur GitHub.`
          : t`Acceptée par ${helper}. Tu seras notifié quand l’aide sera livrée.`,
        [
          contactOf(request.helper!),
          {
            label: 'Libérer la demande',
            variant: 'secondary',
            action: 'release',
            // 72 h after the last activity of the helper, said by the server
            disabled: request.demo || !request.releasableAt ||
              request.releasableAt > Date.now(),
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
        t`Aide confirmée. Une preuve a été ajoutée au profil de ${helper}.`,
        [{
          label: t`Voir le profil de ${helper}`,
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
              label: t`Ouvrir la PR #${request.pullRequest} sur GitHub`,
              variant: 'primary',
              href: githubUrl(
                projects[request.project],
                'pull',
                request.pullRequest,
              ),
            }
            : {
              label: 'Marquer comme livrée',
              variant: 'primary',
              action: 'deliver',
            },
          contactOf(request.author),
          {
            label: 'Se désister',
            variant: 'danger',
            action: 'withdraw',
            confirm: {
              question: t`Te désister ? La demande repasse en Ouverte et ${
                firstName(request.author)
              } est prévenu. Tu ne la recevras plus.`,
              label: 'Me désister',
              cancel: 'Garder la demande',
            },
          },
        ],
      ]
    }
    if (status === 'review_submitted' || status === 'delivered') {
      return [
        t`Ta contribution est détectée. En attente de la confirmation de ${
          firstName(request.author)
        }.`,
        [],
      ]
    }
    if (status === 'completed') {
      return [
        t`${
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
  if (status === 'open' && request.withdrawn?.some(isMe)) {
    return [
      'Tu t’es désisté de cette demande. Elle est proposée à d’autres développeurs.',
      [],
    ]
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
  if (helper) return [t`Déjà prise par ${helper}.`, []]
  return [exitLabels[status] ?? '', []]
}

const Prompt = (
  { request, notified }: { request: HelpRequest; notified: Matched[] },
) => {
  const [confirming, setConfirming] = useState<Action | null>(null)
  // One action at a time: the button stays busy until the server answers
  const [busy, setBusy] = useState<HelpAction | null>(null)
  const run = async (action: HelpAction) => {
    if (busy) return
    setBusy(action)
    try {
      await play(request, action)
    } finally {
      setBusy(null)
    }
  }
  // The question takes the place of the buttons: focus its safe answer
  useEffect(() => {
    confirming && document.getElementById('help-confirm-cancel')?.focus()
  }, [confirming])
  const [prompt, actions] = promptOf(request, notified)
  if (!prompt) return null
  if (confirming?.confirm) {
    const { question, label, cancel } = confirming.confirm
    return (
      <section class='slab-selected flex flex-col gap-3.5 p-[22px]'>
        <span class='font-display text-[18px] leading-[25px] font-semibold'>
          {question}
        </span>
        <div class='flex flex-wrap items-center gap-3.5 pb-1'>
          <Button
            variant='danger'
            aria-busy={busy === confirming.action}
            onClick={async () => {
              await run(confirming.action!)
              setConfirming(null)
            }}
          >
            {label}
          </Button>
          <Button
            variant='secondary'
            id='help-confirm-cancel'
            onClick={() => setConfirming(null)}
          >
            {cancel}
          </Button>
        </div>
      </section>
    )
  }
  return (
    <section class='slab-selected flex flex-col gap-3.5 p-[22px]'>
      <span class='font-display text-[18px] leading-[25px] font-semibold'>
        {prompt}
      </span>
      {actions.length > 0 && (
        <div class='flex flex-wrap items-center gap-3.5 pb-1'>
          {actions.map((item) => (
            <Button
              key={item.label}
              variant={item.variant}
              disabled={item.disabled}
              aria-busy={!!item.action && busy === item.action}
              href={item.href}
              onClick={item.focus
                ? () => document.getElementById(item.focus!)?.focus()
                : item.action &&
                  (() =>
                    item.confirm ? setConfirming(item) : run(item.action!))}
            >
              {item.label}
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

const closed: HelpStatus[] = [
  'completed',
  'closed_unhelpful',
  'closed_unconfirmed',
  'cancelled',
  'expired',
]

/**
 * Thread of the request: only the requester and the accepted helper see it
 * and write in it; it stays readable once the request is closed (§7.2)
 */
const HelpThread = (
  { request, messages, other, open }: {
    request: HelpRequest
    messages: HelpMessage[]
    other: Login
    open: boolean
  },
) => {
  const [draft, setDraft] = useState('')
  const [sending, setSending] = useState(false)
  const send = async () => {
    const text = draft.trim()
    if (!text || sending) return
    if (request.demo) {
      sendHelpMessage(request, me.login, text)
      setDraft('')
      return
    }
    setSending(true)
    try {
      await sendOnServer(request, text)
      setDraft('')
    } catch (err) {
      // The draft stays in its field either way
      const wait = retryAfterOf(err)
      notify({
        title: wait ? 'Tu écris trop vite' : 'Message non envoyé',
        body: wait
          ? t`Réessaie ${waitLabel(wait)}. Ton texte est gardé.`
          : 'Pamoja n’a pas pu joindre le serveur. Réessaie dans un instant.',
        icon: Info,
        tone: wait ? 'warning' : 'danger',
      })
    } finally {
      setSending(false)
    }
  }
  return (
    <section class='slab flex flex-col gap-3.5 p-[22px]'>
      <div class='flex flex-wrap items-baseline justify-between gap-2'>
        <Eyebrow>Fil avec {personOf(other).name}</Eyebrow>
        <span class='text-[12px] text-ink-muted'>
          Visible par vous deux seulement
        </span>
      </div>
      {messages.map((message) => (
        <div
          key={`${message.at}${message.author}`}
          class='flex animate-enter-fast gap-3'
        >
          <Avatar
            name={personOf(message.author).name}
            src={personOf(message.author).avatarUrl}
            size={30}
          />
          <div class='flex min-w-0 flex-1 flex-col gap-0.5'>
            <span class='flex flex-wrap items-baseline gap-2'>
              <span class='font-display text-[14px] leading-5 font-semibold'>
                {isMe(message.author) ? 'Toi' : personOf(message.author).name}
              </span>
              <span class='text-[12px] text-ink-muted'>{ago(message.at)}</span>
            </span>
            <div class='text-[15px] leading-6 text-pretty'>
              <Markdown text={message.text} class='gap-2' />
            </div>
          </div>
        </div>
      ))}
      {!messages.length && (
        <span class='text-[14px] text-ink-muted'>
          Pas encore de message. Le contexte, un lien, une question : tout se
          dit ici.
        </span>
      )}
      {open
        ? (
          <div class='flex flex-col gap-2'>
            <Textarea
              id='help-thread-input'
              rows={2}
              value={draft}
              limit={LIMITS.helpMessage}
              aria-label={t`Message pour ${personOf(other).name}`}
              placeholder={t`Écrire à ${firstName(other)}`}
              onInput={(event) => setDraft(event.currentTarget.value)}
              onKeyDown={(event) =>
                event.key === 'Enter' && (event.metaKey || event.ctrlKey) &&
                send()}
            />
            <div class='flex items-center justify-between gap-3'>
              <span class='text-[12px] text-ink-muted'>
                Ctrl + Entrée pour envoyer
              </span>
              <Button
                size={36}
                disabled={!draft.trim()}
                aria-busy={sending}
                onClick={send}
              >
                Envoyer
              </Button>
            </div>
          </div>
        )
        : (
          <span class='text-[13px] text-ink-muted'>
            La demande est close : le fil reste lisible.
          </span>
        )}
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
  { request, matched, open: initiallyOpen, notified = true }: {
    request: HelpRequest
    matched: Matched
    open: boolean
    notified?: boolean
  },
) => {
  const [open, setOpen] = useState(initiallyOpen)
  const person = personOf(matched.login)
  const status = request.helper === matched.login
    ? 'A accepté'
    : request.withdrawn?.includes(matched.login)
    ? 'S’est désisté'
    : notified
    ? 'Notifié'
    : 'Pas dans cette vague'
  return (
    <div class='flex flex-col gap-2 border-t border-line py-3.5'>
      <div class='flex items-center gap-3'>
        <A
          href={`@${matched.login}`}
          class='flex min-w-0 flex-1 items-center gap-3 text-ink no-underline hover:no-underline'
        >
          <Avatar name={person.name} src={person.avatarUrl} size={34} />
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
  const byScore = (list: Matched[]) =>
    [...list].sort((a, b) => b.score - a.score)
  const formula = (
    <span class='text-[12px] leading-[18px] text-ink-muted'>
      Score sur 100 : skills 45, type d’aide 15, aides confirmées 15, proximité
      10, disponibilité 10, affinité 5.
    </span>
  )
  // Only the requester sees who was notified and their scores; a developer
  // sees why the request reached them
  if (!isMe(request.author)) {
    // A matched developer sees their own score only (§7.3)
    const real = !request.demo && notified.find((m) => isMe(m.login))
    const mine = request.demo
      ? match(me, request)
      : { total: real ? real.score : 0, criteria: real ? real.criteria : [] }
    return (
      <aside class='slab flex min-w-0 flex-col gap-2 p-[22px]'>
        <Eyebrow accent>Matching</Eyebrow>
        <span class='font-display text-[18px] leading-[25px] font-semibold'>
          {t`Vague 1 · ${
            counted(
              notified.length,
              'développeur notifié',
              'développeurs notifiés',
            )
          }`}
        </span>
        {formula}
        {mine.total > 0
          ? (
            <div class='flex flex-col'>
              <MatchRow
                request={request}
                matched={{
                  login: me.login,
                  score: mine.total,
                  criteria: mine.criteria,
                  promising: notified.some((m) => isMe(m.login) && m.promising),
                }}
                notified={notified.some((m) => isMe(m.login))}
                open
              />
            </div>
          )
          : (
            <span class='text-[13px] text-ink-muted'>
              {request.demo
                ? 'Aucun de tes skills ne figure dans cette demande.'
                : 'Tu ne fais pas partie des développeurs notifiés pour cette demande.'}
            </span>
          )}
      </aside>
    )
  }
  return (
    <aside class='slab flex min-w-0 flex-col gap-2 p-[22px]'>
      <Eyebrow accent>Matching</Eyebrow>
      <span class='font-display text-[18px] leading-[25px] font-semibold'>
        {!request.demo && (request.wave ?? 1) > 1
          ? t`Vague ${request.wave} · ${
            counted(
              notified.length,
              'développeur notifié',
              'développeurs notifiés',
            )
          } en tout`
          : t`Vague 1 · ${
            counted(
              notified.length,
              'développeur notifié',
              'développeurs notifiés',
            )
          }`}
      </span>
      {formula}
      <div class='flex flex-col'>
        {byScore(notified).map((m, i) => (
          <MatchRow key={m.login} request={request} matched={m} open={!i} />
        ))}
      </div>
      {!request.demo && (
        <span class='border-t border-line pt-3.5 text-[13px] text-ink-muted'>
          {request.status === 'open'
            ? 'La vague suivante part 2 h après la précédente si personne n’accepte.'
            : 'Le matching s’arrête tant que la demande n’est pas ouverte.'}
        </span>
      )}
      {request.demo && (
        <span class='border-t border-line pt-3.5'>
          <Eyebrow>Vague 2</Eyebrow>
        </span>
      )}
      {request.demo && secondWave && next.length > 0 && (
        <div class='flex flex-col'>
          {byScore(next).map((m) => (
            <MatchRow
              key={m.login}
              request={request}
              matched={m}
              open={false}
            />
          ))}
        </div>
      )}
      {request.demo && !(secondWave && next.length) && (
        <span class='text-[13px] text-ink-muted'>
          {secondWave
            ? 'Aucun autre développeur correspondant pour l’instant.'
            : 'Vague 2 dans 2 h si personne n’accepte.'}
        </span>
      )}
    </aside>
  )
}

/** /help/:id: lifecycle, actions by role and the matching panel */
// The entries of a lifecycle: the page reads its request again (§13)
const lifecycle = [
  'HELP_REQUEST_ACCEPTED',
  'HELP_REQUEST_WITHDRAWN',
  'HELP_REQUEST_RELEASED',
  'HELP_REQUEST_REOPENED',
  'HELP_REQUEST_EXPIRED',
  'HELP_REQUEST_CANCELLED',
  'HELP_REQUEST_DELIVERED',
  'HELP_REQUEST_CLOSED',
  'HELP_MESSAGE_CREATED',
  'REVIEW_SUBMITTED',
  'REVIEW_HELP_CONFIRMED',
  'HELP_CONFIRMED',
] as const

export const HelpDetail = ({ id }: { id: string }) => {
  helpChanged.value
  // A real request (its id is a number) is read from the server: when the
  // page opens, and at each entry of its lifecycle
  const real = /^\d+$/.test(id)
  const [state, setState] = useState<'loading' | 'ready' | 'missing'>(
    real ? 'loading' : 'ready',
  )
  const reload = () => {
    real && loadHelpDetail(id).then(
      () => setState('ready'),
      () => setState((now) => now === 'loading' ? 'missing' : now),
    )
  }
  useEffect(reload, [id])
  useEvent([...lifecycle], reload)
  const request = helpRequests.find((h) => h.id === id)
  if (!request && state === 'loading') {
    return (
      <Page title='Demande d’aide' class='pt-5'>
        <LoadingState />
      </Page>
    )
  }
  if (!request) {
    return (
      <Page title='Demande introuvable' class='pt-5'>
        <GhostSlab>
          <EmptyState
            action={<Button href='help'>Voir les demandes d’aide</Button>}
          >
            Cette demande d’aide n’existe pas ou a été supprimée.
          </EmptyState>
        </GhostSlab>
      </Page>
    )
  }
  // A real request: the matches of the server, every wave so far
  const [notified, next] = request.demo
    ? waves(request)
    : [request.matched ?? [], []]
  const project = request.project && projects[request.project]
  const verified = request.log?.some((entry) => entry.verified)
  return (
    <Page
      title={request.title}
      heading={false}
      class='mr-2 grid items-start gap-8 pt-5 lg:grid-cols-[minmax(0,2fr)_minmax(0,1fr)]'
    >
      <div class='flex min-w-0 flex-col gap-7'>
        <div class='flex flex-col gap-2.5'>
          <Eyebrow>Aide / {request.type}</Eyebrow>
          <h1
            translate={false}
            class='wrap-anywhere font-display text-[30px] leading-9 font-bold tracking-[-.015em] text-pretty'
          >
            {request.title}
          </h1>
          <div class='flex flex-wrap items-center gap-2'>
            <StatusBadge status={request.status} />
            {verified && <VerifiedBadge />}
            {request.demo && <DemoBadge />}
            {project && (
              <A
                href={`project/${project.slug}`}
                class='inline-flex items-center gap-1.5 text-[14px] font-semibold'
              >
                <Cube size={18} />
                {project.name}
              </A>
            )}
            {project && request.pullRequest && (
              <A
                href={`project/${project.slug}/prs`}
                params={{ dialog: `pr-${request.pullRequest}` }}
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
              <Avatar
                name={personOf(request.author).name}
                src={personOf(request.author).avatarUrl}
                size={26}
              />
              {personOf(request.author).name}
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
        {request.helper &&
          (isMe(request.author) || isMe(request.helper)) && (
          <HelpThread
            request={request}
            messages={[...(request.messages ?? [])]}
            other={isMe(request.author) ? request.helper : request.author}
            open={!closed.includes(request.status)}
          />
        )}
        <Section title='Description'>
          {request.description
            ? <Markdown text={request.description} />
            : <p class='text-ink-muted'>Pas de description détaillée.</p>}
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
