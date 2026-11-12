import { counted } from '/web/lib/plural.ts'
import { useEffect, useState } from 'preact/hooks'
import { helpCategories, type HelpCategory } from '/api/vocabulary.ts'
import { api, type ApiOutput } from '/web/lib/api.ts'
import { currentUser } from '/web/lib/session.ts'
import { openAssistant } from '/web/lib/assistant.ts'
import type { ComponentChildren, JSX } from 'preact'
import { A, navigate, url } from '@01edu/signal-router'
import {
  ChevronDown,
  CircleDot,
  FolderGit2,
  LifeBuoy,
  Sparkles,
} from '/web/assets/icons.tsx'
import { communities } from '/web/fixtures/communities.ts'
import { helpChanged, matchingRequests } from '/web/fixtures/help.ts'
import { issues } from '/web/fixtures/issues.ts'
import {
  isMe,
  type Login,
  me,
  people,
  peopleChanged,
  type Person,
  personOf,
} from '/web/fixtures/people.ts'
import {
  needSkills,
  type Project,
  projects,
  projectsChanged,
} from '/web/fixtures/projects.ts'
import { intents } from '/web/fixtures/skills.ts'
import { Batched } from '/web/ui/infinite-list.tsx'
import { Button, OptionButton } from '/web/ui/button.tsx'
import { DeveloperCard } from '/web/ui/developer-card.tsx'
import { githubUrl } from '/web/lib/links.ts'
import { Eyebrow } from '/web/ui/eyebrow.tsx'
import { Page } from '/web/ui/layout.tsx'
import { beginnerIssues, ProjectCard } from '/web/ui/project-card.tsx'
import { EmptyState, GhostSlab } from '/web/ui/states.tsx'
import { Tabs } from '/web/ui/tabs.tsx'
import { t, translate } from '/web/lib/language.ts'

type IconComponent = (props: JSX.IntrinsicElements['svg']) => JSX.Element

const stages = ['Idée', 'Prototype', 'Bêta', 'Production']
const activities = ['Très actif', 'Actif', 'Calme']

const sorted = (values: string[]) => [...new Set(values)].sort()

const allPeople = () =>
  (Object.values(people) as Person[]).filter((p) => !isMe(p.login as Login))
const allProjects = () => Object.values(projects as Record<string, Project>)

// Filters live in the URL: ?skill=Go&country=Sénégal
const param = (key: string) => url.params[key] ?? ''
// A switched on toggle is ?available=1: an empty value would read as off
const setParam = (key: string, value: string | boolean) =>
  navigate({
    params: { [key]: value === true ? '1' : value || null },
  })

const FilterSelect = (
  { name, label, options, feminine }: {
    name: string
    label: string
    options: string[]
    /** « toutes » instead of « tous » */
    feminine?: boolean
  },
) => (
  <select
    aria-label={label}
    value={param(name)}
    onChange={(event) => setParam(name, event.currentTarget.value)}
    class='well h-9 max-w-full px-2.5 text-[14px] leading-none text-ink'
  >
    <option value=''>
      {feminine
        ? t`${translate(label)} : toutes`
        : t`${translate(label)} : tous`}
    </option>
    {options.map((option) => (
      <option key={option} value={option}>{option}</option>
    ))}
  </select>
)

// On a phone the filters fold under one button, with how many are set: the
// results show on the first screen. Wider, they are always there.
const Filters = (
  { selects, keys, children }: {
    selects: ComponentChildren
    /** The URL params of these filters, to count those that are set */
    keys: string[]
    children: ComponentChildren
  },
) => {
  const [open, setOpen] = useState(false)
  const set = keys.filter((key) => param(key)).length
  return (
    <div class='mr-2 flex flex-col gap-3 rounded-lg border border-line-strong bg-surface-000 pt-3.5 pr-4 pb-4 pl-3.5 inset-shadow-well'>
      <button
        type='button'
        aria-expanded={open}
        onClick={() => setOpen(!open)}
        class='flex cursor-pointer items-center justify-between gap-3 text-[14px] leading-5 font-semibold text-ink sm:hidden'
      >
        <span>
          Filtres
          {set > 0 && <span class='text-indigo'>{` · ${set}`}</span>}
        </span>
        <ChevronDown
          class={`size-4 transition-transform ${open ? 'rotate-180' : ''}`}
        />
      </button>
      <div
        class={`flex-col gap-3 sm:flex ${open ? 'flex' : 'hidden'}`}
      >
        <div class='flex flex-wrap items-center gap-2.5'>{selects}</div>
        <div class='flex flex-wrap gap-2 pb-1'>{children}</div>
      </div>
    </div>
  )
}

