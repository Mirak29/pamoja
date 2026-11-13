import { useState } from 'preact/hooks'
import { A } from '/web/ui/link.tsx'
import { Lock, ShieldCheck } from '/web/assets/icons.tsx'
import { me, people, type Person } from '/web/fixtures/people.ts'
import {
  decideReport,
  type ModerationAction,
  moderationActions,
  type Report,
  reports,
  reportsChanged,
  reportTarget,
} from '/web/fixtures/reports.ts'
import { ago } from '/web/lib/time.ts'
import { Button, OptionButton } from '/web/ui/button.tsx'
import { Eyebrow } from '/web/ui/eyebrow.tsx'
import { Field, Textarea } from '/web/ui/input.tsx'
import { Page } from '/web/ui/layout.tsx'
import { EmptyState, GhostSlab } from '/web/ui/states.tsx'
import { notify } from '/web/ui/toast.tsx'
import { t } from '/web/lib/language.ts'
import { LIMITS } from '/api/limits.ts'

const actionLabel = (action: ModerationAction) =>
  moderationActions.find(([key]) => key === action)![1]

const OpenReport = ({ report }: { report: Report }) => {
  const [action, setAction] = useState<ModerationAction>()
  const [motif, setMotif] = useState('')
  const target = reportTarget(report.kind, report.target)
  const confirm = () => {
    if (!action || !motif.trim()) return
    decideReport(report, action, motif.trim(), me.login)
    notify({
      title: 'Décision enregistrée',
      body: `${actionLabel(action)}${target ? ' · l’auteur est notifié' : ''}.`,
      icon: ShieldCheck,
      tone: 'verified',
    })
  }
  return (
    <section class='slab mr-2 flex animate-enter flex-col gap-3.5 p-5'>
      <div class='flex flex-wrap items-center gap-2.5'>
        <span class='inline-flex h-[22px] items-center rounded-sm border border-warning bg-warning-soft px-2 font-mono text-[11px] leading-none font-medium tracking-[.06em] text-warning uppercase'>
          {report.reason}
        </span>
        <span class='text-[13px] text-ink-muted'>
          {t`Signalé par ${people[report.by].name} · ${ago(report.at)}`}
        </span>
      </div>
      {target
        ? (
          <A
            href={target.href}
            class='flex flex-col gap-1 rounded-lg border border-line-strong bg-surface-000 p-3.5 text-ink no-underline inset-shadow-well hover:border-figure-edge hover:no-underline'
          >
            <span class='font-semibold text-pretty'>{target.title}</span>
            {target.excerpt && (
              <span class='text-[13px] leading-5 text-ink-muted'>
                {target.excerpt}
              </span>
            )}
            <span class='text-[12px] text-ink-muted'>
              {people[target.author].name} · {target.kindLabel}
              {target.where && ` · ${target.where}`}
            </span>
          </A>
        )
        : <span class='text-[14px] text-ink-muted'>Contenu supprimé.</span>}
      {report.comment && (
        <span class='text-[14px] leading-[22px]'>« {report.comment} »</span>
      )}
      <div class='flex flex-col gap-2 text-[13px] font-semibold'>
        <span>Action</span>
        <div class='flex flex-wrap gap-2 pb-1'>
          {moderationActions.map(([key, label]) => (
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
      {action && (
        <div class='flex animate-enter-fast flex-col gap-2.5'>
          <Field label='Motif (obligatoire, envoyé à l’auteur)'>
            <Textarea
              rows={2}
              value={motif}
              limit={LIMITS.note}
              onInput={(event) => setMotif(event.currentTarget.value)}
            />
          </Field>
          <div class='flex flex-wrap gap-3 pb-1'>
            <Button disabled={!motif.trim()} onClick={confirm}>
              Confirmer : {actionLabel(action)}
            </Button>
            <Button
              variant='secondary'
              onClick={() => {
                setAction(undefined)
                setMotif('')
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

const History = ({ list }: { list: Report[] }) => (
  <section class='slab mr-2 overflow-hidden'>
    <div class='flex px-5 pt-[18px] pb-4'>
      <Eyebrow>Historique</Eyebrow>
    </div>
    {list.map((report) => (
      <div
        key={report.id}
        class='flex flex-col gap-1 border-t border-line px-5 py-3'
      >
        <span class='flex flex-wrap items-center gap-2 text-[14px]'>
          <span class='font-semibold'>{actionLabel(report.action!)}</span>
          <span class='text-ink-muted'>
            · {report.reason} ·{' '}
            {reportTarget(report.kind, report.target)?.title ??
              'Contenu supprimé'}
          </span>
        </span>
        <span class='text-[13px] text-ink-muted'>
          {people[report.moderator!].name} · {ago(report.decidedAt!)} · Motif :
          {' '}
          {report.motif}
        </span>
      </div>
    ))}
  </section>
)

/** Reports waiting for a decision, then the history (§10.5) */
export const ModerationPage = () => {
  reportsChanged.value
  const person: Person = me
  if (!person.moderator) {
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
  const open = reports.filter((r) => r.status === 'open')
  const done = reports.filter((r) => r.status !== 'open')
  return (
    <Page title='Modération' class='flex max-w-[900px] flex-col gap-7 pt-5'>
      <Eyebrow accent>
        {open.length}{' '}
        {open.length > 1 ? 'signalements en attente' : 'signalement en attente'}
      </Eyebrow>
      {open.map((report) => <OpenReport key={report.id} report={report} />)}
      {!open.length && (
        <GhostSlab class='px-6 py-7'>
          <EmptyState>
            La file est vide. Les signalements arrivent ici dès qu’un membre
            signale un contenu.
          </EmptyState>
        </GhostSlab>
      )}
      {done.length > 0 && <History list={done} />}
    </Page>
  )
}
