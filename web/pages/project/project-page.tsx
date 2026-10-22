import { url } from '@01edu/signal-router'
import {
  Check,
  CircleSlash,
  Clock,
  Github,
  LifeBuoy,
  Plus,
  Zap,
} from '/web/assets/icons.tsx'
import {
  applications,
  applicationsChanged,
} from '/web/fixtures/applications.ts'
import { unreadIn } from '/web/fixtures/channels.ts'
import {
  helpChanged,
  helpRequests,
  type HelpStatus,
} from '/web/fixtures/help.ts'
import { issues } from '/web/fixtures/issues.ts'
import { isMe, me } from '/web/fixtures/people.ts'
import {
  type Project,
  projects,
  projectsChanged,
  type ProjectSlug,
  toggleFollow,
} from '/web/fixtures/projects.ts'
import { pullRequests } from '/web/fixtures/pull-requests.ts'
import { repoPath } from '/web/lib/links.ts'
import { plural } from '/web/lib/plural.ts'
import { JoinDialog } from '/web/pages/project/join-dialog.tsx'
import { ActivityTab } from '/web/pages/project/activity-tab.tsx'
import { BoardTab } from '/web/pages/project/board-tab.tsx'
import { ChannelsTab } from '/web/pages/project/channels-tab.tsx'
import { IssuesTab } from '/web/pages/project/issues-tab.tsx'
import { OverviewTab } from '/web/pages/project/overview-tab.tsx'
import { PulseTab } from '/web/pages/project/pulse-tab.tsx'
import { RoadmapTab } from '/web/pages/project/roadmap-tab.tsx'
import { SettingsTab } from '/web/pages/project/settings-tab.tsx'
import { SyncDialog } from '/web/pages/project/sync-dialog.tsx'
import { PullRequestsTab } from '/web/pages/project/pull-requests-tab.tsx'
import { TeamTab } from '/web/pages/project/team-tab.tsx'
import { DemoBadge, SkillChip } from '/web/ui/badge.tsx'
import { Button } from '/web/ui/button.tsx'
import { Page } from '/web/ui/layout.tsx'
import { Cube } from '/web/ui/shapes.tsx'
import { EmptyState, GhostSlab } from '/web/ui/states.tsx'
import { Tabs } from '/web/ui/tabs.tsx'
import { t } from '/web/lib/language.ts'

const tabs = [
  ['', 'Aperçu'],
  ['pulse', 'Pulse'],
  ['canaux', 'Canaux'],
  ['prs', 'Pull requests'],
  ['issues', 'Issues'],
  ['equipe', 'Équipe'],
  ['activite', 'Activité'],
  ['board', 'Board'],
  ['roadmap', 'Roadmap'],
  ['reglages', 'Réglages'],
] as const

type TabKey = typeof tabs[number][0]

const tabContents: Record<
  TabKey,
  (props: { project: Project }) => preact.JSX.Element
> = {
  '': OverviewTab,
  pulse: PulseTab,
  canaux: ChannelsTab,
  prs: PullRequestsTab,
  issues: IssuesTab,
  equipe: TeamTab,
  activite: ActivityTab,
  board: BoardTab,
  roadmap: RoadmapTab,
  reglages: SettingsTab,
}

const activeHelp: HelpStatus[] = [
  'open',
  'accepted',
  'review_submitted',
  'delivered',
]

const syncLabels = {
  live: [Zap, 'Synchro live'],
  poll: [Clock, 'Synchro toutes les 15 min'],
  none: [CircleSlash, 'Sans repo'],
} as const

const SyncBadge = ({ sync }: { sync: Project['sync'] }) => {
  const [Icon, label] = syncLabels[sync]
  return (
    <span
      class={`inline-flex h-[22px] items-center gap-1 rounded-sm border px-2 font-mono text-[11px] leading-none font-medium tracking-[.06em] whitespace-nowrap uppercase ${
        sync === 'live'
          ? 'border-indigo text-indigo'
          : 'border-line-control text-ink-muted'
      }`}
    >
      <Icon class='size-3' />
      {label}
    </span>
  )
}

const Stat = (
  { value, one, many }: { value: number; one: string; many?: string },
) => (
  <div class='tile flex flex-col gap-0.5 px-3 py-2.5'>
    <span class='font-mono text-[22px] leading-[26px] font-medium tabular-nums'>
      {value}
    </span>
    <span class='text-[12px] leading-4 text-ink-muted'>
      {plural(value, one, many)}
    </span>
  </div>
)

const Actions = ({ project }: { project: Project }) => {
  const following = project.followers.some(isMe)
  const isOwner = project.owner === me.login
  const isMember = project.members.some((m) => m.login === me.login)
  const applied = applications.some((a) =>
    a.project === project.slug && a.login === me.login &&
    a.status === 'pending'
  )
  // The team asks for help; the others follow, offer help or join
  if (isOwner || isMember) {
    return (
      <div class='flex flex-wrap gap-3 pb-1'>
        <Button href='aide/nouvelle' params={{ project: project.slug }}>
          <LifeBuoy />
          Demander de l’aide
        </Button>
        {isOwner && project.sync === 'poll' && (
          <Button variant='secondary' params={{ dialog: 'sync' }}>
            <Zap />
            Activer la synchro live
          </Button>
        )}
      </div>
    )
  }
  return (
    <div class='flex flex-wrap gap-3 pb-1'>
      <Button
        variant='secondary'
        onClick={() => toggleFollow(project, me.login)}
      >
        {following ? <Check /> : <Plus />}
        {following ? 'Suivi' : 'Suivre'}
      </Button>
      <Button variant='secondary' href={`projet/${project.slug}/canaux/aide`}>
        Proposer mon aide
      </Button>
      {!applied && <Button params={{ dialog: 'join' }}>Rejoindre</Button>}
      {applied && (
        <span class='inline-flex h-[38px] items-center gap-1.5 rounded-md border border-dashed border-indigo px-3.5 text-[14px] leading-none font-semibold text-indigo'>
          <Clock class='size-3.5' />
          Candidature envoyée
        </span>
      )}
    </div>
  )
}

