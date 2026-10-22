import { useState } from 'preact/hooks'
import { navigate } from '@01edu/signal-router'
import { Check, CircleAlert, Clock, Lock, Zap } from '/web/assets/icons.tsx'
import { activityChanged } from '/web/fixtures/activity.ts'
import { me } from '/web/fixtures/people.ts'
import {
  needSuggestions,
  type Project,
  updateProject,
} from '/web/fixtures/projects.ts'
import { Button } from '/web/ui/button.tsx'
import { RemovableChip, SuggestionChip } from '/web/ui/chips.tsx'
import { Eyebrow } from '/web/ui/eyebrow.tsx'
import { Field, Input, Textarea } from '/web/ui/input.tsx'
import { GhostSlab } from '/web/ui/states.tsx'
import { notify } from '/web/ui/toast.tsx'
import { importableRepos, linkRepo } from '/web/fixtures/repos.ts'
import { MemberRows } from '/web/pages/project/team-tab.tsx'
import { t } from '/web/lib/language.ts'

type Draft = Pick<Project, 'name' | 'description' | 'needs'> & {
  vision: string
}

const draftOf = (project: Project): Draft => ({
  name: project.name,
  description: project.description,
  vision: project.vision ?? '',
  needs: [...project.needs],
})

const Information = ({ project }: { project: Project }) => {
  const [draft, setDraft] = useState(() => draftOf(project))
  const [need, setNeed] = useState('')
  const update = (patch: Partial<Draft>) => setDraft({ ...draft, ...patch })
  const dirty = JSON.stringify(draft) !== JSON.stringify(draftOf(project))
  const addNeed = (value: string) => update({ needs: [...draft.needs, value] })

  const save = () => {
    if (!draft.name.trim()) {
      return notify({
        title: 'Nom manquant',
        body: 'Donne un nom au projet.',
        icon: CircleAlert,
        tone: 'danger',
      })
    }
    updateProject(
      project,
      { ...draft, name: draft.name.trim() },
      'Réglages du projet mis à jour',
    )
    setDraft(draftOf(project))
    notify({
      title: 'Réglages enregistrés',
      body: 'Les besoins apparaissent dans « On cherche » et dans le matching.',
      icon: Check,
      tone: 'verified',
    })
  }

  return (
    <div class='slab flex min-w-0 flex-col gap-5 p-6'>
      <Eyebrow>Informations</Eyebrow>
      <Field label='Nom'>
        <Input
          value={draft.name}
          onInput={(event) => update({ name: event.currentTarget.value })}
        />
      </Field>
      <Field label='Description'>
        <Textarea
          rows={3}
          value={draft.description}
          onInput={(event) =>
            update({ description: event.currentTarget.value })}
        />
      </Field>
      <Field label='Vision'>
        <Textarea
          rows={2}
          value={draft.vision}
          placeholder='Où va le projet, en une phrase'
          onInput={(event) => update({ vision: event.currentTarget.value })}
        />
      </Field>
      <div class='flex flex-col gap-2 text-[13px] font-semibold'>
        <span>
          Besoins · affichés dans « On cherche » et utilisés par le matching
        </span>
        <div class='flex flex-wrap gap-2'>
          {draft.needs.map((value, i) => (
            <RemovableChip
              key={value}
              onRemove={() =>
                update({ needs: draft.needs.filter((_, j) => j !== i) })}
            >
              {value}
            </RemovableChip>
          ))}
        </div>
        <Input
          value={need}
          placeholder='Ajouter un besoin puis Entrée'
          aria-label='Ajouter un besoin'
          onInput={(event) => setNeed(event.currentTarget.value)}
          onKeyDown={(event) => {
            if (event.key !== 'Enter' || !need.trim()) return
            event.preventDefault()
            addNeed(need.trim())
            setNeed('')
          }}
        />
        <div class='flex flex-wrap gap-2'>
          {needSuggestions.filter((value) => !draft.needs.includes(value))
            .map((value) => (
              <SuggestionChip
                key={value}
                onClick={() => addNeed(value)}
              >
                {value}
              </SuggestionChip>
            ))}
        </div>
      </div>
      <div class='flex flex-wrap gap-3.5 border-t border-line pt-5'>
        <Button size={40} disabled={!dirty} onClick={save}>Enregistrer</Button>
        <Button
          variant='secondary'
          size={40}
          onClick={() => setDraft(draftOf(project))}
        >
          Annuler
        </Button>
      </div>
    </div>
  )
}

const syncModes = [
  [
    'live',
    'Synchro live',
    'Temps réel via la GitHub App : PRs, reviews, CI et releases arrivent dans #suivi en quelques secondes.',
    Zap,
  ],
  [
    'poll',
    'Synchro toutes les 15 min',
    'Lecture périodique de l’API GitHub, sans installation.',
    Clock,
  ],
] as const