const Count = ({ label, keys }: { label: string; keys: string[] }) => (
  <div class='flex items-center justify-between gap-3'>
    <Eyebrow>{label}</Eyebrow>
    {keys.some((key) => param(key)) && (
      <button
        type='button'
        onClick={() =>
          navigate({
            params: Object.fromEntries(keys.map((key) => [key, null])),
          })}
        class='cursor-pointer text-[13px] leading-none font-semibold text-indigo'
      >
        Réinitialiser les filtres
      </button>
    )}
  </div>
)

const Empty = ({ children }: { children: ComponentChildren }) => (
  <GhostSlab class='px-6 py-7'>
    <EmptyState>{children}</EmptyState>
  </GhostSlab>
)

// From the first batch again when the filters change (§12.7)
const filtersKey = () => url.relativePath + JSON.stringify(url.params)

const Developers = ({ all }: { all: Person[] }) => {
  const community = communities.find((c) => c.name === param('community'))
  const list = all.filter((p) =>
    (!param('skill') || p.skills.includes(param('skill'))) &&
    (!param('country') || p.country === param('country')) &&
    (!param('intent') || p.intents.includes(param('intent'))) &&
    (!param('available') || p.available) &&
    (!community || p.communities.includes(community.slug))
  )
  return (
    <>
      <Filters
        keys={['skill', 'country', 'community', 'intent', 'available']}
        selects={
          <>
            <FilterSelect
              name='skill'
              label='Skill'
              options={sorted(all.flatMap((p) => p.skills))}
            />
            <FilterSelect
              name='country'
              label='Pays'
              options={sorted(all.map((p) => p.country))}
            />
            <FilterSelect
              name='community'
              label='Communauté'
              feminine
              options={communities.map((c) => c.name)}
            />
          </>
        }
      >
        {intents.filter((intent) => all.some((p) => p.intents.includes(intent)))
          .map((intent) => (
            <OptionButton
              key={intent}
              pressed={param('intent') === intent}
              onClick={() =>
                setParam(
                  'intent',
                  param('intent') === intent ? '' : intent,
                )}
            >
              {intent}
            </OptionButton>
          ))}
        <OptionButton
          pressed={!!param('available')}
          onClick={() => setParam('available', !param('available'))}
        >
          Disponible
        </OptionButton>
      </Filters>
      <Count
        label={counted(list.length, 'développeur')}
        keys={['skill', 'country', 'community', 'intent', 'available']}
      />
      <Batched
        items={list}
        reset={filtersKey()}
        class='grid grid-cols-[repeat(auto-fill,minmax(min(100%,280px),1fr))] gap-x-7 gap-y-6 pr-2'
        row={(person) => <DeveloperCard key={person.login} person={person} />}
      />
      {!list.length && (
        <Empty>
          Personne ne correspond à ces filtres. Essaie d’en retirer un.
        </Empty>
      )}
    </>
  )
}

