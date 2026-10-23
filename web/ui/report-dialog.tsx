import { useState } from 'preact/hooks'
import { navigate, url } from '@01edu/signal-router'
import { CircleAlert, Flag } from '/web/assets/icons.tsx'
import { me, people } from '/web/fixtures/people.ts'
import {
  type ReportKind,
  reportReasons,
  reportTarget,
  submitReport,
} from '/web/fixtures/reports.ts'
import { Button, OptionButton } from '/web/ui/button.tsx'
import { Dialog } from '/web/ui/dialog.tsx'
import { Field, Textarea } from '/web/ui/input.tsx'
import { notify } from '/web/ui/toast.tsx'
import { LIMITS } from '/api/limits.ts'

const close = () => navigate({ params: { dialog: null, report: null } })

const ReportForm = ({ kind, id }: { kind: ReportKind; id: string }) => {
  const [reason, setReason] = useState('')
  const [comment, setComment] = useState('')
  const [error, setError] = useState('')
  const target = reportTarget(kind, id)
  if (!target) {
    return (
      <div class='px-6 pt-5 pb-6 text-[14px] text-ink-muted'>
        Ce contenu n’existe plus.
      </div>
    )
  }
  const send = () => {
    if (!reason) return setError('Choisis un motif.')
    submitReport({
      kind,
      target: id,
      reason,
      comment: comment.trim(),
      by: me.login,
    })
    close()
    notify({
      title: 'Signalement envoyé',
      body: 'L’équipe de modération va l’examiner. Merci.',
      icon: Flag,
      tone: 'muted',
    })
  }
  return (
    <div class='flex flex-col gap-[18px] px-6 pt-5 pb-6'>
      <div class='flex flex-col gap-0.5 rounded-lg border border-line-strong bg-surface-000 px-3.5 py-3 inset-shadow-well'>
        <span class='font-semibold text-pretty'>{target.title}</span>
        <span class='text-[12px] text-ink-muted'>
          {target.kindLabel} · {people[target.author].name}
        </span>
      </div>
      <div class='flex flex-col gap-2 text-[13px] font-semibold'>
        <span>Motif</span>
        <div class='flex flex-wrap gap-2 pb-1'>
          {reportReasons.map((value) => (
            <OptionButton
              key={value}
              pressed={reason === value}
              onClick={() => {
                setReason(value)
                setError('')
              }}
            >
              {value}
            </OptionButton>
          ))}
        </div>
      </div>
      <Field label='Commentaire (facultatif)'>
        <Textarea
          rows={3}
          value={comment}
          limit={LIMITS.note}
          placeholder='Ce qui pose problème'
          onInput={(event) => setComment(event.currentTarget.value)}
        />
      </Field>
      {error && (
        <div
          role='alert'
          class='flex items-center gap-2 text-[14px] text-danger'
        >
          <CircleAlert />
          {error}
        </div>
      )}
      <span class='text-[13px] text-ink-muted'>
        Ton signalement reste anonyme pour l’auteur.
      </span>
      <div class='flex flex-wrap gap-3.5 border-t border-line pt-[18px]'>
        <Button size={40} onClick={send}>Envoyer le signalement</Button>
        <Button variant='secondary' size={40} onClick={close}>Annuler</Button>
      </div>
    </div>
  )
}

/**
 * Report a post, a message, a help request or a profile from anywhere:
 * ?dialog=report&report=post:po1 (§10.5)
 */
export const ReportDialog = () => {
  const [kind, id] = (url.params.report ?? '').split(':')
  return (
    <Dialog id='report' title='Signaler' width={560} clear={['report']}>
      <ReportForm key={url.params.report} kind={kind as ReportKind} id={id} />
    </Dialog>
  )
}
