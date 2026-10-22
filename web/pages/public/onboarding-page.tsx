import type { ComponentChildren, JSX } from 'preact'
import { useEffect, useState } from 'preact/hooks'
import { navigate, url } from '@01edu/signal-router'
import {
  BellOff,
  FolderGit2,
  Github,
  Sparkles,
  Sun,
  Zap,
} from '/web/assets/icons.tsx'
import {
  completeOnboarding,
  type MatchingMode,
  type OnboardingDraft,
  onboardingDraft,
} from '/web/fixtures/onboarding.ts'
import { countryCodeOf, countryName } from '/api/vocabulary.ts'
import { countries, me } from '/web/fixtures/people.ts'
import { api, type ApiOutput, isQuotaError } from '/web/lib/api.ts'
import { loadProjects } from '/web/lib/session.ts'
import { domains, intents } from '/web/fixtures/skills.ts'
import { Avatar } from '/web/ui/avatar.tsx'
import { Button, OptionButton } from '/web/ui/button.tsx'
import { SkillPicker } from '/web/ui/chips.tsx'
import { Field, Input } from '/web/ui/input.tsx'
import { Page } from '/web/ui/layout.tsx'
import { LogoMark } from '/web/ui/logo.tsx'
import { Progress } from '/web/ui/progress.tsx'
import { notify } from '/web/ui/toast.tsx'
import { t } from '/web/lib/language.ts'
import { LIMITS } from '/api/limits.ts'

type IconComponent = (props: JSX.IntrinsicElements['svg']) => JSX.Element
type Update = (patch: Partial<OnboardingDraft>) => void

const steps = ['Profil', 'Skills', 'Intentions', 'Matching', 'Premier projet']

const matchingOptions: [MatchingMode, string, IconComponent][] = [
  ['Instantané', 'Une notification dès qu’une demande te correspond.', Zap],
  // The e-mail itself comes with PAM-509 (QA-31)
  [
    'Résumé quotidien',
    'Un récapitulatif chaque matin à 8 h, par e-mail (bientôt).',
    Sun,
  ],
  ['Désactivé', 'Tu cherches toi-même dans Aide et Explorer.', BellOff],
]

const toggle = (list: string[], value: string) =>
  list.includes(value) ? list.filter((v) => v !== value) : [...list, value]

/** Done steps are filled, the current one is soft, the next ones dashed */
const Stepper = ({ step }: { step: number }) => (
  <ol class='flex items-center overflow-x-auto pb-0.5 [scrollbar-width:none]'>
    {steps.map((name, i) => {
      const last = i === steps.length - 1
      return (
        <li
          key={name}
          aria-current={i === step ? 'step' : undefined}
          class={`flex items-center gap-2 ${last ? 'flex-none' : 'flex-1'}`}
        >
          <span
            aria-hidden='true'
            class={`diamond size-3 border ${
              i < step
                ? 'border-indigo bg-indigo'
                : i === step
                ? 'border-indigo bg-indigo-soft'
                : 'border-dashed border-line-control'
            }`}
          />
          <span
            class={`text-[13px] font-semibold whitespace-nowrap ${
              i === step ? 'text-ink' : 'text-ink-muted'
            }`}
          >
            {name}
          </span>
          {!last && (
            <span
              class={`mx-2.5 min-w-3 flex-1 border-t-[1.5px] ${
                i < step ? 'border-indigo' : 'border-dashed border-line-control'
              }`}
            />
          )}
        </li>
      )
    })}
  </ol>
)

const Title = (
  { title, children }: { title: string; children: ComponentChildren },
) => (
  <div class='flex flex-col gap-1.5'>
    <h1 class='font-display text-[28px] leading-[34px] font-bold'>{title}</h1>
    <span class='text-[15px] text-ink-muted'>{children}</span>
  </div>
)

const Choices = ({ children }: { children: ComponentChildren }) => (
  <div class='flex flex-wrap gap-2 pb-1'>{children}</div>
)

