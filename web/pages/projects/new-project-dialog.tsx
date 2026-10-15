import type { ComponentChildren } from 'preact'
import { useEffect, useState } from 'preact/hooks'
import { A, navigate } from '@01edu/signal-router'
import { ArrowLeft, FolderGit2, Github } from '/web/assets/icons.tsx'
import { needSuggestions } from '/web/fixtures/projects.ts'
import { createProject, readmeSummary } from '/web/fixtures/repos.ts'
import { api, type ApiOutput } from '/web/lib/api.ts'
import { loadProjects } from '/web/lib/session.ts'
import { ago } from '/web/lib/time.ts'
import { skills } from '/web/fixtures/skills.ts'
import { Button, OptionButton } from '/web/ui/button.tsx'
import { Dialog } from '/web/ui/dialog.tsx'
import { Eyebrow } from '/web/ui/eyebrow.tsx'
import {
  Field,
  FieldError,
  Input,
  Textarea,
  useFieldErrors,
} from '/web/ui/input.tsx'
import { Progress } from '/web/ui/progress.tsx'
import { Cube } from '/web/ui/shapes.tsx'
import { counted, plural } from '/web/lib/plural.ts'
import { notify } from '/web/ui/toast.tsx'

type Step = 'choose' | 'repos' | 'preview' | 'scratch'

const toggle = (list: string[], value: string) =>
  list.includes(value) ? list.filter((x) => x !== value) : [...list, value]

/** Diamonds linked by a line, filled up to the current step */
const Steps = ({ steps, current }: { steps: string[]; current: number }) => (
  <div class='flex items-center px-[22px] pt-4'>
    {steps.map((label, i) => (
      <div
        key={label}
        class={`flex items-center gap-2 ${
          i < steps.length - 1 ? 'flex-1' : ''
        }`}
      >
        <span
          aria-hidden='true'
          class={`diamond size-[11px] border ${
            i < current
              ? 'border-indigo bg-indigo'
              : i === current
              ? 'border-indigo bg-indigo-soft'
              : 'border-dashed border-line-control'
          }`}
        />
        <span
          class={`text-[13px] font-semibold ${
            i === current ? 'text-ink' : 'text-ink-muted'
          }`}
        >
          {label}
        </span>
        {i < steps.length - 1 && (
          <span
            class={`mx-2.5 min-w-4 flex-1 border-t-[1.5px] ${
              i < current
                ? 'border-indigo'
                : 'border-dashed border-line-control'
            }`}
          />
        )}
      </div>
    ))}
  </div>
)

const Choices = (
  { label, children }: { label: string; children: ComponentChildren },
) => (
  <div class='flex flex-col gap-2 text-[13px] font-semibold'>
    <span>{label}</span>
    <div class='flex flex-wrap gap-2 pb-1'>{children}</div>
  </div>
)

const Footer = ({ children }: { children: ComponentChildren }) => (
  <div class='flex flex-wrap gap-3.5 border-t border-line pt-[18px]'>
    {children}
  </div>
)

const created = (slug: string, imported: boolean) => {
  navigate({ href: `projet/${slug}` })
  notify({
    title: imported ? 'Projet importé' : 'Projet créé',
    body: imported
      ? 'Synchro toutes les 15 min. Active la synchro live pour recevoir PRs, reviews et CI en temps réel.'
      : 'Tu pourras lier un repo GitHub plus tard.',
    icon: FolderGit2,
    tone: 'verified',
  })
}

const SourceCard = (
  { icon, title, children, onClick }: {
    icon: ComponentChildren
    title: string
    children: ComponentChildren
    onClick: () => void
  },
) => (
  <button
    type='button'
    onClick={onClick}
    class='slab slab-lift flex cursor-pointer flex-col gap-3 p-5 text-left text-ink'
  >
    {icon}
    <span class='font-display text-[18px] leading-6 font-semibold'>
      {title}
    </span>
    <span class='text-[14px] leading-[22px] text-ink-muted'>{children}</span>
  </button>
)

type RepoItem = ApiOutput['GET/api/github/repositories'][number]
type RepoPreviewData = ApiOutput['GET/api/github/repository']

// The read of GitHub failed: say it, and offer to try again
const ReadError = ({ retry }: { retry: () => void }) => (
  <div
    role='alert'
    class='flex flex-wrap items-center gap-3 p-4 text-[14px] text-danger'
  >
    <span class='flex-1'>
      Pamoja n’a pas pu lire GitHub. Réessaie dans un instant.
    </span>
    <Button variant='secondary' size={34} onClick={retry}>Réessayer</Button>
  </div>
)

