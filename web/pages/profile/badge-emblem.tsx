import type { Badge } from '/web/fixtures/reputation.ts'

/** A collectible seal, built from the same raised plates as the app. */
export const BadgeEmblem = ({ badge }: { badge: Badge }) => {
  const kind = badge.dimension ?? 'border'
  return (
    <svg viewBox='0 0 144 144' class='badge-emblem' aria-hidden='true'>
      <ellipse cx='74' cy='127' rx='43' ry='7' fill='var(--line)' />
      <path d='M72 12 124 42V102L72 132 20 102V42Z' fill='var(--badge-edge)' />
      <path
        d='M72 5 124 35V95L72 125 20 95V35Z'
        fill='var(--badge-face)'
        stroke='var(--badge-edge)'
        stroke-width='2'
        stroke-linejoin='round'
      />
      <path
        d='M72 13 117 39V91L72 117 27 91V39Z'
        fill='none'
        stroke='var(--badge-edge)'
        stroke-opacity='.45'
      />
      <path
        d='M29 40 72 15 115 40 72 65Z'
        fill='var(--surface-100)'
        opacity='.4'
      />
      <path
        d='M72 65 115 40V90L72 115Z'
        fill='var(--badge-edge)'
        opacity='.08'
      />
      <g
        fill='none'
        stroke='var(--badge-edge)'
        stroke-width='3'
        stroke-linecap='round'
        stroke-linejoin='round'
      >
        {kind === 'review' && (
          <>
            <path
              d='M43 57 72 41 101 57V81L72 98 43 81Z'
              fill='var(--surface-100)'
            />
            <path d='m55 66 10 10 24-22M43 57l29 17 29-17M72 74v24' />
          </>
        )}
        {kind === 'build' && (
          <>
            <path
              d='m43 74 29-17 29 17v19l-29 17-29-17Z'
              fill='var(--surface-100)'
            />
            <path d='m43 74 29 17 29-17M72 91v19' />
            <path
              d='m49 47 23-13 23 13v20L72 80 49 67Z'
              fill='var(--badge-face)'
            />
            <path d='m49 47 23 13 23-13M72 60v20' />
          </>
        )}
        {kind === 'help' && (
          <>
            <path
              d='m78 32-30 39h21l-5 32 32-42H75Z'
              fill='var(--surface-100)'
            />
            <path d='m40 48-6-3m9 41-7 4m65-45 7-4m-9 47 7 4' />
          </>
        )}
        {kind === 'mentor' && (
          <>
            <path
              d='M72 99V62m0 17C48 80 42 64 44 52c20-1 29 11 28 27Zm0-15c-1-20 9-30 27-31 2 19-9 30-27 31Z'
              fill='var(--surface-100)'
            />
            <path d='m49 99 23-13 23 13-23 13Z' fill='var(--badge-face)' />
          </>
        )}
        {kind === 'oss' && (
          <>
            <path d='M54 91V48m36 0v15c0 16-36 11-36 28' />
            <circle cx='54' cy='43' r='9' fill='var(--surface-100)' />
            <circle cx='90' cy='43' r='9' fill='var(--surface-100)' />
            <circle cx='54' cy='97' r='9' fill='var(--surface-100)' />
            <path d='m83 91 7 7 12-15' />
          </>
        )}
        {kind === 'border' && (
          <>
            <ellipse
              cx='72'
              cy='66'
              rx='29'
              ry='29'
              fill='var(--surface-100)'
            />
            <ellipse cx='72' cy='66' rx='12' ry='29' />
            <path d='M43 66h58M48 51h48M48 81h48m-58 19 14-6m62 6-14-6' />
            <path d='m33 103 8-12 8 9m62 3-8-12-8 9' />
          </>
        )}
      </g>
      <path d='m72 106 4 3-1 5-3-2-3 2-1-5Z' fill='var(--badge-edge)' />
      {Array.from(
        { length: Math.max(0, badge.level + 1) },
        (_, i) => (
          <path
            key={i}
            d={`m${57 + i * 10} 22 3-2 3 2-3 2Z`}
            fill='var(--badge-edge)'
          />
        ),
      )}
    </svg>
  )
}
