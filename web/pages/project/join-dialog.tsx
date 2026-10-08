import { signal } from '@preact/signals'
import { useState } from 'preact/hooks'
import { navigate } from '@01edu/signal-router'
import { CircleAlert, Send } from '/web/assets/icons.tsx'
import { people } from '/web/fixtures/people.ts'
import type { Project } from '/web/fixtures/projects.ts'
import { Button, OptionButton } from '/web/ui/button.tsx'
import { Dialog } from '/web/ui/dialog.tsx'
import { Field, Textarea } from '/web/ui/input.tsx'
import { notify } from '/web/ui/toast.tsx'

const areas = ['Backend', 'Frontend', 'Tests', 'DevOps', 'Documentation']
const availabilities = [
  '1 à 2 h par semaine',
  '4 h par semaine',
  '8 h ou plus par semaine',
]

// Projects applied to during the session, until POST/api/project/join
// exists (PAM-403)
export const appliedTo = signal<string[]>([])

const Choices = (
  { label, children }: { label: string; children: preact.ComponentChildren },
) => (
  <div class='flex flex-col gap-2 text-[13px] font-semibold'>
    <span>{label}</span>
    <div class='flex flex-wrap gap-2 pb-1'>{children}</div>
  </div>
)

const JoinForm = ({ project }: { project: Project }) => {
  const owner = people[project.owner].name.split(' ')[0]
  const [how, setHow] = useState<string[]>([])
  const [availability, setAvailability] = useState(availabilities[1])
  const [error, setError] = useState('')

  const send = () => {
    if (!how.length) return setError('Choisis au moins une façon d’aider.')
    appliedTo.value = [...appliedTo.peek(), project.slug]
    navigate({ params: { dialog: null } })
    notify({
      title: 'Candidature envoyée',
      body: `${owner} la recevra dans ses notifications.`,
      icon: Send,
      tone: 'verified',
    })
  }

  return (
    <div class='flex flex-col gap-5 px-6 pt-[22px] pb-6'>
      <h2 class='font-display text-heading'>Rejoindre {project.name}</h2>
      <Choices label='Comment veux-tu aider ?'>
        {areas.map((area) => (
          <OptionButton
            key={area}
            pressed={how.includes(area)}
            onClick={() =>
              setHow(
                how.includes(area)
                  ? how.filter((x) => x !== area)
                  : [...how, area],
              )}
          >
            {area}
          </OptionButton>
        ))}
      </Choices>
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
      <Field label={<span>Message pour {owner}</span>}>
        <Textarea
          rows={3}
          placeholder='Ce que tu aimerais faire sur le projet'
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
        {owner}{' '}
        reçoit ta candidature et peut l’accepter directement depuis sa
        notification.
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