// A project created without a repo gets one here, as the creation form
// promised: its issues, PRs and languages come with it (§5.4)
const LinkRepo = ({ project }: { project: Project }) => {
  const list = importableRepos()
  return (
    <div class='flex flex-col gap-2.5'>
      <span class='text-[14px] text-ink-muted'>
        Ce projet n’est pas encore lié à un repo GitHub. {list.length
          ? 'Choisis un de tes repos publics :'
          : 'Tous tes repos publics sont déjà sur Pamoja.'}
      </span>
      {list.map((repo) => (
        <div
          key={repo.name}
          class='flex flex-wrap items-center gap-3 border-t border-line pt-2.5'
        >
          <span class='flex min-w-0 flex-1 flex-col'>
            <span class='font-mono text-[14px] font-medium'>
              {repo.owner}/{repo.name}
            </span>
            <span class='text-[12px] text-ink-muted'>{repo.description}</span>
          </span>
          <Button
            size={34}
            aria-label={`Lier ${repo.owner}/${repo.name}`}
            onClick={() => {
              linkRepo(project, repo)
              notify({
                title: 'Repo lié',
                body:
                  t`${repo.owner}/${repo.name} : issues et PRs importées, synchro toutes les 15 min.`,
                icon: Check,
                tone: 'verified',
              })
            }}
          >
            Lier
          </Button>
        </div>
      ))}
    </div>
  )
}

const SyncMode = ({ project }: { project: Project }) => {
  const pick = (mode: Project['sync']) => {
    if (mode === project.sync) return
    // Live needs the GitHub App and its three checks first (§5.4)
    if (mode === 'live' && !project.appInstalled) {
      return navigate({ params: { dialog: 'sync' } })
    }
    updateProject(
      project,
      { sync: mode },
      mode === 'live'
        ? 'Synchro live réactivée'
        : 'Synchro passée à toutes les 15 min',
    )
  }
  return (
    <section class='slab flex flex-col gap-3 p-[22px]'>
      <Eyebrow>Mode de synchro</Eyebrow>
      {project.sync === 'none' && <LinkRepo project={project} />}
      {project.sync !== 'none' &&
        syncModes.map(([mode, label, description, Icon]) => {
          const active = project.sync === mode
          return (
            <button
              key={mode}
              type='button'
              aria-pressed={active}
              onClick={() => pick(mode)}
              class={`flex w-[calc(100%-4px)] cursor-pointer items-start gap-3 rounded-[8px] border p-3.5 text-left text-ink transition-[translate,box-shadow] duration-120 ease-out active:translate-x-[2.6px] active:translate-y-[1.5px] active:shadow-none ${
                active
                  ? 'border-indigo bg-indigo-soft shadow-key-selected'
                  : 'border-figure-edge bg-surface-100 shadow-tile'
              }`}
            >
              <span class={`pt-0.5 ${active ? 'text-indigo' : 'text-ink'}`}>
                <Icon class='size-[18px]' />
              </span>
              <span class='flex flex-1 flex-col gap-1'>
                <span class='flex justify-between gap-2 font-semibold'>
                  {label}
                  {active && (
                    <span class='font-mono text-[11px] leading-[18px] font-medium tracking-[.06em] text-indigo uppercase'>
                      Actif
                    </span>
                  )}
                </span>
                <span class='text-[13px] leading-5 text-ink-muted'>
                  {description}
                </span>
              </span>
            </button>
          )
        })}
    </section>
  )
}

/** Owner only: information, needs, sync mode and roles (§6.3) */
export const SettingsTab = ({ project }: { project: Project }) => {
  activityChanged.value
  if (project.owner !== me.login) {
    return (
      <GhostSlab class='px-6 py-10'>
        <div class='flex flex-col items-center gap-3 text-center'>
          <Lock class='text-ink-muted' />
          <span class='font-display text-[18px] leading-6 font-semibold'>
            Réservé au Propriétaire
          </span>
          <span class='text-[14px] text-ink-muted'>
            Seul le Propriétaire modifie les informations, les besoins, les
            rôles et la synchro.
          </span>
        </div>
      </GhostSlab>
    )
  }
  return (
    <div class='mr-2 grid items-start gap-8 lg:grid-cols-[minmax(0,2fr)_minmax(0,1fr)]'>
      <Information key={project.slug} project={project} />
      <div class='flex min-w-0 flex-col gap-8'>
        <SyncMode project={project} />
        <section class='slab overflow-hidden'>
          <div class='flex px-5 pt-[18px] pb-4'>
            <Eyebrow>Rôles</Eyebrow>
          </div>
          <MemberRows project={project} isOwner />
        </section>
      </div>
    </div>
  )
}
