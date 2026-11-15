import { useEffect, useState } from 'preact/hooks'
import { A } from '/web/ui/link.tsx'
import { Lock, ShieldCheck } from '/web/assets/icons.tsx'
import { personOf } from '/web/fixtures/people.ts'
import { reportReasons } from '/api/vocabulary.ts'
import {
  decideOn,
  type Decision,
  loadQueue,
  moderation,
  type QueueItem,
} from '/web/lib/moderation.ts'
import { ago } from '/web/lib/time.ts'
import { Button, OptionButton } from '/web/ui/button.tsx'
import { Eyebrow } from '/web/ui/eyebrow.tsx'
import { Field, Textarea } from '/web/ui/input.tsx'
import { Page } from '/web/ui/layout.tsx'
import { EmptyState, GhostSlab } from '/web/ui/states.tsx'
import { notify } from '/web/ui/toast.tsx'
import { t, translate } from '/web/lib/language.ts'
import { LIMITS } from '/api/limits.ts'

// What a moderator may decide (§10.5), each with a reason sent to the author
const decisions: [Decision, string][] = [
  ['dismiss', 'Ignorer'],
  ['hide', 'Masquer'],
  ['warn', 'Avertir'],
  ['suspend', 'Suspendre'],
]
const durations: [number, string][] = [
  [1, '1 jour'],
  [7, '7 jours'],
  [30, '30 jours'],
]

const labelOf = (action: string) =>
  decisions.find(([key]) => key === action)?.[1] ?? action

const reasonLabel = (reason: string) =>
  reportReasons[reason as keyof typeof reportReasons] ?? reason

const kinds: Record<string, string> = {
  post: 'Post',
  comment: 'Commentaire',
  help_request: 'Demande d’aide',
  profile: 'Profil',
}

const OpenItem = ({ item }: { item: QueueItem }) => {
  const [action, setAction] = useState<Decision>()
  const [days, setDays] = useState(7)
  const [reason, setReason] = useState('')
  const [saving, setSaving] = useState(false)
  const confirm = async () => {
    if (!action || !reason.trim() || saving) return
    setSaving(true)
    const saved = await decideOn(item, action, reason.trim(), days)
    setSaving(false)
    if (!saved) return
    notify({
      title: 'Décision enregistrée',
      body: action === 'dismiss'
        ? 'Les signalements sont clos.'
        : 'L’auteur est notifié, avec le motif.',
      icon: ShieldCheck,
      tone: 'verified',
    })
  }
  const reasons = [...new Set(item.reports.map((r) => r.reason))]
  return (
    <section class='slab mr-2 flex animate-enter flex-col gap-3.5 p-5'>
      <div class='flex flex-wrap items-center gap-2.5'>
        {reasons.map((reason) => (
          <span
            key={reason}
            class='inline-flex h-[22px] items-center rounded-sm border border-warning bg-warning-soft px-2 font-mono text-[11px] leading-none font-medium tracking-[.06em] text-warning uppercase'
          >
            {translate(reasonLabel(reason))}
          </span>
        ))}
        <span class='text-[13px] text-ink-muted'>
          {item.reports.length > 1
            ? t`${item.reports.length} signalements`
            : t`Signalé par ${personOf(item.reports[0].by).name}`} ·{' '}
          {ago(item.reports[0].at * 1000)}
        </span>
        {item.hidden && (
          <span class='text-[13px] font-semibold text-warning'>
            Masqué en attendant ta décision
          </span>
        )}
      </div>
      <A
        href={item.href}
        class='flex flex-col gap-1 rounded-lg border border-line-strong bg-surface-000 p-3.5 text-ink no-underline inset-shadow-well hover:border-figure-edge hover:no-underline'
      >
        <span class='font-semibold text-pretty'>{item.title}</span>
        {item.excerpt && (
          <span class='text-[13px] leading-5 text-ink-muted'>
            {item.excerpt}
          </span>
        )}
        <span class='text-[12px] text-ink-muted'>
          {personOf(item.author).name} ·{' '}
          {translate(kinds[item.targetType] ?? item.targetType)}
        </span>
      </A>
      {item.reports.filter((r) => r.comment).map((r) => (
        <span key={r.by} class='text-[14px] leading-[22px]'>
          « {r.comment} »
        </span>
      ))}
      <div class='flex flex-col gap-2 text-[13px] font-semibold'>
        <span>Action</span>
        <div class='flex flex-wrap gap-2 pb-1'>
          {decisions.map(([key, label]) => (
            <OptionButton
              key={key}
              pressed={action === key}
              onClick={() => setAction(key)}
            >
              {label}
            </OptionButton>
          ))}
        </div>
      </div>
      {action === 'suspend' && (
        <div class='flex flex-col gap-2 text-[13px] font-semibold'>
          <span>Durée</span>
          <div class='flex flex-wrap gap-2 pb-1'>
            {durations.map(([value, label]) => (
              <OptionButton
                key={value}
                pressed={days === value}
                onClick={() => setDays(value)}
              >
                {label}
              </OptionButton>
            ))}
          </div>
        </div>
      )}
      {action && (
        <div class='flex animate-enter-fast flex-col gap-2.5'>
          <Field label='Motif (obligatoire, envoyé à l’auteur)'>
            <Textarea
              rows={2}
              value={reason}
              limit={LIMITS.note}
              onInput={(event) => setReason(event.currentTarget.value)}
            />
          </Field>
          <div class='flex flex-wrap gap-3 pb-1'>
            <Button
              disabled={!reason.trim()}
              aria-busy={saving}
              onClick={confirm}
            >
              Confirmer : {labelOf(action)}
            </Button>
            <Button
              variant='secondary'
              onClick={() => {
                setAction(undefined)
                setReason('')
              }}
            >
              Annuler
            </Button>
          </div>
        </div>
      )}
    </section>
  )
}