const Projects = ({ all }: { all: Project[] }) => {
  const list = all.filter((p) =>
    (!param('tech') || p.stack.includes(param('tech'))) &&
    (!param('stage') || p.stage === param('stage')) &&
    (!param('country') || personOf(p.owner).country === param('country')) &&
    (!param('activity') || p.activity === param('activity')) &&
    (!param('contributors') || p.needs.length > 0) &&
    (!param('beginners') || beginnerIssues(p) > 0)
  )
  return (
    <>
      <Filters
        keys={[
          'tech',
          'stage',
          'country',
          'activity',
          'contributors',
          'beginners',
        ]}
        selects={
          <>
            <FilterSelect
              name='tech'
              label='Techno'
              feminine
              options={sorted(all.flatMap((p) => p.stack))}
            />
            <FilterSelect name='stage' label='Stade' options={stages} />
            <FilterSelect
              name='country'
              label='Pays'
              options={sorted(
                all.map((p) => personOf(p.owner).country).filter(Boolean),
              )}
            />
            <FilterSelect
              name='activity'
              label='Activité'
              feminine
              options={activities}
            />
          </>
        }
      >
        <OptionButton
          pressed={!!param('contributors')}
          onClick={() => setParam('contributors', !param('contributors'))}
        >
          Cherche des contributeurs
        </OptionButton>
        <OptionButton
          pressed={!!param('beginners')}
          onClick={() => setParam('beginners', !param('beginners'))}
        >
          Beginner friendly
        </OptionButton>
      </Filters>
      <Count
        label={counted(list.length, 'projet')}
        keys={[
          'tech',
          'stage',
          'country',
          'activity',
          'contributors',
          'beginners',
        ]}
      />
      <Batched
        items={list}
        reset={filtersKey()}
        class='grid grid-cols-[repeat(auto-fill,minmax(min(100%,300px),1fr))] gap-x-7 gap-y-6 pr-2'
        row={(project) => <ProjectCard key={project.slug} project={project} />}
      />
      {!list.length && <Empty>Aucun projet ne correspond à ces filtres.</Empty>}
    </>
  )
}

type Work = {
  key: string
  icon: IconComponent
  color: string
  kind: string
  where: string
  title: string
  reason: string
  href: string
  cta: string
}

type ServerWork = ApiOutput['GET/api/work']
type ServerItem = ServerWork['help'][number]

// What the server computed for the developer (PAM-506): the real projects
// and requests, best match first
const fromServer = (work?: ServerWork) => {
  const item = (
    { id, title, project, score, skills, href }: ServerItem,
    look: Pick<Work, 'icon' | 'color' | 'kind' | 'cta'>,
  ): Work => ({
    ...look,
    key: `server-${look.kind}-${id}`,
    where: project || 'Sans projet',
    title,
    reason: skills.length
      ? t`Correspondance ${score} / 100 · ${skills.join(', ')}`
      : t`Correspondance ${score} / 100`,
    href,
  })
  return {
    help: (work?.help ?? []).map((i) =>
      item(i, {
        icon: LifeBuoy,
        color: 'text-indigo',
        kind: helpCategories[i.type as HelpCategory] ?? i.type,
        cta: 'Voir la demande',
      })
    ),
    needs: (work?.needs ?? []).map((i) =>
      item(i, {
        icon: FolderGit2,
        color: 'text-ink',
        kind: 'Besoin de projet',
        cta: 'Voir l’équipe',
      })
    ),
    issues: (work?.issues ?? []).map((i) =>
      item(i, {
        icon: CircleDot,
        color: 'text-verified',
        kind: 'good first issue',
        cta: 'Voir l’issue sur GitHub',
      })
    ),
  }
}

/**
 * Help that matches, project needs that fit, good first issues (§10.3): those
 * of the server first, then those of the demo
 */
