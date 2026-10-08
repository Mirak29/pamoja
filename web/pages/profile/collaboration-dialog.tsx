import { useState } from 'preact/hooks'
import { navigate } from '@01edu/signal-router'
import { Send } from '/web/assets/icons.tsx'
import { pushNotification } from '/web/fixtures/notifications.ts'
import { type Login, me, people } from '/web/fixtures/people.ts'
import {
  projects,
  type ProjectSlug,
  projectsOf,
} from '/web/fixtures/projects.ts'
import { pullRequests } from '/web/fixtures/pull-requests.ts'
import { Button, OptionButton } from '/web/ui/button.tsx'
import { Dialog } from '/web/ui/dialog.tsx'
import { Field, Select, Textarea } from '/web/ui/input.tsx'
import { notify } from '/web/ui/toast.tsx'

const kinds = [
  'Relire ma PR',
  'M’aider à débugger',
  'Conseil d’architecture',
  'Rejoindre mon projet',
  'Pair programming',
  'Me mentorer',
  'Construire quelque chose ensemble',
]

// Kinds that happen on one of the viewer's projects
const withProject = [
  'Relire ma PR',
  'Rejoindre mon projet',
  'M’aider à débugger',
  'Construire quelque chose ensemble',
]

const CollaborationForm = ({ login }: { login: Login }) => {
  const first = people[login].name.split(' ')[0]
  const [kind, setKind] = useState(kinds[0])
  const [project, setProject] = useState('')
  const [pullRequest, setPullRequest] = useState('')
  const [message, setMessage] = useState('')
  const openPullRequests = pullRequests.filter((pr) =>
    pr.project === project && pr.state === 'open'
  )

  const send = () => {
    const name = project && projects[project as ProjectSlug].name
    pushNotification({
      to: login,
      category: 'social',
      kind: 'collaboration',
      title: `${me.name.split(' ')[0]} te propose : ${kind}`,
      body: [name, pullRequest && `PR #${pullRequest}`, message.trim()]
        .filter(Boolean).join(' · ') || 'Pas de message.',
      href: project ? `projet/${project}` : `@${me.login}`,
    })
    navigate({ params: { dialog: null } })
    notify({
      title: 'Proposition envoyée',
      body: `${people[login].name} la reçoit dans ses notifications.`,
      icon: Send,
      tone: 'verified',
    })
  }

  return (
    <div class='flex flex-col gap-[18px] px-6 pt-5 pb-6'>
      <h2 class='font-display text-heading'>Avec {people[login].name}</h2>
      <div class='flex flex-col gap-2 text-[13px] font-semibold'>
        <span>Ce que tu proposes</span>
        <div class='flex flex-wrap gap-2 pb-1'>
          {kinds.map((value) => (
            <OptionButton
              key={value}
              pressed={value === kind}
              onClick={() => setKind(value)}
            >
              {value}
            </OptionButton>
          ))}
        </div>
      </div>
      {withProject.includes(kind) && (
        <Field label='Projet'>
          <Select
            value={project}
            onChange={(event) => {
              setProject(event.currentTarget.value)
              setPullRequest('')
            }}
          >
            <option value=''>Aucun projet</option>
            {projectsOf(me.login).map((p) => (
              <option key={p.slug} value={p.slug}>{p.name}</option>
            ))}
          </Select>
        </Field>
      )}
      {kind === kinds[0] && openPullRequests.length > 0 && (
        <Field label='PR'>
          <Select
            value={pullRequest}
            onChange={(event) => setPullRequest(event.currentTarget.value)}
          >
            <option value=''>Choisir une PR</option>
            {openPullRequests.map((pr) => (
              <option key={pr.number} value={pr.number}>
                #{pr.number} {pr.title}
              </option>
            ))}
          </Select>
        </Field>
      )}
      <Field label={<span>Message pour {first}</span>}>
        <Textarea
          rows={3}
          value={message}
          onInput={(event) => setMessage(event.currentTarget.value)}
          placeholder='Le contexte, ce que tu attends, le temps que ça prendrait'
        />
      </Field>
      <div class='flex flex-wrap gap-3.5 border-t border-line pt-[18px]'>
        <Button size={40} onClick={send}>Envoyer la proposition</Button>
        <Button variant='secondary' size={40} params={{ dialog: null }}>
          Annuler
        </Button>
      </div>
    </div>
  )
}

/** Request collaboration from the hero of a profile (§9.1) */
export const CollaborationDialog = ({ login }: { login: Login }) => (
  <Dialog id='collaboration' title='Proposer une collaboration' width={600}>
    <CollaborationForm login={login} />
  </Dialog>
)
