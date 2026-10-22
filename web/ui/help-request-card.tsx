import { A } from '@01edu/signal-router'
import type { HelpRequest } from '/web/fixtures/help.ts'
import { me, people } from '/web/fixtures/people.ts'
import { projects } from '/web/fixtures/projects.ts'
import { ago } from '/web/lib/time.ts'
import {
  DemoBadge,
  SkillChip,
  StatusBadge,
  VerifiedBadge,
} from '/web/ui/badge.tsx'
import { t } from '/web/lib/language.ts'

/**
 * A help request in a list: its match score for the viewer when given,
 * its type, project, title, skills (indigo when the viewer has them) and
 * state. Used by Aide and the home feed.
 *
 * @example
 * <HelpRequestCard request={request} score={77} />
 */
export const HelpRequestCard = (
  { request, score }: { request: HelpRequest; score?: number },
) => {
  const helper = request.helper && people[request.helper].name.split(' ')[0]
  return (
    <A
      href={`aide/${request.id}`}
      class='flex items-start gap-4 border-t border-line px-5 py-4 text-ink no-underline hover:bg-surface-000 hover:no-underline'
    >
      {score != null && (
        <span class='tile flex h-[54px] w-[62px] flex-none flex-col items-center justify-center gap-0.5'>
          <span class='font-mono text-[19px] leading-5 font-medium tabular-nums'>
            {score}
          </span>
          <span class='font-mono text-[10px] leading-3 font-medium text-ink-muted'>
            / 100
          </span>
        </span>
      )}
      <div class='flex min-w-0 flex-1 flex-col gap-1.5'>
        <div class='flex flex-wrap items-center gap-2'>
          <span class='font-mono text-label text-ink-muted uppercase'>
            {request.type}
          </span>
          <span class='text-line-strong'>/</span>
          <span class='text-[13px] leading-4 text-ink-muted'>
            {request.project ? projects[request.project].name : 'Sans projet'}
          </span>
        </div>
        <span class='text-[16px] leading-6 font-semibold text-pretty'>
          {request.title}
        </span>
        <div class='flex flex-wrap gap-1.5'>
          {request.skills.map((skill) => (
            <SkillChip key={skill} match={me.skills.includes(skill)}>
              {skill}
            </SkillChip>
          ))}
        </div>
        <span class='text-[13px] leading-5 text-ink-muted'>
          {people[request.author].name} · {ago(request.at)} · {request.duration}
          {' '}
          · {request.level}
          {helper && (request.status === 'completed'
            ? t` · aidé par ${helper}`
            : t` · pris par ${helper}`)}
        </span>
      </div>
      <div class='flex flex-none flex-col items-end gap-1.5'>
        <StatusBadge status={request.status} />
        {request.log?.some((entry) => entry.verified) && <VerifiedBadge />}
        {request.demo && <DemoBadge />}
      </div>
    </A>
  )
}
