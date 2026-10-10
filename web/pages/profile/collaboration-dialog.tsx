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
  const [errors, setErrors] = useState<
    { pullRequest?: string; message?: string }
  >({})
  const openPullRequests = pullRequests.filter((pr) =>
    pr.project === project && pr.state === 'open'
  )
  const review = kind === kinds[0]

  const send = () => {
    // A proposal says what it is about: the PR to review, and a few words
    const found = {
      pullRequest: review && !pullRequest
        ? 'Choisis la PR à relire.'
        : undefined,
      message: message.trim()
        ? undefined
        : `Écris quelques mots à ${first} : le contexte et ce que tu attends.`,
    }
    if (found.pullRequest || found.message) {
      setErrors(found)
      document.getElementById(
        found.pullRequest
          ? (project ? 'collab-pr' : 'collab-project')
          : 'collab-message',
      )?.focus()
      return
    }
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
        <Field
          label='Projet'
          error={!project ? errors.pullRequest : undefined}
          errorId='collab-project-error'
        >
          <Select
            id='collab-project'
            value={project}
            aria-invalid={!project && errors.pullRequest ? true : undefined}
            aria-describedby={!project && errors.pullRequest
              ? 'collab-project-error'
              : undefined}
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
      {review && project && (
        <Field
          label='PR'
          error={errors.pullRequest}
          errorId='collab-pr-error'
        >
          <Select
            id='collab-pr'
            value={pullRequest}
            aria-invalid={errors.pullRequest ? true : undefined}
            aria-describedby={errors.pullRequest
              ? 'collab-pr-error'
              : undefined}
            onChange={(event) => {
              setPullRequest(event.currentTarget.value)
              setErrors({ ...errors, pullRequest: undefined })
            }}
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
      <Field
        label={<span>Message pour {first}</span>}
        error={errors.message}
        errorId='collab-message-error'
      >
        <Textarea
          id='collab-message'
          rows={3}
          value={message}
          aria-invalid={errors.message ? true : undefined}
          aria-describedby={errors.message ? 'collab-message-error' : undefined}
          onInput={(event) => {
            setMessage(event.currentTarget.value)
            setErrors({ ...errors, message: undefined })
          }}
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