/** A choice with an icon and a line of explanation, pressed once picked */
const OptionCard = (
  { pressed, onClick, icon: Icon, label, description }: {
    pressed: boolean
    onClick: () => void
    icon: IconComponent
    label: string
    description: string
  },
) => (
  <button
    type='button'
    aria-pressed={pressed}
    onClick={onClick}
    class={`flex w-full cursor-pointer items-start gap-3 rounded-[8px] border p-3.5 text-left text-ink transition-[translate,box-shadow] duration-120 ease-out active:translate-x-[2.6px] active:translate-y-[1.5px] active:shadow-none ${
      pressed
        ? 'border-indigo bg-indigo-soft shadow-key-selected'
        : 'border-figure-edge bg-surface-100 shadow-tile'
    }`}
  >
    <span class={`flex pt-0.5 ${pressed ? 'text-indigo' : 'text-ink'}`}>
      <Icon class='size-[18px]' />
    </span>
    <span class='flex flex-1 flex-col gap-[3px]'>
      <span class='font-semibold'>{label}</span>
      <span class='text-[13px] leading-5 text-ink-muted'>{description}</span>
    </span>
  </button>
)

const ProfileStep = (
  { draft, update }: { draft: OnboardingDraft; update: Update },
) => (
  <>
    <Title title='On part de ton GitHub'>
      Avatar, nom et bio viennent de GitHub. Complète le reste.
    </Title>
    <div class='flex flex-wrap items-center gap-3.5 rounded-lg border border-line-strong bg-surface-000 p-3.5 inset-shadow-well'>
      <Avatar name={me.name} src={me.avatarUrl} size={52} />
      <div class='flex min-w-[180px] flex-1 flex-col gap-0.5'>
        <span class='font-display text-[18px] leading-6 font-semibold'>
          {me.name}
        </span>
        <span class='text-[13px] leading-5 text-pretty text-ink-muted'>
          {me.bio}
        </span>
      </div>
      <span class='inline-flex items-center gap-1.5 font-mono text-[12px] leading-none font-medium whitespace-nowrap text-ink-muted'>
        <Github class='size-3.5' />
        <span>@{me.login}</span>
      </span>
    </div>
    <Field label='Accroche'>
      <Input
        value={draft.headline}
        limit={LIMITS.headline}
        placeholder='Ce que tu construis, en une phrase'
        onInput={(event) => update({ headline: event.currentTarget.value })}
      />
    </Field>
    <div class='grid grid-cols-[repeat(auto-fit,minmax(200px,1fr))] gap-3.5'>
      <Field label='Pays'>
        {
          /* One field: the 54 countries of Africa are suggested as you type,
          any other country is written as is */
        }
        <Input
          value={draft.country}
          limit={LIMITS.country}
          list='onboarding-countries'
          placeholder='Le pays où tu vis'
          autocomplete='country-name'
          onInput={(event) => update({ country: event.currentTarget.value })}
          // « senegal », « Senegal » or « Sénégal » become « Sénégal »
          onBlur={(event) => {
            const code = countryCodeOf(event.currentTarget.value)
            code && update({ country: countryName(code) })
          }}
        />
        <datalist id='onboarding-countries'>
          {Object.keys(countries).map((country) => (
            <option key={country} value={country} />
          ))}
        </datalist>
      </Field>
      <Field label='Ville'>
        <Input
          value={draft.city}
          limit={LIMITS.city}
          onInput={(event) => update({ city: event.currentTarget.value })}
        />
      </Field>
    </div>
    <Field label='Site (facultatif)'>
      <Input
        value={draft.website}
        limit={LIMITS.website}
        placeholder='ton-site.dev'
        onInput={(event) => update({ website: event.currentTarget.value })}
      />
    </Field>
  </>
)

