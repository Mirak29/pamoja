/**
 * Shapes of the isometric system: a project is a cube, a state is a diamond.
 *
 * @example
 * <Cube size={44} />
 * <Diamond state='done' />
 */
export const Cube = ({ size = 28 }: { size?: number }) => (
  <svg
    width={size}
    height={size}
    viewBox='0 0 28 28'
    aria-hidden='true'
    class='shrink-0'
  >
    <polygon
      points='14,2 25,8 14,14 3,8'
      fill='var(--indigo-soft)'
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
