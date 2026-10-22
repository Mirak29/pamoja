import type { ComponentChildren } from 'preact'
import { useState } from 'preact/hooks'
import { navigate, url } from '@01edu/signal-router'
import { GitPullRequest, Send, X } from '/web/assets/icons.tsx'
import { type HelpDraft, helpTypes, publishHelp } from '/web/fixtures/help.ts'
import { waves } from '/web/fixtures/matching.ts'
import { isMe, me, people } from '/web/fixtures/people.ts'
import { projects, type ProjectSlug } from '/web/fixtures/projects.ts'
import { type PullRequest, pullRequests } from '/web/fixtures/pull-requests.ts'
import { Avatar } from '/web/ui/avatar.tsx'
import { Button, OptionButton } from '/web/ui/button.tsx'
import { Eyebrow } from '/web/ui/eyebrow.tsx'
import { SkillPicker } from '/web/ui/chips.tsx'
import { Field, Input, Select, Textarea } from '/web/ui/input.tsx'
import { Page } from '/web/ui/layout.tsx'
import { notify } from '/web/ui/toast.tsx'
import { t } from '/web/lib/language.ts'

const levels = ['Débutant', 'Intermédiaire', 'Intermédiaire+', 'Confirmé']
const durations = ['~20 min', '~30 min', '~1 h', '~2 h']
const MAX_CAPTURES = 4

type Form = HelpDraft & { origin: string }

/** What a PR brings to a review request (§7.1) */
const fromPullRequest = (pr: PullRequest) => ({
  title: t`Review de la PR #${pr.number} : ${pr.title}`,
  description: pr.number === 81
    ? 'Je cherche un regard extérieur sur la gestion des transactions : verrouillage SQLite, rollback quand le callback échoue, et comportement sous accès concurrents.'
    : 'Je cherche une review sur cette PR avant de la merger.',
  project: pr.project,
  pullRequest: pr.number,
  skills: pr.number === 81
    ? ['Go', 'SQLite', 'Backend']
    : projects[pr.project].stack.slice(0, 2),
  branch: pr.branch,
})

// Request Review from a PR (?pr=) or help from a failing CI alert (?ci=)
// pre-fills the form (§7.1)
const initialForm = (): Form => {
  const form: Form = {
    type: 'Review de code',
    title: '',
    description: '',
    project: (url.params.project ?? undefined) as ProjectSlug | undefined,
    skills: [],
    level: 'Intermédiaire',
    duration: '~30 min',
    captures: [],
    origin: '',
  }
  const number = Number(url.params.pr ?? url.params.ci)
  const pr = pullRequests.find((p) => p.number === number)
  if (pr && url.params.pr) {
    Object.assign(form, {
      ...fromPullRequest(pr),
      level: 'Intermédiaire+',
      duration: '~20 min',
      origin: t`Pré-rempli depuis la PR #${pr.number}`,
    })
  }
  if (pr && url.params.ci) {
    Object.assign(form, {
      type: 'Debug',
      title: t`CI en échec sur la PR #${pr.number} : ${pr.title}`,
      description:
        t`Le job test (go 1.22) échoue sur la branche ${pr.branch} alors que les tests passent en local. Lien du job : github.com/${
          projects[pr.project].owner
        }/${pr.project}/actions/runs/9124`,
      project: pr.project,
      pullRequest: pr.number,
      skills: ['Go', 'CI'],
      branch: pr.branch,
      job: 'actions/runs/9124',
      origin: 'Pré-rempli depuis l’alerte CI de #suivi',
    })
  }
  return form
}

const Choices = (
  { label, children }: { label: string; children: ComponentChildren },
) => (
  <div class='flex flex-col gap-2 text-[13px] font-semibold'>
    <span>{label}</span>
    <div class='flex flex-wrap gap-2 pb-1'>{children}</div>
  </div>
)

export const BranchLine = (
  { branch, job }: { branch: string; job?: string },
) => (
  <div class='flex flex-wrap gap-3.5 text-[13px] text-ink-muted'>
    <span>
      Branche{' '}
      <code class='font-mono text-[13px] leading-5 text-ink'>{branch}</code>
    </span>
    {job && (
      <span>
        Job <code class='font-mono text-[13px] leading-5 text-ink'>{job}</code>
      </span>
    )}
  </div>
)