const workGroups = (work?: ServerWork): [string, Work[]][] => {
  const server = fromServer(work)
  const isMember = (p: Project) =>
    p.owner === me.login || p.members.some((m) => isMe(m.login))
  const help = matchingRequests(me).filter(({ request }) => request.demo).map((
    { request, score },
  ) => ({
    key: request.id,
    icon: LifeBuoy,
    color: 'text-indigo',
    kind: request.type,
    where: request.project
      ? projects[request.project]?.name ?? request.project
      : 'Sans projet',
    title: request.title,
    reason: `Score ${score} / 100 · ${
      request.skills.filter((s) => me.skills.includes(s)).join(', ')
    }`,
    href: `help/${request.id}`,
    cta: 'Voir la demande',
  }))
  // good first issues have their own group below
  const needs = allProjects().filter((p) => p.demo && !isMember(p)).flatMap((
    p,
  ) =>
    p.needs.filter((need) => need !== 'good first issue').map((need) => ({
      project: p,
      need,
      stack: !needSkills[need],
      hits: (needSkills[need] ?? p.stack).filter((s) => me.skills.includes(s)),
    }))
  ).filter(({ hits }) => hits.length).map(({ project, need, stack, hits }) => ({
    key: `${project.slug}-${need}`,
    icon: FolderGit2,
    color: 'text-ink',
    kind: 'Besoin de projet',
    where: project.name,
    title: need,
    reason: stack
      ? t`Le projet est en ${hits.join(', ')}, que tu connais`
      : t`Tu as ${hits.join(', ')}`,
    href: `project/${project.slug}/team`,
    cta: 'Voir l’équipe',
  }))
  const shared = (p: Project) =>
    p.stack.filter((s) => me.skills.includes(s)).length
  const beginner = issues
    .filter((issue) =>
      issue.demo && issue.state === 'open' &&
      issue.labels.includes('good first issue') &&
      !isMember(projects[issue.project])
    )
    .sort((a, b) => shared(projects[b.project]) - shared(projects[a.project]))
    .map((issue) => {
      const project = projects[issue.project]
      return {
        key: `${issue.project}-${issue.number}`,
        icon: CircleDot,
        color: 'text-verified',
        kind: 'good first issue',
        where: project.name,
        title: `#${issue.number} ${issue.title}`,
        reason: project.stack.join(', '),
        href: githubUrl(project, 'issues', issue.number),
        cta: 'Voir l’issue sur GitHub',
      }
    })
  // The demo projects are in the base too: a row of the demo that the
  // server already gives is shown once
  const join = (fromServer: Work[], demo: Work[]) => {
    const known = new Set(fromServer.map((w) => `${w.where}|${w.title}`))
    return [
      ...fromServer,
      ...demo.filter((w) => !known.has(`${w.where}|${w.title}`)),
    ]
  }
  return [
    ['Demandes qui te correspondent', join(server.help, help)],
    ['Besoins de projets', join(server.needs, needs)],
    ['good first issue', join(server.issues, beginner)],
  ]
}

const WorkList = () => {
  const [work, setWork] = useState<ServerWork>()
  const userId = currentUser.value?.userId
  // Read for each developer signed in: computed by the server, never here
  useEffect(() => {
    if (!userId) return setWork(undefined)
    api['GET/api/work'].fetch().then(setWork, () => {})
  }, [userId])
  return (
    <>
      {userId && <AskAssistant />}
      {work?.firstStep && <FirstStep step={work.firstStep} />}
      <WorkGroups groups={workGroups(work)} />
    </>
  )
}

// The Assistant lives in its panel, on every page (§11): here, a way in
const AskAssistant = () => (
  <section class='slab mr-2 flex flex-wrap items-center gap-x-4 gap-y-3 px-5 py-4'>
    <span class='flex min-w-[220px] flex-1 flex-col gap-0.5'>
      <span class='text-[15px] leading-[22px] font-semibold'>
        Tu ne sais pas par où commencer ?
      </span>
      <span class='text-[13px] text-ink-muted'>
        L’Assistant te répond à partir de ce qui te correspond ici.
      </span>
    </span>
    <Button
      size={40}
      onClick={() =>
        openAssistant('Je veux contribuer à l’open source, par où commencer ?')}
    >
      <Sparkles />
      Demander à l’Assistant
    </Button>
  </section>
)

/**
 * One thing to begin with, for who has never contributed (§10.3): the
 * first group of State of Dev Sénégal 2026 wants to, but does not know
 * where to start
 */