/** Reports waiting for a decision, then the history (§10.5) */
export const ModerationPage = () => {
  useEffect(() => {
    loadQueue()
  }, [])
  const data = moderation.value
  if (data && !data.moderator) {
    return (
      <Page title='Modération' class='pt-5'>
        <GhostSlab class='px-6 py-10'>
          <div class='flex flex-col items-center gap-3 text-center'>
            <Lock class='size-3.5 text-ink-muted' />
            <span class='font-display text-[18px] leading-6 font-semibold'>
              Réservé aux modérateurs
            </span>
            <span class='text-[14px] text-ink-muted'>
              La file de modération s’ouvre aux modérateurs des communautés.
            </span>
          </div>
        </GhostSlab>
      </Page>
    )
  }
  const queue = data?.queue ?? []
  const history = data?.history ?? []
  return (
    <Page title='Modération' class='flex max-w-[900px] flex-col gap-7 pt-5'>
      <Eyebrow accent>
        {queue.length}{' '}
        {queue.length > 1 ? 'contenus signalés' : 'contenu signalé'}
      </Eyebrow>
      {queue.map((item) => (
        <OpenItem key={`${item.targetType}:${item.targetId}`} item={item} />
      ))}
      {data && !queue.length && (
        <GhostSlab class='px-6 py-7'>
          <EmptyState>
            La file est vide. Les signalements arrivent ici dès qu’un membre
            signale un contenu.
          </EmptyState>
        </GhostSlab>
      )}
      {history.length > 0 && (
        <section class='slab mr-2 overflow-hidden'>
          <div class='flex px-5 pt-[18px] pb-4'>
            <Eyebrow>Historique</Eyebrow>
          </div>
          {history.map((row) => (
            <div
              key={row.id}
              class='flex flex-col gap-1 border-t border-line px-5 py-3'
            >
              <span class='flex flex-wrap items-center gap-2 text-[14px]'>
                <span class='font-semibold'>{labelOf(row.action)}</span>
                <A href={row.href} class='text-ink-muted'>· {row.title}</A>
              </span>
              <span class='text-[13px] text-ink-muted'>
                {personOf(row.moderator).name} · {ago(row.at * 1000)} · Motif :
                {' '}
                {row.reason}
              </span>
            </div>
          ))}
        </section>
      )}
    </Page>
  )
}
