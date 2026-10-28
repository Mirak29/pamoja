import type { ProfileCover } from '/web/fixtures/profile-settings.ts'
import { Plates } from '/web/ui/plates.tsx'
import { type Media, mediaUrl } from '/web/lib/messages.ts'

const sizes = {
  large: {
    box: 'h-[140px]',
    thread: ['0 0 800 140', 'M0 108 C 220 10, 520 150, 800 30'],
    grid: 'bg-size-[18px_10.4px]',
    plates: ['pr-12', 150],
  },
  small: {
    box: 'h-16',
    thread: ['0 0 400 64', 'M0 52 C 110 6, 260 70, 400 14'],
    grid: 'bg-size-[14px_8px]',
    plates: ['pr-4', 70],
  },
} as const

/**
 * Cover of a profile, chosen in its settings (§9.2). `small` is the one of
 * the live preview.
 */
export const Cover = (
  { cover, small, photo }: {
    cover: ProfileCover
    small?: boolean
    /** The uploaded photo, for the « photo » cover */
    photo?: Media
  },
) => {
  const size = sizes[small ? 'small' : 'large']
  const frame = `${size.box} border-b border-figure-edge`
  if (cover === 'photo' && photo) {
    return (
      <img
        src={mediaUrl(photo.key)}
        alt=''
        class={`${frame} block w-full object-cover`}
      />
    )
  }
  if (cover === 'grille') {
    return (
      <div
        class={`${frame} bg-surface-000 bg-[radial-gradient(var(--line-control)_1px,transparent_1.2px)] ${size.grid}`}
      />
    )
  }
  if (cover === 'plaques') {
    return (
      <div
        class={`${frame} flex items-center justify-end overflow-hidden bg-surface-000 ${
          size.plates[0]
        }`}
      >
        <Plates width={size.plates[1]} />
      </div>
    )
  }
  if (cover === 'uni') return <div class={`${frame} bg-indigo-soft`} />
  const [viewBox, d] = size.thread
  return (
    <div class={`${frame} relative bg-surface-000`}>
      <svg
        width='100%'
        height='100%'
        viewBox={viewBox}
        preserveAspectRatio='none'
        aria-hidden='true'
        class='absolute inset-0'
      >
        <path
          d={d}
          stroke='var(--indigo)'
          stroke-width='1.5'
          fill='none'
          vector-effect='non-scaling-stroke'
        />
      </svg>
    </div>
  )
}
