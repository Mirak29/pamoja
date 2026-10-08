import { A } from '@01edu/signal-router'
import { Check, CircleSlash, Clock, Plus, Zap } from '/web/assets/icons.tsx'
import { issues } from '/web/fixtures/issues.ts'
import { isMe, me } from '/web/fixtures/people.ts'
import {
  type Project,
  projects,
  projectsChanged,
  projectsOf,
  toggleFollow,
} from '/web/fixtures/projects.ts'
import { pullRequests } from '/web/fixtures/pull-requests.ts'
import { DemoBadge } from '/web/ui/badge.tsx'
import { Button } from '/web/ui/button.tsx'
import { Eyebrow } from '/web/ui/eyebrow.tsx'
import { Page } from '/web/ui/layout.tsx'
import { Cube } from '/web/ui/shapes.tsx'
import { GhostSlab } from '/web/ui/states.tsx'
import { notify } from '/web/ui/toast.tsx'
import { NewProjectDialog } from '/web/pages/projects/new-project-dialog.tsx'

const syncLabels = {
  live: [Zap, 'Live'],
  poll: [Clock, 'Toutes les 15 min'],
  none: [CircleSlash, 'Sans repo'],
} as const

const Sync = ({ project }: { project: Project }) => {
  const [Icon, label] = syncLabels[project.sync]
  return (
    <span
      class={`inline-flex items-center gap-1 font-mono text-[11px] leading-none font-medium tracking-[.06em] whitespace-nowrap uppercase ${
        project.sync === 'live' ? 'text-indigo' : 'text-ink-muted'
      }`}
    >
      <Icon class='size-3' />
      {label}
    </span>
  )
}

/** PRs waiting for a review, blockers and contributors */
const facts = (project: Project) => {
  const waiting =
    pullRequests.filter((pr) =>
      pr.project === project.slug && pr.state === 'open' &&
      pr.review === 'waiting'
    ).length
  const blockers =
    issues.filter((issue) =>
      issue.project === project.slug && issue.state === 'open' &&
      issue.labels.includes('blocked')
    ).length
  return [
    `${waiting} ${waiting > 1 ? 'PRs en attente' : 'PR en attente'}`,
    blockers && `${blockers} ${blockers > 1 ? 'bloqueurs' : 'bloqueur'}`,
    `${project.contributors} contributeurs`,
  ].filter(Boolean).join(' · ')
}

const roleOf = (project: Project) =>
  project.owner === me.login
    ? 'Propriétaire'
    : project.members.find((m) => m.login === me.login)?.role ?? 'Abonné'

const MineCard = ({ project }: { project: Project }) => {
  const role = roleOf(project)
  return (
    <A
      href={`projet/${project.slug}`}
      class='mb-2 flex flex-col gap-3 rounded-lg border border-indigo bg-surface-100 p-5 text-ink no-underline shadow-slab-selected transition-[translate] duration-180 ease-out hover:-translate-x-[1.73px] hover:-translate-y-px hover:no-underline'
    >
      <div class='flex items-start gap-3.5'>
        <Cube size={46} top='filled' />
        <div class='flex min-w-0 flex-1 flex-col gap-1.5'>
          <span class='font-display text-[19px] leading-6 font-semibold'>
            {project.name}
          </span>
          <span class='flex flex-wrap items-center gap-2.5'>
            <span
              class={`inline-flex h-[22px] items-center rounded-sm border px-2 font-mono text-[11px] leading-none font-medium tracking-[.06em] uppercase ${
                role === 'Propriétaire'
                  ? 'border-indigo-edge bg-indigo text-on-indigo'
                  : 'border-indigo bg-indigo-soft text-indigo'
              }`}
            >
              {role}
            </span>
            <Sync project={project} />
          </span>
        </div>
      </div>
      <span class='text-[14px] leading-[22px] text-pretty text-ink-muted'>
        {project.description}
      </span>
      <span class='font-mono text-[12px] leading-4 text-ink-muted'>
        {project.stack.join(' · ')}
      </span>
      <div class='mt-auto flex flex-wrap items-center justify-between gap-2 border-t border-line pt-3'>
        <span class='text-[13px]'>{facts(project)}</span>
        {project.demo && <DemoBadge />}
      </div>
    </A>
  )
}

