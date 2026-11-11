import { counted } from '/web/lib/plural.ts'
import type { ComponentChildren, JSX } from 'preact'
import { A, navigate, url } from '@01edu/signal-router'
import { CircleDot, FolderGit2, LifeBuoy } from '/web/assets/icons.tsx'
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
import { OptionButton } from '/web/ui/button.tsx'
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

const Filters = (
  { selects, children }: {
    selects: ComponentChildren
    children: ComponentChildren
  },
) => (
  <div class='mr-2 flex flex-col gap-3 rounded-lg border border-line-strong bg-surface-000 pt-3.5 pr-4 pb-4 pl-3.5 inset-shadow-well'>
    <div class='flex flex-wrap items-center gap-2.5'>{selects}</div>
    <div class='flex flex-wrap gap-2 pb-1'>{children}</div>
  </div>
)

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

/** Help that matches, project needs that fit, good first issues (§10.3) */
const workGroups = (): [string, Work[]][] => {
  const isMember = (p: Project) =>
    p.owner === me.login || p.members.some((m) => isMe(m.login))
  const help = matchingRequests(me).map(({ request, score }) => ({
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
  const needs = allProjects().filter((p) => !isMember(p)).flatMap((p) =>
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
      issue.state === 'open' && issue.labels.includes('good first issue') &&
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
  return [
    ['Demandes qui te correspondent', help],
    ['Besoins de projets', needs],
    ['good first issue', beginner],
  ]
}

const WorkList = () => (
  <>
    {workGroups().map(([label, items]) => (
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