// Images are resized and uploaded with POST/api/media/upload (PAM-409);
// here they stay in the browser
const Captures = (
  { captures, onChange }: {
    captures: string[]
    onChange: (captures: string[]) => void
  },
) => (
  <div class='flex flex-col gap-2 text-[13px] font-semibold'>
    <span>Captures ({MAX_CAPTURES} maximum)</span>
    <div class='grid grid-cols-4 gap-3.5 pb-1'>
      {Array.from({ length: MAX_CAPTURES }, (_, i) => {
        const capture = captures[i]
        if (capture) {
          return (
            <div
              key={capture}
              class='relative flex aspect-[4/3] items-end rounded-md border border-figure-edge bg-surface-000 bg-cover bg-center p-1.5 shadow-tile'
              style={{ backgroundImage: `url(${capture})` }}
            >
              <span class='rounded-sm bg-surface-100 px-1 py-px font-mono text-[10px] leading-[14px] font-medium text-ink-muted'>
                capture-{i + 1}.png
              </span>
              <button
                type='button'
                onClick={() => onChange(captures.filter((c) => c !== capture))}
                aria-label='Retirer la capture'
                class='absolute top-1 right-1 flex size-[22px] cursor-pointer items-center justify-center rounded-sm border border-figure-edge bg-surface-100 text-ink'
              >
                <X class='size-3' />
              </button>
            </div>
          )
        }
        return (
          <label
            key={i}
            class='flex aspect-[4/3] cursor-pointer items-center justify-center rounded-md border border-dashed border-line-control text-[12px] leading-none font-medium text-ink-muted'
          >
            + Capture
            <input
              type='file'
              accept='image/png,image/jpeg,image/webp'
              class='sr-only'
              onChange={(event) => {
                const file = event.currentTarget.files?.[0]
                file && onChange([...captures, URL.createObjectURL(file)])
              }}
            />
          </label>
        )
      })}
    </div>
  </div>
)

const Preview = ({ form }: { form: Form }) => {
  const notified = form.skills.length
    ? waves({ author: me.login, type: form.type, skills: form.skills })[0]
    : []
  return (
    <aside class='slab sticky top-24 flex flex-col gap-2.5 p-[22px]'>
      <Eyebrow accent>Matching</Eyebrow>
      <span class='font-display text-[19px] leading-[26px] font-semibold'>
        Qui sera notifié
      </span>
      <span class='text-small text-ink-muted'>
        Les 5 meilleurs profils, dont une place pour un profil prometteur.
        Calculé pendant que tu remplis.
      </span>
      {notified.map((m) => (
        <div
          key={m.login}
          class='flex items-center gap-3 border-t border-line py-3'
        >
          <Avatar
            name={people[m.login].name}
            src={people[m.login].avatarUrl}
            size={30}
          />
          <span class='flex min-w-0 flex-1 flex-col'>
            <span class='font-display text-[14px] leading-5 font-semibold'>
              {people[m.login].name}
            </span>
            <span class='text-[12px] leading-4 text-ink-muted'>
              {m.criteria.slice(0, 2).map((c) => c.label).join(' · ')}
            </span>
            {m.promising && (
              <span class='mt-[5px] inline-flex h-5 items-center self-start rounded-sm border border-dashed border-indigo px-1.5 font-mono text-[10px] leading-none font-medium tracking-[.06em] text-indigo uppercase'>
                Prometteur
              </span>
            )}
          </span>
          <span class='tile flex h-7 min-w-10 items-center justify-center rounded-[5px] px-1.5 font-mono text-[14px] leading-5 font-medium tabular-nums'>
            {m.score}
          </span>
        </div>
      ))}
      {!notified.length && (
        <span class='border-t border-line pt-2.5 text-[13px] text-ink-muted'>
          Ajoute des skills pour voir qui sera notifié.
        </span>
      )}
    </aside>
  )
}

