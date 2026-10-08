import type { ProfileCover } from '/web/fixtures/profile-settings.ts'

// Plates stacked in pairs, seen at 30°: the one on top carries lines of
// text and the indigo thread runs down their side
const plates = [159, 152, 123, 116, 87, 80]

const Plate = (
  { y, children }: { y: number; children?: preact.ComponentChildren },
) => (
  <g transform={`translate(150 ${y}) matrix(.866 .5 -.866 .5 0 0)`}>
    <rect
      x='-80'
      y='-60'
      width='160'
      height='120'
      rx='14'
      fill='var(--surface-100)'
      stroke='var(--ink)'
      stroke-width='0.9'
      vector-effect='non-scaling-stroke'
    />
    {children}
  </g>
)

const Line = (
  { x1, x2, y, thread }: {
    x1: number
    x2: number
    y: number
    thread?: boolean
  },
) => (
  <line
    x1={x1}
    y1={y}
    x2={x2}
    y2={y}
    stroke={thread ? 'var(--indigo)' : 'var(--figure-edge)'}
    stroke-width={thread ? 1.5 : 0.9}
    stroke-linecap='round'
    vector-effect='non-scaling-stroke'
  />
)

const Plates = ({ width }: { width: number }) => (
  <svg
    width={width}
    height={Math.round(width * 255 / 310)}
    viewBox='0 0 310 255'
    aria-hidden='true'
    fill='none'
    class='block max-w-full'
  >
    {plates.map((y) => (
      <Plate key={y} y={y}>
        {y === 116 && (
          <>
            <Line x1={-60} x2={0} y={-30} />
            <Line x1={-60} x2={20} y={-22} />
          </>
        )}
        {y === 80 && (
          <>
            <Line x1={-80} x2={80} y={-42} />
            <Line x1={-34} x2={22} y={-4} thread />
            <Line x1={-34} x2={40} y={12} />
          </>
        )}
      </Plate>
    ))}
    <path
      d='M271 90 C 304 136, 296 196, 252 226'
      stroke='var(--indigo)'
      stroke-width='1.5'
      stroke-dasharray='4 4'
    />
    <circle cx='271' cy='90' r='3.5' fill='var(--indigo)' />
    <circle
      cx='252'
      cy='226'
      r='3.5'
      fill='var(--surface-100)'
      stroke='var(--indigo)'
      stroke-width='1.5'
    />
  </svg>
)

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
  { cover, small }: { cover: ProfileCover; small?: boolean },
) => {
  const size = sizes[small ? 'small' : 'large']
  const frame = `${size.box} border-b border-figure-edge`
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