const SkillsStep = (
  { draft, update }: { draft: OnboardingDraft; update: Update },
) => (
  <>
    <Title title='Tes skills'>
      D’abord les domaines, puis les technologies. Le matching s’appuie dessus.
    </Title>
    <div class='flex flex-col gap-2 text-[13px] font-semibold'>
      <span>Domaines</span>
      <Choices>
        {domains.map((domain) => (
          <OptionButton
            key={domain}
            pressed={draft.domains.includes(domain)}
            onClick={() => update({ domains: toggle(draft.domains, domain) })}
          >
            {domain}
          </OptionButton>
        ))}
      </Choices>
    </div>
    <SkillPicker
      label='Technologies'
      inputLabel='Ajouter une technologie'
      placeholder='Tape une techno (essaie « postgres »)'
      empty='Aucune techno connue ne ressemble à ça.'
      note='Vocabulaire contrôlé : Pamoja propose le nom exact de la techno.'
      limit={6}
      skills={draft.skills}
      onChange={(skills) => update({ skills })}
    />
  </>
)

const IntentsStep = (
  { draft, update }: { draft: OnboardingDraft; update: Update },
) => (
  <>
    <Title title='Ce que tu cherches'>
      Choisis autant d’intentions que tu veux. Elles apparaissent sur ton
      profil.
    </Title>
    <Choices>
      {intents.map((intent) => (
        <OptionButton
          key={intent}
          pressed={draft.intents.includes(intent)}
          onClick={() => update({ intents: toggle(draft.intents, intent) })}
        >
          {intent}
        </OptionButton>
      ))}
    </Choices>
  </>
)

const MatchingStep = (
  { draft, update }: { draft: OnboardingDraft; update: Update },
) => (
  <>
    <Title title='Quand une demande te correspond'>
      Tu pourras changer ça dans les réglages.
    </Title>
    <div class='flex flex-col gap-2.5 pr-1'>
      {matchingOptions.map(([mode, description, icon]) => (
        <OptionCard
          key={mode}
          pressed={draft.matching === mode}
          onClick={() => update({ matching: mode })}
          icon={icon}
          label={mode}
          description={description}
        />
      ))}
    </div>
  </>
)

type RepoItem = ApiOutput['GET/api/github/repositories'][number]

// Public repos of the developer not on Pamoja yet, read from GitHub (§5.4)
const ProjectStep = (
  { repo, pick }: { repo: string | null; pick: (name: string) => void },
) => {
  const [list, setList] = useState<RepoItem[]>()
  const [failed, setFailed] = useState<false | 'quota' | 'error'>(false)
  useEffect(() => {
    api['GET/api/github/repositories'].fetch().then(
      (repos) => setList(repos.filter((r) => !r.existing)),
      (err) => setFailed(isQuotaError(err) ? 'quota' : 'error'),
    )
  }, [])
  return (
    <>
      <Title title='Un premier projet ?'>
        Importe un repo pour montrer ce que tu construis. Facultatif.
      </Title>
      {!list && !failed && (
        <span aria-busy='true' class='text-[14px] text-ink-muted'>
          Lecture de tes repos GitHub…
        </span>
      )}
      {failed && (
        <span class='text-[14px] text-ink-muted'>
          {failed === 'quota'
            ? 'GitHub limite le nombre de lectures par heure et la limite est atteinte.'
            : 'Pamoja n’a pas pu lire tes repos.'}{' '}
          Termine sans projet : tu pourras en importer un depuis « Créer ».
        </span>
      )}
      {list?.length
        ? (
          <div class='flex flex-col gap-2.5 pr-1'>
            {list.map(({ owner, name, description, language }) => (
              <OptionCard
                key={name}
                pressed={repo === name}
                onClick={() => pick(name)}
                icon={FolderGit2}
                label={`${owner}/${name}`}
                description={[description, language].filter(Boolean)
                  .join(' · ')}
              />
            ))}
          </div>
        )
        : list && (
          <span class='text-[14px] text-ink-muted'>
            Aucun repo public à importer : tes repos sont déjà sur Pamoja, ou ce
            sont des forks.
          </span>
        )}
    </>
  )
}

