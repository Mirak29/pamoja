import { useEffect } from 'preact/hooks'
import { A } from '/web/ui/link.tsx'
import { Avatar } from '/web/ui/avatar.tsx'
import { Button } from '/web/ui/button.tsx'
import { Eyebrow } from '/web/ui/eyebrow.tsx'
import { SkillChip } from '/web/ui/badge.tsx'
import { personOf } from '/web/fixtures/people.ts'
import type { Project } from '/web/fixtures/projects.ts'
import {
  applications,
  applicationsChanged,
  decideApplication,
} from '/web/fixtures/applications.ts'
import {
  decideJoinRequest,
  joinRequests,
  leaveJoinRequests,
  loadJoinRequests,
} from '/web/lib/join-requests.ts'
import { counted } from '/web/lib/plural.ts'
import { ago } from '/web/lib/time.ts'
import { t } from '/web/lib/language.ts'

// The candidatures of a project for its owner and maintainers (§6.6), on
// its page and in its Team tab: those of a real project from the server,
// those of a demo project from its fixtures, drawn the same.

type Shown = {
  key: string
  login: string
  name: string
  avatarUrl?: string
  areas: string[]
  availability: string
  message: string
  status: string
  at: number
  decide: (accept: boolean) => void
}

const shownOf = (project: Project): Shown[] => {
  if (project.demo) {
    applicationsChanged.value
    return applications
      .filter((a) => a.project === project.slug)
      .map((a) => ({
        key: a.id,
        login: a.login,
        name: personOf(a.login).name,
        avatarUrl: personOf(a.login).avatarUrl,
        areas: a.areas,
        availability: a.availability,
        message: a.message,
        status: a.status,
        at: a.at,
        decide: (accept) => decideApplication(a, accept),
      }))
  }
  return (joinRequests.value[project.slug] ?? []).map((r) => ({
    key: String(r.id),
    login: r.login,
    name: r.name,
    avatarUrl: r.avatarUrl,
    areas: r.areas,
    availability: r.availability,
    message: r.message,
    status: r.status,
    at: r.createdAt * 1000,
    decide: (accept) => decideJoinRequest(project.slug, r, accept),
  }))
}

/**
 * The candidatures: those waiting with Accepter / Refuser, then (in full)
 * the last decided. `compact` (the project page) shows those waiting only,
 * and nothing when none waits.
 */
export const JoinRequests = (
  { project, compact = false }: { project: Project; compact?: boolean },
) => {
  useEffect(() => {
    if (project.demo) return
    loadJoinRequests(project.slug)
    return () => leaveJoinRequests(project.slug)
  }, [project.slug, project.demo])
  const all = shownOf(project)
  const pending = all.filter((r) => r.status === 'pending')
  const past = all.filter((r) => r.status !== 'pending')
  if (compact && !pending.length) return null
  return (
    <section class='slab overflow-hidden'>
      <div class='flex flex-col gap-1.5 px-5 pt-[18px] pb-4'>
        <Eyebrow>Candidatures</Eyebrow>
        <h2 class='font-display text-heading'>
          {pending.length
            ? counted(
              pending.length,
              'candidature en attente',
              'candidatures en attente',
            )
            : 'Aucune candidature en attente'}
        </h2>
      </div>
      {pending.map((request) => (
        <div
          key={request.key}
          class='flex animate-enter flex-col gap-2.5 border-t border-line px-5 py-4'
        >
          <A
            href={`@${request.login}`}
            class='flex items-center gap-3 text-ink no-underline hover:no-underline'
          >
            <Avatar name={request.name} src={request.avatarUrl} size={34} />
            <span class='flex min-w-0 flex-col'>
              <span class='font-display text-[15px] leading-5 font-semibold'>
                {request.name}
              </span>
              <span class='text-[12px] leading-4 text-ink-muted'>
                {[request.availability, ago(request.at)].filter(Boolean)
                  .join(' · ')}
              </span>
            </span>
          </A>
          {request.areas.length > 0 && (
            <div class='flex flex-wrap gap-1.5'>
              {request.areas.map((area) => (
                <SkillChip key={area} match>{area}</SkillChip>
              ))}
            </div>
          )}
          {request.message && (
            <p class='rounded-md border border-line-strong bg-surface-000 px-3 py-2.5 text-[14px] leading-[22px] text-pretty inset-shadow-well'>
              « {request.message} »
            </p>
          )}
          <div class='flex flex-wrap gap-3 pb-1'>
            <Button
              size={36}
              aria-label={t`Accepter la candidature de ${request.name}`}
              onClick={() => request.decide(true)}
            >
              Accepter
            </Button>
            <Button
              variant='secondary'
              size={36}
              aria-label={t`Refuser la candidature de ${request.name}`}
              onClick={() => request.decide(false)}
            >
              Refuser
            </Button>
          </div>
        </div>
      ))}
      {!compact && past.length > 0 && (
        <div class='flex flex-col gap-2 border-t border-line bg-surface-000 px-5 py-3.5'>
          {past.map((request) => (
            <span
              key={request.key}
              class='flex justify-between gap-2 text-[13px]'
            >
              <span>{request.name}</span>
              <span
                class={`font-semibold ${
                  request.status === 'accepted'
                    ? 'text-verified'
                    : 'text-ink-muted'
                }`}
              >
                {request.status === 'accepted' ? 'Acceptée' : 'Refusée'}
              </span>
            </span>
          ))}
        </div>
      )}
      {compact && (
        <A
          href={`project/${project.slug}/team`}
          class='block border-t border-line px-5 py-3 text-[13px] font-semibold'
        >
          Voir l’équipe et les candidatures
        </A>
      )}
    </section>
  )
}
