import { A } from '@01edu/signal-router'
import {
  isMe,
  type Login,
  me,
  type Person,
  placeOf,
} from '/web/fixtures/people.ts'
import { confirmedHelpsOf } from '/web/fixtures/reputation.ts'
import { counted } from '/web/lib/plural.ts'
import { Avatar } from '/web/ui/avatar.tsx'
import { SkillChip } from '/web/ui/badge.tsx'

/**
 * A developer to discover: role, place, headline, skills shared with the
 * viewer in indigo, confirmed helps, availability and intents. Used by
 * Explorer and the members of a community.
 *
 * @example
 * <DeveloperCard person={people.moussa} />
 */
export const DeveloperCard = ({ person }: { person: Person }) => {
  const own = isMe(person.login as typeof me.login)
  return (
    <A
      href={`@${person.login}`}
      class='slab slab-lift mb-2 flex flex-col gap-3 p-[18px] text-ink no-underline hover:no-underline'
    >
      <div class='flex items-center gap-3'>
        <Avatar name={person.name} src={person.avatarUrl} size={46} />
        <div class='flex min-w-0 flex-1 flex-col'>
          <span class='font-display text-[17px] leading-[22px] font-semibold'>
            {person.name}
          </span>
          <span class='text-[13px] leading-[18px] text-ink-muted'>
            {person.role} · {placeOf(person)}
          </span>
        </div>
      </div>
      <span class='text-[14px] leading-[22px] text-pretty'>
        {person.headline}
      </span>
      <div class='flex flex-wrap gap-1.5'>
        {person.skills.map((skill) => (
          <SkillChip key={skill} match={!own && me.skills.includes(skill)}>
            {skill}
          </SkillChip>
        ))}
      </div>
      <div class='mt-auto flex flex-col gap-0.5 border-t border-line pt-2.5 text-[12px] leading-[18px] text-ink-muted'>
        <span class='flex justify-between gap-2'>
          <span class='font-mono'>
            {counted(
              confirmedHelpsOf(person.login as Login),
              'aide confirmée',
              'aides confirmées',
            )}
          </span>
          <span class='inline-flex items-center gap-1.5 whitespace-nowrap'>
            <span
              aria-hidden='true'
              class={`diamond size-2 border ${
                person.available
                  ? 'border-verified bg-verified'
                  : 'border-line-control'
              }`}
            />
            {person.available ? 'Disponible' : 'Peu disponible'}
          </span>
        </span>
        {person.intents.length > 0 && <span>{person.intents.join(' · ')}</span>}
      </div>
    </A>
  )
}
