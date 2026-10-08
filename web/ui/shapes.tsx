/**
 * Shapes of the isometric system: a project is a cube, a state is a diamond.
 *
 * @example
 * <Cube size={44} />
 * <Diamond state='done' />
 */
const cubeTops = {
  soft: 'var(--indigo-soft)',
  filled: 'var(--indigo)',
  plain: 'var(--surface-100)',
} as const

export const Cube = (
  { size = 28, top = 'soft' }: {
    size?: number
    /** Filled for one's own projects, plain for followed ones */
    top?: keyof typeof cubeTops
  },
) => (
  <svg
    width={size}
    height={size}
    viewBox='0 0 28 28'
    aria-hidden='true'
    class='shrink-0'
  >
    <polygon
      points='14,2 25,8 14,14 3,8'
      fill={cubeTops[top]}
      stroke='var(--ink)'
      stroke-width='1'
      stroke-linejoin='round'
    />
    <polygon
      points='3,8 14,14 14,26 3,20'
      fill='var(--surface-100)'
      stroke='var(--ink)'
      stroke-width='1'
      stroke-linejoin='round'
    />
    <polygon
      points='25,8 14,14 14,26 25,20'
      fill='var(--side)'
      stroke='var(--ink)'
      stroke-width='1'
      stroke-linejoin='round'
    />
  </svg>
)

const diamondStates = {
  done: 'bg-indigo',
  current: 'bg-indigo-soft border-[1.5px] border-indigo',
  todo: 'border border-dashed border-line-control',
} as const

export const Diamond = (
  { state }: { state: keyof typeof diamondStates },
) => (
  <span aria-hidden='true' class={`diamond size-3 ${diamondStates[state]}`} />
)

/**
 * Faces of an isometric column standing at (cx, by): half width `a`, half
 * depth `b`, height `h`. Columns encode values: Pulse metrics, milestones,
 * badges and the Collaboration Map.
 *
 * @example
 * const { top, left, right } = prism(22, 58, 14, 8, 30)
 * <polygon points={top} />
 */
export const prism = (
  cx: number,
  by: number,
  a: number,
  b: number,
  h: number,
) => ({
  top: [cx, by - h - b, cx + a, by - h, cx, by - h + b, cx - a, by - h].join(
    ' ',
  ),
  left: [cx - a, by - h, cx, by - h + b, cx, by + b, cx - a, by].join(' '),
  right: [cx, by - h + b, cx + a, by - h, cx + a, by, cx, by + b].join(' '),
})
