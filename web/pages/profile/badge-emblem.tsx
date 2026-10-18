import type { Badge } from '/web/fixtures/reputation.ts'

/** Approved matte 3D collection; rank and meaning remain real text nearby. */
export const BadgeEmblem = ({ badge }: { badge: Badge }) => (
  <img
    src={`badges/${badge.dimension ?? 'border'}.webp`}
    width='512'
    height='512'
    alt=''
    aria-hidden='true'
    loading='lazy'
    decoding='async'
    draggable={false}
    class='badge-emblem'
    data-kind={badge.dimension ?? 'border'}
  />
)