const Skeleton = ({ label }: { label: string }) => (
  <>
    <div aria-busy='true' class='flex flex-col gap-[9px] p-3'>
      {['w-[92%]', 'w-[74%]', 'w-[52%]'].map((width) => (
        <div
          key={width}
          class={`h-3 animate-skeleton rounded-sm bg-indigo-soft-side ${width}`}
        />
      ))}
    </div>
    <span class='px-3 pb-2 text-[13px] text-ink-muted'>{label}</span>
  </>
)

/** The public repos of the developer, read from GitHub (§5.4) */
const RepoList = (
  { pick, back }: { pick: (repo: RepoItem) => void; back: () => void },
) => {
  const [list, setList] = useState<RepoItem[]>()
  const [failed, setFailed] = useState(false)
  const load = () => {
    setFailed(false)
    setList(undefined)
    api['GET/api/github/repositories'].fetch().then(
      setList,
      () => setFailed(true),
    )
  }
  useEffect(load, [])
  return (
    <>
      <h2 class='font-display text-heading'>Tes repos publics</h2>
      <div class='flex flex-col gap-2.5 rounded-[8px] border border-line-strong bg-surface-000 pt-2 pr-3 pb-3 pl-2 inset-shadow-well'>
        {failed && <ReadError retry={load} />}
        {!failed && !list && <Skeleton label='Lecture de tes repos GitHub…' />}
        {list?.map((repo) => (
          <div
            key={repo.name}
            class='tile flex flex-wrap items-center gap-3 p-3'
          >
            <div class='flex min-w-[200px] flex-1 flex-col gap-[3px]'>
              <span class='font-mono text-[14px] leading-5 font-semibold'>
                {repo.owner}/{repo.name}
              </span>
              {repo.description && (
                <span class='text-[13px] leading-5 text-ink-muted'>
                  {repo.description}
                </span>
              )}
              <span class='font-mono text-[12px] leading-4 text-ink-muted'>
                {[
                  repo.language,
                  counted(repo.stars, 'étoile'),
                  repo.pushedAt ? ago(repo.pushedAt * 1000) : '',
                ].filter(Boolean).join(' · ')}
              </span>
            </div>
            {repo.existing
              ? (
                <span class='flex flex-col items-end gap-1'>
                  <span class='inline-flex h-[22px] items-center rounded-sm border border-verified bg-verified-soft px-2 font-mono text-[11px] leading-none font-medium tracking-[.06em] text-verified uppercase'>
                    Déjà sur Pamoja
                  </span>
                  <A
                    href={`projet/${repo.existing}`}
                    class='text-[13px] font-semibold'
                  >
                    Ouvrir le projet
                  </A>
                </span>
              )
              : (
                <Button
                  size={34}
                  aria-label={`Choisir ${repo.owner}/${repo.name}`}
                  onClick={() => pick(repo)}
                >
                  Choisir
                </Button>
              )}
          </div>
        ))}
        {list && !list.length && (
          <span class='p-4 text-[14px] text-ink-muted'>
            Aucun repo public à toi sur GitHub. Les forks et les repos
            d’organisation ne s’importent pas ici.
          </span>
        )}
      </div>
      <Button variant='secondary' size={36} onClick={back} class='self-start'>
        <ArrowLeft />
        Retour
      </Button>
    </>
  )
}

/**
 * What the import will bring: README, figures and languages read from
 * GitHub, with the skills read from its languages and topics, to validate
 * before anything is created
 */