const FirstStep = ({ step }: { step: ServerItem }) => {
  // An issue on GitHub, or a need of a project, on Pamoja
  const issue = step.href.startsWith('http')
  return (
    <section class='slab-selected mr-2 flex flex-col gap-4 px-5 py-[18px]'>
      <Eyebrow accent>Ton premier pas · {step.project}</Eyebrow>
      <div class='flex flex-col gap-1'>
        <span class='font-display text-[17px] leading-[22px] font-semibold text-pretty'>
          {step.title}
        </span>
        <span class='text-[13px] text-ink-muted'>
          {step.type === 'documentation'
            ? 'De la documentation : une vraie contribution, et une bonne première.'
            : step.skills.length
            ? t`Dans ce que tu connais : ${step.skills.join(', ')}.`
            : 'Une issue choisie pour débuter.'}
        </span>
      </div>
      <ol class='flex list-decimal flex-col gap-1.5 pl-5 text-[14px] leading-[22px]'>
        <li>
          {issue
            ? 'Dis sur l’issue que tu la prends, et pose tes questions.'
            : 'Présente-toi à l’équipe du projet et demande par quoi commencer.'}
        </li>
        <li>Fais le changement sur une branche de ton fork.</li>
        <li>Ouvre la PR et décris ce que tu as fait.</li>
      </ol>
      <div class='flex flex-wrap gap-3'>
        <Button size={40} href={step.href}>
          {issue ? 'Voir l’issue sur GitHub' : 'Voir l’équipe du projet'}
        </Button>
        <Button
          variant='secondary'
          size={40}
          href='help/new'
          params={{
            mentor: issue ? step.href : `/${step.href}`,
            about: step.project
              ? `${step.title} (${step.project})`
              : step.title,
          }}
        >
          Demander un mentor
        </Button>
      </div>
    </section>
  )
}

const WorkGroups = ({ groups }: { groups: [string, Work[]][] }) => (
  <>
    {groups.map(([label, items]) => (
      <section key={label} class='slab mr-2 overflow-hidden'>
        <div class='flex px-5 pt-[18px] pb-4'>
          <Eyebrow>{label} · {items.length}</Eyebrow>
        </div>
        {items.map(({ key, icon: Icon, color, ...item }) => (
          <A
            key={key}
            href={item.href}
            class='flex flex-wrap items-center gap-3.5 border-t border-line px-5 py-3.5 text-ink no-underline hover:bg-surface-000 hover:no-underline'
          >
            <span
              class={`tile flex size-9 flex-none items-center justify-center ${color}`}
            >
              <Icon class='size-[18px]' />
            </span>
            <span class='flex min-w-[220px] flex-1 flex-col gap-0.5'>
              <span class='font-mono text-[11px] leading-4 font-medium tracking-[.06em] text-ink-muted uppercase'>
                {item.kind} · {item.where}
              </span>
              <span class='text-[15px] leading-[22px] font-semibold text-pretty'>
                {item.title}
              </span>
              <span class='text-[13px] text-ink-muted'>{item.reason}</span>
            </span>
            <span class='text-[13px] font-semibold whitespace-nowrap text-indigo'>
              {item.cta}
            </span>
          </A>
        ))}
        {!items.length && (
          <div class='border-t border-line px-5 py-[18px] text-[14px] text-ink-muted'>
            Rien pour l’instant dans cette catégorie.
          </div>
        )}
      </section>
    ))}
  </>
)

const tabs = [
  ['', 'Développeurs'],
  ['projects', 'Projets'],
  ['work', 'Sur quoi puis-je travailler ?'],
] as const

/** /explore, /explore/projects, /explore/work (§10.3) */
export const ExplorePage = () => {
  // Read here: the projects and requests of the API arrive after the first
  // render, and the tabs list them
  projectsChanged.value
  helpChanged.value
  peopleChanged.value
  const segment = url.relativePath.slice(1).split('/')[1] ?? ''
  const current = tabs.find(([key]) => key === segment)?.[0] ?? ''
  return (
    <Page title='Explorer' class='flex flex-col gap-6 pt-5'>
      <Tabs
        label='Explorer'
        current={current}
        wide
        tabs={tabs.map(([key, label]) => ({
          key,
          label,
          href: key ? `explore/${key}` : 'explore',
        }))}
      />
      {/* Read the URL filters: they render again only when their props do */}
      {current === '' && <Developers all={allPeople()} />}
      {current === 'projects' && <Projects all={allProjects()} />}
      {current === 'work' && <WorkList />}
    </Page>
  )
}
