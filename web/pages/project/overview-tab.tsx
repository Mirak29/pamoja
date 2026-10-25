import type { ComponentChildren } from 'preact'
import { Batched } from '/web/ui/infinite-list.tsx'
import { A } from '@01edu/signal-router'
import { ImagePlus, Play } from '/web/assets/icons.tsx'
import { isMe, personOf } from '/web/fixtures/people.ts'
import { type Project, projectsChanged } from '/web/fixtures/projects.ts'
import { counted } from '/web/lib/plural.ts'
import { ago } from '/web/lib/time.ts'
import { EventList } from '/web/pages/project/event-list.tsx'
import {
  canEditGallery,
  ManageScreenshots,
  Screenshots,
  ScreenshotViewer,
} from '/web/pages/project/gallery.tsx'
import { Avatar } from '/web/ui/avatar.tsx'
import { Button } from '/web/ui/button.tsx'
import { Eyebrow } from '/web/ui/eyebrow.tsx'
import { Progress } from '/web/ui/progress.tsx'
import { t } from '/web/lib/language.ts'
import { VideoEmbed } from '/web/ui/video.tsx'
import { Markdown } from '/web/ui/rich-text.tsx'

const Card = (
  { class: className, children }: {
    class: string
    children: ComponentChildren
  },
) => <section class={`slab flex flex-col ${className}`}>{children}</section>

const About = ({ project }: { project: Project }) => (
  <Card class='gap-3 p-[22px]'>
    <Eyebrow>À propos</Eyebrow>
    {
      // A README read from GitHub is Markdown; the texts of the demo
      // projects are translated sentences
      project.about && !project.demo
        ? (
          <Markdown
            text={project.about}
            class='gap-2.5 text-[16px] leading-[26px] text-pretty'
          />
        )
        : (
          <p class='text-[16px] leading-[26px] text-pretty'>
            {project.about ?? project.description}
          </p>
        )
    }
    {project.vision && (
      <p class='rounded-md border border-line-strong bg-surface-000 py-3 pr-3.5 pl-6 text-pretty text-ink-muted inset-shadow-well'>
        <span class='font-semibold text-ink'>Vision.</span> {project.vision}
      </p>
    )}
  </Card>
)

const Gallery = ({ project }: { project: Project }) => {
  // The project is mutated in place: the signal brings its new screenshots
  projectsChanged.value
  // A project the server knows has its real video; a demo one, its tile
  const known = !!project.shots
  const video = known ? project.demoVideoUrl : undefined
  const demo = known ? undefined : project.demoVideo
  return (
    <Card class='gap-3.5 p-[22px]'>
      <div class='flex flex-wrap items-center justify-between gap-3'>
        <Eyebrow>Captures et démo</Eyebrow>
        {canEditGallery(project) && (
          <Button variant='secondary' size={32} params={{ dialog: 'captures' }}>
            <ImagePlus class='size-4' />
            Gérer les captures et la vidéo
          </Button>
        )}
      </div>
      {!(project.shots ?? project.gallery).length && !video && !demo &&
        !canEditGallery(project) && (
        <span class='text-[14px] text-ink-muted'>
          Pas encore de captures ni de vidéo de démo.
        </span>
      )}
      <Screenshots project={project} />
      <ScreenshotViewer project={project} />
      <ManageScreenshots project={project} />
      {video && <VideoEmbed url={video} label='Vidéo de démo' />}
      {demo && (
        <div class='flex aspect-video w-full flex-col items-center justify-center gap-3 rounded-lg border border-figure-edge bg-surface-000 text-ink shadow-tile'>
          <span class='key key-primary size-16 rounded-full'>
            <Play class='size-7' />
          </span>
          <span class='rounded-sm border border-line bg-surface-100 px-1.5 py-0.5 font-mono text-[12px] leading-4 font-medium text-ink-muted'>
            Vidéo de démo · {demo.provider} · {demo.duration}
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
            <A href={`project/${project.slug}/roadmap`}>Voir la roadmap</A>
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
    {
      /* The team does not offer its help to itself: the owner edits the
        needs instead (QA-32) */
    }
    {isMe(project.owner)
      ? (
        <Button
          size={36}
          variant='secondary'
          href={`project/${project.slug}/settings`}
          class='mt-1 self-start'
        >
          Modifier les besoins
        </Button>
      )
      : !project.members.some((member) => isMe(member.login)) && (
        <Button
          size={36}
          href={`project/${project.slug}/channels/help`}
          class='mt-1 self-start'
        >
          Proposer mon aide
        </Button>
      )}
  </section>
)

const Team = ({ project }: { project: Project }) => {
  const more = Math.max(0, project.contributors - project.members.length)
  return (
    <Card class='gap-3 p-5'>
      <Eyebrow>
        {project.members.length > 6
          ? t`Équipe · ${project.members.length}`
          : 'Équipe'}
      </Eyebrow>
      {
        /* About six people high: the others scroll inside, by batches, so a
        large team does not stretch the page (§12.7) */
      }
      <div class='-mr-2 max-h-[300px] overflow-y-auto pr-2'>
        <Batched
          items={project.members}
          reset={project.slug}
          class='flex flex-col gap-3'
          row={({ login, role }) => (
            <A
              key={login}
              href={`@${login}`}
              class='flex items-center gap-3 text-ink no-underline hover:no-underline'
            >
              <Avatar
                name={personOf(login).name}
                src={personOf(login).avatarUrl}
                size={34}
              />
              <span class='flex flex-col'>
                <span class='font-display text-[14px] leading-5 font-semibold'>
                  {personOf(login).name}
                </span>
                <span class='text-[12px] leading-4 text-ink-muted'>{role}</span>
              </span>
            </A>
          )}
        />
      </div>
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
        : t`Publiée ${ago(project.releasedAt)}`}
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