const RepoPreview = ({ repo, back }: { repo: RepoItem; back: () => void }) => {
  const [preview, setPreview] = useState<RepoPreviewData>()
  const [failed, setFailed] = useState(false)
  const [picked, setPicked] = useState<string[]>([])
  const [needs, setNeeds] = useState<string[]>([])
  const [creating, setCreating] = useState(false)
  const load = () => {
    setFailed(false)
    api['GET/api/github/repository'].fetch({ name: repo.name }).then(
      (data) => {
        setPreview(data)
        setPicked(data.skills)
      },
      () => setFailed(true),
    )
  }
  useEffect(load, [])

  const create = async () => {
    if (creating) return
    setCreating(true)
    try {
      const { slug } = await api['POST/api/project/import'].fetch({
        name: repo.name,
        title: '',
        description: '',
        vision: '',
        skills: picked,
        needs,
      })
      await loadProjects()
      created(slug, true)
    } catch {
      setCreating(false)
      notify({
        title: 'Import impossible',
        body:
          'Pamoja n’a pas pu créer le projet. Vérifie que le repo est bien à toi, puis réessaie.',
        icon: FolderGit2,
        tone: 'danger',
      })
    }
  }

  const stats = preview
    ? [
      [preview.contributors, plural(preview.contributors, 'contributeur')],
      [
        preview.openIssues,
        plural(preview.openIssues, 'issue ouverte', 'issues ouvertes'),
      ],
      [
        preview.openPullRequests,
        plural(preview.openPullRequests, 'PR ouverte', 'PRs ouvertes'),
      ],
      [preview.stars, plural(preview.stars, 'étoile')],
    ] as const
    : []
  const summary = preview?.readme ? readmeSummary(preview.readme) : ''
  return (
    <>
      <div class='flex items-center gap-3'>
        <Cube size={38} />
        <div class='flex flex-col'>
          <span class='font-mono text-[15px] leading-5 font-semibold'>
            {repo.owner}/{repo.name}
          </span>
          <span class='text-[13px] text-ink-muted'>
            Aperçu de ce qui sera importé
          </span>
        </div>
      </div>
      {failed && <ReadError retry={load} />}
      {!failed && !preview && (
        <Skeleton label='Lecture du README, des langages et des issues…' />
      )}
      {preview && (
        <>
          <p class='rounded-md border border-line-strong bg-surface-000 px-3.5 py-3 text-[14px] leading-[22px] text-pretty whitespace-pre-line inset-shadow-well'>
            {summary || preview.description ||
              'Pas de README : la description du projet se complète après l’import.'}
          </p>
          <div class='grid grid-cols-2 gap-3 pr-1 sm:grid-cols-4'>
            {stats.map(([count, label]) => (
              <div key={label} class='tile flex flex-col gap-0.5 p-2.5'>
                <span class='font-mono text-[20px] leading-6 font-medium'>
                  {count}
                </span>
                <span class='text-[12px] leading-4 text-ink-muted'>
                  {label}
                </span>
              </div>
            ))}
          </div>
          {preview.languages.length > 0 && (
            <div class='flex flex-col gap-2'>
              <Eyebrow>Langages</Eyebrow>
              {preview.languages.map(({ name, share }) => (
                <div key={name} class='flex items-center gap-3'>
                  <span class='w-[90px] text-[13px]'>{name}</span>
                  <span class='flex-1'>
                    <Progress value={share} max={100} label={name} />
                  </span>
                  <span class='w-10 text-right font-mono text-[12px] leading-4 font-medium text-ink-muted'>
                    {share}%
                  </span>
                </div>
              ))}
            </div>
          )}
          <div class='slab-selected mr-2 flex flex-col gap-3 px-[18px] py-4'>
            <Eyebrow accent>Lu sur GitHub · à valider</Eyebrow>
            <span class='text-[13px] font-semibold'>Skills</span>
            <div class='flex flex-wrap gap-2 pb-1'>
              {preview.skills.map((skill) => (
                <OptionButton
                  key={skill}
                  pressed={picked.includes(skill)}
                  onClick={() => setPicked(toggle(picked, skill))}
                >
                  {skill}
                </OptionButton>
              ))}
              {!preview.skills.length && (
                <span class='text-[13px] text-ink-muted'>
                  Aucun langage reconnu : ajoute la stack après l’import.
                </span>
              )}
            </div>
            <span class='text-[13px] font-semibold'>Besoins</span>
            <div class='flex flex-wrap gap-2 pb-1'>
              {[...new Set([...needSuggestions, 'good first issue'])].map((
                need,
              ) => (
                <OptionButton
                  key={need}
                  pressed={needs.includes(need)}
                  onClick={() => setNeeds(toggle(needs, need))}
                >
                  {need}
                </OptionButton>
              ))}
            </div>
            <span class='text-[12px] text-ink-muted'>
              Clique pour retirer ou ajouter. Rien n’est publié avant « Créer le
              projet ».
            </span>
          </div>
        </>
      )}
      <Footer>
        <Button
          size={40}
          disabled={!preview}
          aria-busy={creating}
          onClick={create}
        >
          {creating ? 'Import…' : 'Créer le projet'}
        </Button>
        <Button variant='secondary' size={40} onClick={back}>Retour</Button>
      </Footer>
    </>
  )
}

