import { useState } from 'preact/hooks'
import { navigate } from '@01edu/signal-router'
import { Send } from '/web/assets/icons.tsx'
import { apply } from '/web/fixtures/applications.ts'
import { me, personOf } from '/web/fixtures/people.ts'
import type { Project, ProjectSlug } from '/web/fixtures/projects.ts'
import { Button, OptionButton } from '/web/ui/button.tsx'
import { Dialog } from '/web/ui/dialog.tsx'
import { Field, FieldError, Textarea, useFieldErrors } from '/web/ui/input.tsx'
import { notify } from '/web/ui/toast.tsx'
import { t } from '/web/lib/language.ts'
import { LIMITS } from '/api/limits.ts'

const areas = ['Backend', 'Frontend', 'Tests', 'DevOps', 'Documentation']
const availabilities = [
  '1 à 2 h par semaine',
  '4 h par semaine',
  '8 h ou plus par semaine',
]

const Choices = (
  { label, children }: { label: string; children: preact.ComponentChildren },
) => (
  <div class='flex flex-col gap-2 text-[13px] font-semibold'>
    <span>{label}</span>
    <div class='flex flex-wrap gap-2 pb-1'>{children}</div>
  </div>
)

const JoinForm = ({ project }: { project: Project }) => {
  const owner = personOf(project.owner).name.split(' ')[0]
  const [how, setHow] = useState<string[]>([])
  const [availability, setAvailability] = useState(availabilities[1])
  const [message, setMessage] = useState('')
  const { check, clear, field } = useFieldErrors<'how'>('join')

  const send = () => {
    if (!check({ how: !how.length && 'Choisis au moins une façon d’aider.' })) {
      return
    }
    apply({
      project: project.slug as ProjectSlug,
      login: me.login,
      areas: how,
      availability,
      message,
    })
    navigate({ params: { dialog: null } })
    notify({
      title: 'Candidature envoyée',
      body: t`${owner} la recevra dans ses notifications.`,
      icon: Send,
      tone: 'verified',
    })
  }

  return (
    <div class='flex flex-col gap-5 px-6 pt-[22px] pb-6'>
      <h2 class='font-display text-heading'>
        {t`Rejoindre ${project.name}`}
      </h2>
      <Choices label='Comment veux-tu aider ?'>
        {areas.map((area, i) => (
          <OptionButton
            key={area}
            id={i ? undefined : 'join-how'}
            aria-describedby={field('how').error ? 'join-how-error' : undefined}
            pressed={how.includes(area)}
            onClick={() => {
              setHow(
                how.includes(area)
                  ? how.filter((x) => x !== area)
                  : [...how, area],
              )
              clear('how')
            }}
          >
            {area}
          </OptionButton>
        ))}
      </Choices>
      {field('how').error && (
        <FieldError id='join-how-error'>{field('how').error}</FieldError>
      )}
      <Choices label='Disponibilité'>
        {availabilities.map((value) => (
          <OptionButton
            key={value}
            pressed={value === availability}
            onClick={() => setAvailability(value)}
          >
            {value}
          </OptionButton>
        ))}
      </Choices>
      <Field label={<span>{t`Message pour ${owner}`}</span>}>
        <Textarea
          rows={3}
          value={message}
          limit={LIMITS.note}
          onInput={(event) => setMessage(event.currentTarget.value)}
          placeholder='Ce que tu aimerais faire sur le projet'
        />
      </Field>
      <span class='text-[13px] text-ink-muted'>
        {t`${owner} reçoit ta candidature et peut l’accepter directement depuis sa notification.`}
      </span>
      <div class='flex flex-wrap gap-3.5 border-t border-line pt-[18px]'>
        <Button size={40} onClick={send}>Envoyer la candidature</Button>
        <Button variant='secondary' size={40} params={{ dialog: null }}>
          Annuler
        </Button>
      </div>
    </div>
  )
}

export const JoinDialog = ({ project }: { project: Project }) => (
  <Dialog id='join' title='Rejoindre le projet' width={600}>
    <JoinForm project={project} />
  </Dialog>
)
