import type { ComponentChildren } from 'preact'
import { useState } from 'preact/hooks'
import { A } from '@01edu/signal-router'
import { Play } from '/web/assets/icons.tsx'
import { people } from '/web/fixtures/people.ts'
import type { Project } from '/web/fixtures/projects.ts'
import { counted } from '/web/lib/plural.ts'
import { ago } from '/web/lib/time.ts'
import { EventList } from '/web/pages/project/event-list.tsx'
import { Avatar } from '/web/ui/avatar.tsx'
import { Button } from '/web/ui/button.tsx'
import { Eyebrow } from '/web/ui/eyebrow.tsx'
import { Progress } from '/web/ui/progress.tsx'

const Card = (
  { class: className, children }: {
    class: string
    children: ComponentChildren
  },
) => <section class={`slab flex flex-col ${className}`}>{children}</section>

const About = ({ project }: { project: Project }) => (
  <Card class='gap-3 p-[22px]'>
    <Eyebrow>À propos</Eyebrow>
    <p class='text-[16px] leading-[26px] text-pretty'>
      {project.about ?? project.description}
    </p>
    {project.vision && (
      <p class='rounded-md border border-line-strong bg-surface-000 py-3 pr-3.5 pl-6 text-pretty text-ink-muted inset-shadow-well'>
        <span class='font-semibold text-ink'>Vision.</span> {project.vision}
      </p>
    )}
  </Card>
)

const Label = ({ children }: { children: ComponentChildren }) => (
  <span class='rounded-sm border border-line bg-surface-100 px-1.5 py-0.5 font-mono text-[11px] leading-[14px] font-medium text-ink-muted'>
    {children}
  </span>
)

const Gallery = ({ project }: { project: Project }) => {
  const [playing, setPlaying] = useState(false)
  const video = project.demoVideo
  return (
    <Card class='gap-3.5 p-[22px]'>
      <Eyebrow>Captures et démo</Eyebrow>
      {!project.gallery.length && !video && (
        <span class='text-[14px] text-ink-muted'>
          Pas encore de captures ni de vidéo de démo.
        </span>
      )}
      <div class='grid grid-cols-2 gap-3.5 sm:grid-cols-3'>
        {project.gallery.map((caption) => (
          <div
            key={caption}
            title={caption}
            class='flex aspect-[4/3] min-w-0 items-end overflow-hidden rounded-md border border-figure-edge bg-surface-000 p-2 shadow-tile'
          >
            <Label>{caption}</Label>
          </div>
        ))}
      </div>
      {video && !playing && (
        <button
          type='button'
          onClick={() => setPlaying(true)}
          aria-label='Lire la vidéo de démo'
          class='flex aspect-video w-[calc(100%-8px)] cursor-pointer flex-col items-center justify-center gap-3 rounded-lg border border-figure-edge bg-surface-000 text-ink shadow-tile'
        >
          <span class='key key-primary size-16 rounded-full'>
            <Play class='size-7' />
          </span>
          <span class='rounded-sm border border-line bg-surface-100 px-1.5 py-0.5 font-mono text-[12px] leading-4 font-medium text-ink-muted'>
            Vidéo de démo · {video.provider} · {video.duration}
          </span>
        </button>
      )}
      {video && playing && (
        // The provider player (iframe) takes this place with PAM-410
        <div class='flex aspect-video w-[calc(100%-8px)] flex-col justify-end gap-2 rounded-lg border border-figure-edge bg-[#0E0E13] p-4 text-[#EDEDF3] shadow-tile'>
          <span class='font-mono text-[12px] leading-4 font-medium'>
            Lecture · Vidéo de démo · {video.provider}
          </span>
          <div class='h-1 overflow-hidden rounded-full bg-[#2C2C37]'>
            <div class='h-full w-[8%] bg-[#8C96FF]' />
          </div>
          <span class='font-mono text-[11px] leading-[14px] font-medium text-[#A2A2B2]'>
            0:12 / {video.duration}
          </span>
        </div>
      )}
    </Card>
  )
}

const CurrentMilestone = ({ project }: { project: Project }) => {
  const milestone = project.milestones.find((m) => m.state === 'active')
  return (
    <Card class='gap-3 p-5'>
      <Eyebrow>Milestone en cours</Eyebrow>
      {milestone
        ? (
          <>
            <span class='font-display text-[16px] leading-[22px] font-semibold'>
              {milestone.title}
            </span>
            <Progress
              value={milestone.done}
              max={milestone.total}
              label={milestone.title}
            />
            <span class='font-mono text-[13px] leading-[18px] font-medium text-ink-muted'>
              {milestone.done} / {milestone.total} tâches
            </span>
          </>
        )
        : (
          <span class='text-[14px] text-ink-muted'>
            Aucune milestone en cours.{' '}
            <A href={`projet/${project.slug}/roadmap`}>Voir la roadmap</A>
          </span>
        )}
    </Card>
  )
}

const Needs = ({ project }: { project: Project }) => (
  <section class='slab-selected flex flex-col gap-3 p-5'>
    <Eyebrow accent>On cherche</Eyebrow>
    {project.needs.map((need) => (
      <span
        key={need}
        class='flex items-center gap-2.5 text-[15px] font-semibold'
      >
        <span aria-hidden='true' class='diamond size-2 bg-indigo' />
        {need}
      </span>
    ))}
    <Button
      size={36}
      href={`projet/${project.slug}/canaux/aide`}
      class='mt-1 self-start'
    >
      Proposer mon aide
    </Button>
  </section>
)

const Team = ({ project }: { project: Project }) => {
  const more = Math.max(0, project.contributors - project.members.length)
  return (
    <Card class='gap-3 p-5'>
      <Eyebrow>Équipe</Eyebrow>
      {project.members.map(({ login, role }) => (
        <A
          key={login}
          href={`@${login}`}
          class='flex items-center gap-3 text-ink no-underline hover:no-underline'
        >
          <Avatar name={people[login].name} size={34} />
          <span class='flex flex-col'>
            <span class='font-display text-[14px] leading-5 font-semibold'>
              {people[login].name}
            </span>
            <span class='text-[12px] leading-4 text-ink-muted'>{role}</span>
          </span>
        </A>
      ))}
      {more > 0 && (
        <span class='text-[13px] text-ink-muted'>
          + {counted(more, 'contributeur')} sur GitHub
        </span>
      )}
    </Card>
  )
}

const Release = ({ project }: { project: Project }) => (
  <Card class='gap-1.5 p-5'>
    <Eyebrow>Dernière release</Eyebrow>
    <span class='font-mono text-[24px] leading-[30px] font-medium'>
      {project.release}
    </span>
    <span class='text-[13px] text-ink-muted'>
      {project.release === '—'
        ? 'Aucune release pour l’instant.'
        : `Publiée ${ago(project.releasedAt)}`}
    </span>
  </Card>
)

/** What it is, what happens, who builds it, what it needs (§6.3) */
export const OverviewTab = ({ project }: { project: Project }) => (
  <div class='mr-2 grid items-start gap-8 lg:grid-cols-[minmax(0,2fr)_minmax(0,1fr)]'>
    <div class='flex min-w-0 flex-col gap-8'>
      <About project={project} />
      <Gallery project={project} />
      <EventList project={project} title='Activité récente' limit={6} />
    </div>
    <div class='flex min-w-0 flex-col gap-8'>
      <CurrentMilestone project={project} />
      <Needs project={project} />
      <Team project={project} />
      <Release project={project} />
    </div>
  </div>
)