const FromScratch = ({ back }: { back: () => void }) => {
  const [name, setName] = useState('')
  const [description, setDescription] = useState('')
  const [vision, setVision] = useState('')
  const [stack, setStack] = useState<string[]>([])
  const [visibility, setVisibility] = useState<'Public' | 'Privé'>('Public')
  const [needs, setNeeds] = useState<string[]>([])
  const { check, clear, control, field } = useFieldErrors<'name' | 'stack'>(
    'project',
  )
  const create = () => {
    const valid = check({
      name: !name.trim() && 'Donne un nom à ton projet.',
      stack: !stack.length && 'Choisis au moins une technologie.',
    })
    if (!valid) return
    created(
      createProject({
        name: name.trim(),
        description: description.trim() || 'Nouveau projet sur Pamoja.',
        vision: vision.trim(),
        stack,
        needs,
        visibility,
      }),
      false,
    )
  }
  return (
    <>
      <Field label='Nom' {...field('name')}>
        <Input
          {...control('name')}
          value={name}
          placeholder='Le nom de ton projet'
          onInput={(event) => {
            setName(event.currentTarget.value)
            clear('name')
          }}
        />
      </Field>
      <Field label='Description'>
        <Textarea
          rows={2}
          value={description}
          placeholder='Ce que fait le projet, en une ou deux phrases'
          onInput={(event) => setDescription(event.currentTarget.value)}
        />
      </Field>
      <Field label='Vision'>
        <Textarea
          rows={2}
          value={vision}
          placeholder='Où il va'
          onInput={(event) => setVision(event.currentTarget.value)}
        />
      </Field>
      <Choices label='Technologies'>
        {skills.filter((skill) =>
          !['Code review', 'Concurrency', 'Backend', 'UI'].includes(skill)
        ).map((skill, i) => (
          <OptionButton
            key={skill}
            id={i ? undefined : 'project-stack'}
            aria-describedby={field('stack').error
              ? 'project-stack-error'
              : undefined}
            pressed={stack.includes(skill)}
            onClick={() => {
              setStack(toggle(stack, skill))
              clear('stack')
            }}
          >
            {skill}
          </OptionButton>
        ))}
      </Choices>
      {field('stack').error && (
        <FieldError id='project-stack-error'>
          {field('stack').error}
        </FieldError>
      )}
      <Choices label='Visibilité'>
        {(['Public', 'Privé'] as const).map((value) => (
          <OptionButton
            key={value}
            pressed={visibility === value}
            onClick={() => setVisibility(value)}
          >
            {value}
          </OptionButton>
        ))}
      </Choices>
      <Choices label='Besoins'>
        {needSuggestions.map((need) => (
          <OptionButton
            key={need}
            pressed={needs.includes(need)}
            onClick={() => setNeeds(toggle(needs, need))}
          >
            {need}
          </OptionButton>
        ))}
      </Choices>
      <Footer>
        <Button size={40} onClick={create}>Créer le projet</Button>
        <Button variant='secondary' size={40} onClick={back}>Retour</Button>
      </Footer>
    </>
  )
}

const NewProject = () => {
  const [step, setStep] = useState<Step>('choose')
  const [repo, setRepo] = useState<RepoItem>()
  const steps = step === 'scratch'
    ? ['choose', 'scratch']
    : ['choose', 'repos', 'preview']
  const labels: Record<string, string> = {
    choose: 'Source',
    repos: 'Repo',
    preview: 'Aperçu',
    scratch: 'Projet',
  }
  return (
    <>
      <Steps
        steps={steps.map((key) => labels[key])}
        current={Math.max(0, steps.indexOf(step))}
      />
      <div class='flex flex-col gap-[18px] px-[22px] pt-5 pb-6'>
        {step === 'choose' && (
          <>
            <h2 class='font-display text-heading'>D’où vient ton projet ?</h2>
            <div class='grid grid-cols-[repeat(auto-fit,minmax(220px,1fr))] gap-5 pr-2 pb-2'>
              <SourceCard
                icon={
                  <span class='tile flex size-11 flex-none items-center justify-center'>
                    <Github />
                  </span>
                }
                title='Importer depuis GitHub'
                onClick={() => setStep('repos')}
              >
                Choisis un de tes repos publics. Pamoja propose les skills et
                les besoins, tu valides.
              </SourceCard>
              <SourceCard
                icon={<Cube size={44} />}
                title='Créer de zéro'
                onClick={() => setStep('scratch')}
              >
                Pour une idée qui n’a pas encore de repo. Tu pourras en lier un
                plus tard.
              </SourceCard>
            </div>
          </>
        )}
        {step === 'repos' && (
          <RepoList
            pick={(picked) => {
              setRepo(picked)
              setStep('preview')
            }}
            back={() => setStep('choose')}
          />
        )}
        {step === 'preview' && repo && (
          <RepoPreview
            repo={repo}
            back={() => setStep('repos')}
          />
        )}
        {step === 'scratch' && <FromScratch back={() => setStep('choose')} />}
      </div>
    </>
  )
}

/** Import a public GitHub repo or start from scratch (§5.2, §6.3) */
export const NewProjectDialog = () => (
  <Dialog id='new-project' title='Nouveau projet' width={680}>
    <NewProject />
  </Dialog>
)
