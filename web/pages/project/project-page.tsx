import { useState } from 'preact/hooks'
import { url } from '@01edu/signal-router'
import { Check, Clock, Github, Plus, Zap } from '/web/assets/icons.tsx'
import { channels } from '/web/fixtures/channels.ts'
import { helpRequests, type HelpStatus } from '/web/fixtures/help.ts'
import { issues } from '/web/fixtures/issues.ts'
import { me } from '/web/fixtures/people.ts'
import {
  type Project,
  projects,
  type ProjectSlug,
} from '/web/fixtures/projects.ts'
import { pullRequests } from '/web/fixtures/pull-requests.ts'
import { appliedTo, JoinDialog } from '/web/pages/project/join-dialog.tsx'
import { OverviewTab } from '/web/pages/project/overview-tab.tsx'
import { PulseTab } from '/web/pages/project/pulse-tab.tsx'
import { DemoBadge, SkillChip } from '/web/ui/badge.tsx'
import { Button } from '/web/ui/button.tsx'
import { Page } from '/web/ui/layout.tsx'
import { Cube } from '/web/ui/shapes.tsx'
import { EmptyState, GhostSlab, UpcomingState } from '/web/ui/states.tsx'
import { Tabs } from '/web/ui/tabs.tsx'

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

const tabContents: Partial<
  Record<TabKey, (props: { project: Project }) => preact.JSX.Element>
> = {
  '': OverviewTab,
  pulse: PulseTab,
}

const activeHelp: HelpStatus[] = [
  'open',
  'accepted',
  'review_submitted',
  'delivered',
]

const SyncBadge = ({ live }: { live: boolean }) => (
  <span
    class={`inline-flex h-[22px] items-center gap-1 rounded-sm border px-2 font-mono text-[11px] leading-none font-medium tracking-[.06em] whitespace-nowrap uppercase ${
      live ? 'border-indigo text-indigo' : 'border-line-control text-ink-muted'
    }`}
  >
    {live ? <Zap class='size-3' /> : <Clock class='size-3' />}
    {live ? 'Synchro live' : 'Synchro toutes les 15 min'}
  </span>
)

const Stat = ({ value, label }: { value: number; label: string }) => (
  <div class='tile flex flex-col gap-0.5 px-3 py-2.5'>
    <span class='font-mono text-[22px] leading-[26px] font-medium tabular-nums'>
      {value}
    </span>
    <span class='text-[12px] leading-4 text-ink-muted'>{label}</span>
  </div>
)

const Actions = ({ project }: { project: Project }) => {
  const [following, setFollowing] = useState(
    (project.followers as string[]).includes(me.login),
  )
  const isOwner = project.owner === me.login
  const isMember = project.members.some((m) => m.login === me.login)
  const applied = appliedTo.value.includes(project.slug)
  return (
    <div class='flex flex-wrap gap-3 pb-1'>
      <Button variant='secondary' onClick={() => setFollowing(!following)}>
        {following ? <Check /> : <Plus />}
        {following ? 'Suivi' : 'Suivre'}
      </Button>
      <Button variant='secondary' href={`projet/${project.slug}/canaux/aide`}>
        Proposer mon aide
      </Button>
      {isOwner && project.sync === 'poll' && (
        <Button params={{ dialog: 'sync' }}>
          <Zap />
          Activer la synchro live
        </Button>
      )}
      {!isMember && !applied && (
        <Button params={{ dialog: 'join' }}>Rejoindre</Button>
      )}
      {!isMember && applied && (
        <span class='inline-flex h-[38px] items-center gap-1.5 rounded-md border border-dashed border-indigo px-3.5 text-[14px] leading-none font-semibold text-indigo'>
          <Clock class='size-3.5' />
          Candidature envoyée
        </span>
      )}
    </div>
  )
}

const Header = ({ project }: { project: Project }) => {
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
              <SyncBadge live={project.sync === 'live'} />
              {project.demo && <DemoBadge />}
            </div>
          </div>
          <p class='max-w-[680px] text-pretty text-ink-muted'>
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
        <a
          href={`https://github.com/${project.owner}/${project.slug}`}
          class='inline-flex items-center gap-1.5 font-mono text-[13px] leading-5 text-ink-muted'
        >
          <Github class='size-3.5' />
          github.com/{project.owner}/{project.slug}
        </a>
      </div>
      <div class='flex flex-col gap-5 border-t border-line pt-[18px]'>
        <div class='grid grid-cols-[repeat(auto-fill,minmax(150px,1fr))] gap-4 pr-1'>
          <Stat value={project.contributors} label='contributeurs' />
          <Stat value={openIssues.length} label='issues ouvertes' />
          <Stat value={openPullRequests.length} label='PRs ouvertes' />
          <Stat value={openHelp.length} label='demandes d’aide ouvertes' />
        </div>
        <Actions project={project} />
      </div>
    </section>
  )
}

// Every message is unread until ChannelState exists (PAM-412)
const unreadMessages = (project: Project) =>
  Object.values(channels[project.slug as ProjectSlug] ?? {})
    .reduce((total, messages) => total + messages.length, 0)

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
        badge: key === 'canaux' && current !== 'canaux'
          ? unreadMessages(project)
          : undefined,
      }))}
  />
)

const NotFound = ({ slug }: { slug: string }) => (
  <Page title='Projet introuvable' class='pt-5'>
    <GhostSlab>
      <EmptyState action={<Button href='projets'>Voir les projets</Button>}>
        Le projet « {slug} » n’existe pas ou n’est plus public.
      </EmptyState>
    </GhostSlab>
  </Page>
)

/** /projet/:slug/:tab, each tab in its own file */
export const ProjectPage = () => {
  const [, slug = '', tab = ''] = url.relativePath.slice(1).split('/')
  const project = projects[slug as ProjectSlug]
  if (!project) return <NotFound slug={slug} />
  const current = (tabs.some(([key]) => key === tab) ? tab : '') as TabKey
  const Content = tabContents[current]
  return (
    <Page title={project.name} class='flex flex-col gap-7 pt-5'>
      <Header project={project} />
      <ProjectTabs project={project} current={current} />
      {Content
        ? <Content project={project} />
        : <UpcomingState path={url.relativePath.slice(1)} />}
      <JoinDialog project={project} />
    </Page>
  )
}
