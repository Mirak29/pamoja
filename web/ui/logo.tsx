/** The Pamoja mark: a straight line and the indigo thread that links */
export const LogoMark = ({ size = 30 }: { size?: number }) => (
  <svg width={size} height={size} viewBox='0 0 64 64' aria-hidden='true'>
    <line
      x1='22'
      y1='12'
      x2='22'
      y2='54'
      stroke='var(--ink)'
      stroke-width='4'
      stroke-linecap='round'
    />
    <path
      d='M22 12 C 51 12, 51 38, 22 38'
      fill='none'
      stroke='var(--indigo)'
      stroke-width='4'
      stroke-linecap='round'
    />
    <circle cx='22' cy='12' r='5.5' fill='var(--indigo)' />
    <circle cx='22' cy='38' r='5.5' fill='var(--indigo)' />
  </svg>
)
