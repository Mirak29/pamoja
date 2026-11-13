import { recentActivityOf } from '/web/fixtures/activity.ts'
import type { Project } from '/web/fixtures/projects.ts'
import { A } from '/web/ui/link.tsx'
import { eventLink } from '/web/lib/links.ts'
import { ago } from '/web/lib/time.ts'
import { DemoBadge } from '/web/ui/badge.tsx'
import { Eyebrow } from '/web/ui/eyebrow.tsx'

/** A journal line, linked to its PR, issue, release or channel */
export const EventText = (
  { project, text }: { project: Project; text: string },
) => {
  const link = eventLink(project, text)
  const style = 'min-w-[200px] flex-1 text-[14px] leading-[22px] text-pretty'
  return link
    ? (
      <A
        href={link.href}
        params={link.params}
        class={`${style} text-ink hover:text-indigo`}
      >
        {text}
      </A>
    )
    : <span class={style}>{text}</span>
}

/** Latest events of a project, in Aperçu and Pulse */
export const EventList = (
  { project, title, limit }: { project: Project; title: string; limit: number },
) => {
  const entries = recentActivityOf(project)
  return (
    <section class='slab overflow-hidden'>
      <div class='flex px-5 pt-[18px] pb-4'>
        <Eyebrow>{title}</Eyebrow>
      </div>
      {entries.slice(0, limit).map((event) => (
        <div
          key={`${event.at}${event.text}`}
          class='flex flex-wrap items-center gap-3 border-t border-line px-5 py-3'
        >
          <span
            aria-hidden='true'
            class='diamond size-[7px] border border-figure-edge'
          />
          <EventText project={project} text={event.text} />
          <span class='text-[12px] text-ink-muted'>{ago(event.at)}</span>
          {(event.session || project.demo) && <DemoBadge />}
        </div>
      ))}
      {!entries.length && (
        <p class='border-t border-line px-5 py-6 text-[14px] text-ink-muted'>
          Rien de nouveau sur ce projet pour l’instant.
        </p>
      )}
    </section>
  )
}