const stepContents = [ProfileStep, SkillsStep, IntentsStep, MatchingStep]

/**
 * /onboarding, after the first GitHub login: profile, skills, intents,
 * matching and an optional first project, in less than 2 minutes (§6.1)
 */
export const OnboardingPage = () => {
  const step = Math.min(
    steps.length - 1,
    Math.max(0, (Number(url.params.etape) || 1) - 1),
  )
  const setStep = (next: number) =>
    navigate({ params: { etape: next ? next + 1 : null } })
  const [draft, setDraft] = useState(onboardingDraft)
  const [repo, setRepo] = useState<string | null>(null)
  const update: Update = (patch) => setDraft({ ...draft, ...patch })
  const last = step === steps.length - 1
  const [importing, setImporting] = useState(false)
  const finish = async (withRepo: boolean) => {
    if (importing) return
    completeOnboarding(draft)
    let slug = ''
    if (withRepo && repo) {
      setImporting(true)
      try {
        // The stack comes from the languages read on GitHub (§5.4)
        slug = (await api['POST/api/project/import'].fetch({
          name: repo,
          title: '',
          description: '',
          vision: '',
          skills: [],
          needs: [],
        })).slug
        await loadProjects()
      } catch {
        notify({
          title: 'Import impossible',
          body: 'Ton profil est prêt. Importe le projet depuis « Créer ».',
          icon: FolderGit2,
          tone: 'danger',
        })
      }
    }
    navigate({ href: slug ? `projet/${slug}` : '.' })
    notify({
      title: 'Bienvenue sur Pamoja',
      body:
        'Ton profil est prêt. Les demandes qui te correspondent arrivent dans ton fil.',
      icon: Sparkles,
      tone: 'verified',
    })
  }
  const Content = stepContents[step]
  return (
    <Page title='Bienvenue' heading={false} class='flex min-h-screen flex-col'>
      <header class='flex flex-wrap items-center gap-4 px-7 py-[18px]'>
        <LogoMark size={30} />
        <span class='font-display text-[21px] leading-none font-bold'>
          Pamoja
        </span>
        <span class='flex-1' />
        <span class='font-mono text-label text-ink-muted uppercase'>
          {t`Étape ${step + 1} sur ${steps.length} · moins de 2 minutes`}
        </span>
      </header>
      <main class='mx-auto flex w-full max-w-[760px] flex-1 flex-col gap-6 px-6 pt-3 pb-[120px]'>
        <Stepper step={step} />
        <section class='slab mr-2 flex animate-enter flex-col gap-[22px] p-7'>
          {last
            ? (
              <ProjectStep
                repo={repo}
                pick={(name) => setRepo(repo === name ? null : name)}
              />
            )
            : <Content draft={draft} update={update} />}
          <div class='flex flex-wrap items-center gap-3.5 border-t border-line pt-5'>
            {step > 0 && (
              <Button
                variant='secondary'
                size={42}
                onClick={() => setStep(step - 1)}
              >
                Retour
              </Button>
            )}
            <span class='flex-1' />
            {last && (
              <button
                type='button'
                // While the first project imports, finishing twice would
                // import it twice
                disabled={importing}
                onClick={() => finish(false)}
                class='cursor-pointer px-2 text-[14px] leading-none font-semibold text-ink-muted disabled:cursor-default disabled:opacity-45'
              >
                Passer
              </button>
            )}
            <Button
              size={42}
              aria-busy={importing}
              onClick={() =>
                last ? finish(true) : setStep(step + 1)}
            >
              {importing
                ? 'Import…'
                : !last
                ? 'Continuer'
                : repo
                ? 'Importer et terminer'
                : 'Terminer'}
            </Button>
          </div>
        </section>
        <Progress
          value={step + 1}
          max={steps.length}
          label='Progression de l’onboarding'
          thin
        />
      </main>
    </Page>
  )
}
