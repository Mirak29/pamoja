import { useState } from 'preact/hooks'
import { Check } from '/web/assets/icons.tsx'
import { type Community, toggleMembership } from '/web/fixtures/communities.ts'
import { me } from '/web/fixtures/people.ts'
import { Button } from '/web/ui/button.tsx'
import { t } from '/web/lib/language.ts'

/**
 * Join a community in one click; leaving asks first, since its posts leave
 * the feed (§10.2). `joined` comes from the page, which reads the signal.
 *
 * @example
 * <Membership community={community} joined={joined} size={34} />
 */
export const Membership = (
  { community, joined, size = 38 }: {
    community: Community
    joined: boolean
    size?: 34 | 38
  },
) => {
  const [asking, setAsking] = useState(false)
  if (!joined) {
    return (
      <Button
        size={size}
        aria-label={t`Rejoindre ${community.name}`}
        onClick={() => toggleMembership(community, me)}
      >
        Rejoindre
      </Button>
    )
  }
  if (asking) {
    return (
      <span class='flex flex-wrap items-center gap-2'>
        <span class='text-[13px] font-semibold'>
          {t`Quitter ${community.name} ?`}
        </span>
        <Button
          variant='danger'
          size={34}
          onClick={() => {
            setAsking(false)
            toggleMembership(community, me)
          }}
        >
          Quitter
        </Button>
        <Button variant='secondary' size={34} onClick={() => setAsking(false)}>
          Rester
        </Button>
      </span>
    )
  }
  return (
    <span class='flex flex-wrap items-center gap-2.5'>
      <span class='inline-flex items-center gap-1.5 text-[13px] font-semibold text-verified'>
        <Check class='size-3.5' />
        Membre
      </span>
      <button
        type='button'
        aria-label={t`Quitter ${community.name}`}
        onClick={() => setAsking(true)}
        class='cursor-pointer px-1.5 text-[13px] leading-none font-medium text-ink-muted hover:text-danger'
      >
        Quitter
      </button>
    </span>
  )
}
