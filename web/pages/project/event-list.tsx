import type { Project } from '/web/fixtures/projects.ts'
import { ago } from '/web/lib/time.ts'
import { DemoBadge } from '/web/ui/badge.tsx'
import { Eyebrow } from '/web/ui/eyebrow.tsx'

/** Latest events of a project, in Aperçu and Pulse */
export const EventList = (
  { project, title, limit }: { project: Project; title: string; limit: number },
) => (
  <section class='slab overflow-hidden'>
    <div class='flex px-5 pt-[18px] pb-4'>
      <Eyebrow>{title}</Eyebrow>
    </div>
    {project.events.slice(0, limit).map((event) => (
      <div
        key={event.text}
        class='flex flex-wrap items-center gap-3 border-t border-line px-5 py-3'
      >
        <span
          aria-hidden='true'
          class='diamond size-[7px] border border-figure-edge'
        />
        <span class='min-w-[200px] flex-1 text-[14px]'>{event.text}</span>
        <span class='text-[12px] text-ink-muted'>{ago(event.at)}</span>
        {project.demo && <DemoBadge />}
      </div>
    ))}
    {!project.events.length && (
      <p class='border-t border-line px-5 py-6 text-[14px] text-ink-muted'>
        Rien de nouveau sur ce projet pour l’instant.
      </p>
    )}
  </section>
)