/** /aide/nouvelle, pre-filled from a PR or a CI alert */
export const NewHelp = () => {
  const [form, setForm] = useState(initialForm)
  const [errors, setErrors] = useState<{ title?: string; skills?: string }>(
    {},
  )
  const update = (patch: Partial<Form>) => {
    const fixed = { ...errors }
    'title' in patch && delete fixed.title
    'skills' in patch && delete fixed.skills
    setErrors(fixed)
    setForm({ ...form, ...patch })
  }
  // Choosing a PR fills what is still empty, as « Request Review » does
  const choosePullRequest = (number: number) => {
    const pr = pullRequests.find((p) => p.number === number)
    if (!pr) return update({ pullRequest: undefined, branch: undefined })
    const filled = fromPullRequest(pr)
    update({
      pullRequest: pr.number,
      branch: pr.branch,
      type: form.title.trim() ? form.type : 'Review de code',
      title: form.title.trim() || filled.title,
      description: form.description.trim() || filled.description,
      skills: form.skills.length ? form.skills : filled.skills,
      origin: t`Pré-rempli depuis la PR #${pr.number}`,
    })
  }
  const myProjects = Object.values(projects).filter((p) =>
    isMe(p.owner) || p.members.some((m) => isMe(m.login))
  )
  const openPullRequests = pullRequests.filter((pr) =>
    pr.project === form.project && pr.state === 'open'
  )

  const publish = () => {
    const found = {
      title: form.title.trim() ? undefined : 'Donne un titre à ta demande.',
      skills: form.skills.length
        ? undefined
        : 'Ajoute au moins un skill pour que le matching trouve les bons développeurs.',
    }
    if (found.title || found.skills) {
      setErrors(found)
      document.getElementById(found.title ? 'help-title' : 'help-skills')
        ?.focus()
      return
    }
    const { origin: _, ...draft } = form
    const request = publishHelp({
      ...draft,
      title: form.title.trim(),
      description: form.description.trim(),
    })
    navigate({ href: `aide/${request.id}` })
    notify({
      title: 'Demande publiée',
      body: 'Envoyée aux développeurs qui correspondent le mieux.',
      icon: Send,
      tone: 'verified',
    })
  }

  return (
    <Page title='Nouvelle demande d’aide' class='flex flex-col gap-6 pt-5'>
      {form.origin && (
        <span class='inline-flex h-7 items-center gap-2 self-start rounded-[5px] border border-indigo bg-indigo-soft px-2.5 text-[13px] font-semibold text-indigo shadow-key-selected'>
          <GitPullRequest class='size-3.5' />
          {form.origin}
        </span>
      )}
      <div class='mr-2 grid items-start gap-8 lg:grid-cols-[minmax(0,2fr)_minmax(0,1fr)]'>
        <div class='slab flex min-w-0 flex-col gap-[22px] p-6'>
          <Choices label='Type d’aide'>
            {helpTypes.map((type) => (
              <OptionButton
                key={type}
                pressed={form.type === type}
                onClick={() => update({ type })}
              >
                {type}
              </OptionButton>
            ))}
          </Choices>
          <Field label='Titre' error={errors.title} errorId='help-title-error'>
            <Input
              id='help-title'
              aria-invalid={errors.title ? true : undefined}
              aria-describedby={errors.title ? 'help-title-error' : undefined}
              value={form.title}
              onInput={(event) => update({ title: event.currentTarget.value })}
              placeholder='Ce dont tu as besoin, en une phrase'
            />
          </Field>
          <Field label='Description'>
            <Textarea
              rows={4}
              value={form.description}
              onInput={(event) =>
                update({ description: event.currentTarget.value })}
              placeholder='Contexte, ce que tu as essayé, ce que tu attends'
            />
          </Field>
          <div class='grid grid-cols-[repeat(auto-fit,minmax(200px,1fr))] gap-3.5'>
            <Field label='Projet (facultatif)'>
              <Select
                value={form.project ?? ''}
                onChange={(event) =>
                  update({
                    project: (event.currentTarget.value || undefined) as
                      | ProjectSlug
                      | undefined,
                    pullRequest: undefined,
                    branch: undefined,
                  })}
              >
                <option value=''>Aucun projet</option>
                {myProjects.map((p) => (
                  <option key={p.slug} value={p.slug}>{p.name}</option>
                ))}
              </Select>
            </Field>
            {form.project && (
              <Field label='PR (facultatif)'>
                <Select
                  value={String(form.pullRequest ?? '')}
                  onChange={(event) =>
                    choosePullRequest(Number(event.currentTarget.value))}
                >
                  <option value=''>Aucune PR</option>
                  {openPullRequests.map((pr) => (
                    <option key={pr.number} value={pr.number}>
                      #{pr.number} · {pr.title}
                    </option>
                  ))}
                </Select>
              </Field>
            )}
          </div>
          {form.branch && <BranchLine branch={form.branch} job={form.job} />}
          <SkillPicker
            label='Skills'
            inputLabel='Ajouter un skill'
            placeholder='Ajouter un skill (essaie « postgres »)'
            note='Vocabulaire contrôlé : Pamoja propose le nom exact du skill.'
            skills={form.skills}
            onChange={(skills) => update({ skills })}
            id='help-skills'
            error={errors.skills}
          />
          <div class='grid grid-cols-[repeat(auto-fit,minmax(240px,1fr))] gap-[18px]'>
            <Choices label='Niveau attendu'>
              {levels.map((level) => (
                <OptionButton
                  key={level}
                  pressed={form.level === level}
                  onClick={() => update({ level })}
                >
                  {level}
                </OptionButton>
              ))}
            </Choices>
            <Choices label='Durée estimée'>
              {durations.map((duration) => (
                <OptionButton
                  key={duration}
                  pressed={form.duration === duration}
                  onClick={() => update({ duration })}
                >
                  {duration}
                </OptionButton>
              ))}
            </Choices>
          </div>
          <Captures
            captures={form.captures ?? []}
            onChange={(captures) => update({ captures })}
          />
          <Field label='Lien vidéo (facultatif)'>
            <Input
              value={form.video ?? ''}
              onInput={(event) => update({ video: event.currentTarget.value })}
              placeholder='Lien YouTube ou Loom'
            />
          </Field>
          <div class='flex flex-wrap gap-3.5 border-t border-line pt-5'>
            <Button size={40} onClick={publish}>Publier la demande</Button>
            <Button
              variant='secondary'
              size={40}
              onClick={() => history.back()}
            >
              Annuler
            </Button>
          </div>
        </div>
        <Preview form={form} />
      </div>
    </Page>
  )
}