const Header = (
  { project, overview }: { project: Project; overview: boolean },
) => {
  // Its own subscription: the requests may arrive after the projects, and a
  // child with the same props is not rendered again
  helpChanged.value
  const openPullRequests = pullRequests.filter((pr) =>
    pr.project === project.slug && pr.state === 'open'
  )
  const openIssues = issues.filter((issue) =>
    issue.project === project.slug && issue.state === 'open'
  )
  const openHelp = helpRequests.filter((help) =>
    help.project === project.slug && activeHelp.includes(help.status)
  )
  return (
    <section class='slab mr-2 flex flex-col gap-4 p-6'>
      <div class='flex flex-wrap items-center gap-4'>
        <Cube size={56} />
        <div class='flex min-w-[240px] flex-1 flex-col gap-2'>
          <div class='flex flex-col items-start gap-2.5'>
            <h1 class='font-display text-[34px] leading-10 font-bold tracking-[-.015em] text-pretty'>
              {project.name}
            </h1>
            <div class='flex flex-wrap items-center gap-2'>
              <SyncBadge sync={project.sync} />
              {project.demo && <DemoBadge />}
            </div>
          </div>
          <p
            translate={false}
            class='wrap-anywhere max-w-[680px] text-pretty text-ink-muted'
          >
            {project.description}
          </p>
        </div>
      </div>
      <div class='flex flex-wrap items-center gap-x-4 gap-y-3'>
        <div class='flex min-w-0 flex-wrap gap-1.5'>
          {project.stack.map((skill) => (
            <SkillChip key={skill}>{skill}</SkillChip>
          ))}
        </div>
        {project.sync !== 'none' && (
          <a
            href={`https://${repoPath(project)}`}
            class='inline-flex items-center gap-1.5 font-mono text-[13px] leading-5 text-ink-muted'
          >
            <Github class='size-3.5' />
            {repoPath(project)}
          </a>
        )}
      </div>
      <div class='flex flex-col gap-5 border-t border-line pt-[18px]'>
        {
          /* On a phone, the figures stay on the overview, so that a tab's
            content is within reach */
        }
        <div
          class={`grid-cols-2 gap-3 pr-1 sm:grid sm:grid-cols-[repeat(auto-fill,minmax(150px,1fr))] sm:gap-4 ${
            overview ? 'grid' : 'hidden'
          }`}
        >
          <Stat value={project.contributors} one='contributeur' />
          <Stat
            value={openIssues.length}
            one='issue ouverte'
            many='issues ouvertes'
          />
          <Stat
            value={openPullRequests.length}
            one='PR ouverte'
            many='PRs ouvertes'
          />
          <Stat
            value={openHelp.length}
            one='demande d’aide ouverte'
            many='demandes d’aide ouvertes'
          />
        </div>
        <Actions project={project} />
      </div>
    </section>
  )
}

// Messages of others not read yet, the channel on screen aside
const unreadMessages = (project: Project, reading?: string) =>
  (['general', 'tracking', 'help', 'announcements'] as const)
    .filter((channel) => channel !== reading)
    .reduce(
      (total, channel) =>
        total + unreadIn(project.slug as ProjectSlug, channel),
      0,
    )

// Path segment of a channel to its data key
const channelKeys: Record<string, string> = {
  general: 'general',
  suivi: 'tracking',
  aide: 'help',
  annonces: 'announcements',
}

const ProjectTabs = ({ project, current }: {
  project: Project
  current: TabKey
}) => (
  <Tabs
    label='Sections du projet'
    current={current}
    wide
    tabs={tabs
      .filter(([key]) => key !== 'reglages' || project.owner === me.login)
      .map(([key, label]) => ({
        key,
        label,
        href: key ? `projet/${project.slug}/${key}` : `projet/${project.slug}`,
        badge: key === 'canaux'
          ? unreadMessages(
            project,
            current === 'canaux'
              ? channelKeys[url.relativePath.split('/')[4] ?? 'general']
              : undefined,
          )
          : undefined,
      }))}
  />
)

const NotFound = ({ slug }: { slug: string }) => (
  <Page title='Projet introuvable' class='pt-5'>
    <GhostSlab>
      <EmptyState action={<Button href='projets'>Voir les projets</Button>}>
        {t`Le projet « ${slug} » n’existe pas ou n’est plus public.`}
      </EmptyState>
    </GhostSlab>
  </Page>
)

/** /projet/:slug/:tab, each tab in its own file */
export const ProjectPage = () => {
  // Read here, not in children: with @preact/signals, a component that reads
  // a signal or has hooks only re-renders when its props or state change
  projectsChanged.value
  applicationsChanged.value
  const [, slug = '', tab = ''] = url.relativePath.slice(1).split('/')
  const project = projects[slug as ProjectSlug]
  if (!project) return <NotFound slug={slug} />
  const current = (tabs.some(([key]) => key === tab) ? tab : '') as TabKey
  const Content = tabContents[current]
  return (
    <Page title={project.name} heading={false} class='flex flex-col gap-7 pt-5'>
      <Header project={project} overview={current === ''} />
      <ProjectTabs project={project} current={current} />
      <Content project={project} />
      <JoinDialog project={project} />
      {project.owner === me.login && <SyncDialog project={project} />}
    </Page>
  )
}