const unfollow = (project: Project) => {
  toggleFollow(project, me.login)
  notify({
    title: `Tu ne suis plus ${project.name}`,
    body: 'Tu peux le suivre à nouveau depuis sa page.',
    icon: Check,
    tone: 'muted',
  })
}

const FollowedRow = ({ project }: { project: Project }) => (
  <div class='tile flex flex-wrap items-center gap-3.5 px-3.5 py-3'>
    <Cube size={28} top='plain' />
    <A
      href={`projet/${project.slug}`}
      class='flex min-w-[220px] flex-1 flex-col text-ink no-underline hover:no-underline'
    >
      <span class='font-display text-[16px] leading-[22px] font-semibold'>
        {project.name}
      </span>
      <span class='truncate text-[13px] leading-5 text-ink-muted'>
        {project.description}
      </span>
    </A>
    <Sync project={project} />
    <span class='text-[13px] text-ink-muted'>{facts(project)}</span>
    {project.demo && <DemoBadge />}
    <Button variant='secondary' size={32} onClick={() => unfollow(project)}>
      Ne plus suivre
    </Button>
  </div>
)

/** Projects owned or joined, then followed ones (§6.3) */
export const ProjectsPage = () => {
  projectsChanged.value
  const mine = projectsOf(me.login)
  const followed = Object.values(projects as Record<string, Project>).filter(
    (project) => !mine.includes(project) && project.followers.some(isMe),
  )
  return (
    <Page title='Projets' class='flex flex-col gap-11 pt-5'>
      <section class='flex flex-col gap-[18px]'>
        <div class='flex flex-wrap items-end justify-between gap-4'>
          <div class='flex flex-col gap-1.5'>
            <Eyebrow accent>Tes projets · {mine.length}</Eyebrow>
            <span class='text-[14px] text-ink-muted'>
              Tu en es propriétaire ou membre : tu écris, tu gères le board et
              les candidatures.
            </span>
          </div>
          <Button size={40} params={{ dialog: 'new-project' }}>
            <Plus />
            Nouveau projet
          </Button>
        </div>
        {mine.length > 0 && (
          <div class='grid grid-cols-[repeat(auto-fill,minmax(min(100%,320px),1fr))] gap-x-7 gap-y-6 pr-2'>
            {mine.map((project) => (
              <MineCard key={project.slug} project={project} />
            ))}
          </div>
        )}
        {!mine.length && (
          <GhostSlab class='px-6 py-10'>
            <div class='flex flex-col items-center gap-3.5 text-center'>
              <span class='font-display text-[18px] leading-6 font-semibold'>
                Tu n’as pas encore de projet
              </span>
              <span class='max-w-[420px] text-[14px] text-ink-muted'>
                Importe un repo GitHub : Pamoja propose les skills et les
                besoins, tu valides.
              </span>
              <Button params={{ dialog: 'new-project' }}>
                Importer depuis GitHub
              </Button>
            </div>
          </GhostSlab>
        )}
      </section>
      <section class='flex flex-col gap-3.5'>
        <div class='flex flex-col gap-1.5'>
          <Eyebrow>Projets que tu suis · {followed.length}</Eyebrow>
          <span class='text-[14px] text-ink-muted'>
            Tu les suis : tu lis leur #suivi et leurs #annonces, sans écrire.
          </span>
        </div>
        {followed.length > 0 && (
          <div class='mr-2 flex flex-col gap-2.5 rounded-lg border border-line-strong bg-surface-000 pt-2 pr-3 pb-3 pl-2 inset-shadow-well'>
            {followed.map((project) => (
              <FollowedRow key={project.slug} project={project} />
            ))}
          </div>
        )}
        {!followed.length && (
          <GhostSlab class='p-5'>
            <div class='flex flex-col gap-1.5'>
              <span class='font-display text-[16px] leading-[22px] font-semibold'>
                Tu ne suis aucun projet
              </span>
              <span class='text-[14px] text-ink-muted'>
                Suis un projet pour lire son #suivi et ses #annonces.
              </span>
            </div>
          </GhostSlab>
        )}
      </section>
      <NewProjectDialog />
    </Page>
  )
}
