import type { ComponentChildren } from 'preact'

// Plates stacked in pairs, seen at 30°: the one on top carries lines of
// text and the indigo thread runs down their side
const plates = [159, 152, 123, 116, 87, 80]

const Plate = (
  { y, children }: { y: number; children?: ComponentChildren },
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

/**
 * Plates stacked at 30° with the indigo thread down their side: the cover
 * « Plaques » of a profile and the figure of the public pages, the only
 * illustrations of the interface (§12.7).
 *
 * @example
 * <Plates width={440} />
 */
export const Plates = (
  { width, height = Math.floor(width * 255 / 310) }: {
    width: number
    height?: number
  },
) => (
  <svg
    width={width}
    height={height}
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
