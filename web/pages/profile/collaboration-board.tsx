import { useId } from 'preact/hooks'

export type MapNode = {
  code: string
  name: string
  count: number
  verified: boolean
}

/** A live SVG instrument: all labels and hit targets stay selectable and sharp. */
export const CollaborationBoard = (
  { home, destinations, selected, onSelect }: {
    home: { code: string; name: string }
    destinations: MapNode[]
    selected: string
    onSelect: (code: string) => void
  },
) => {
  const uid = useId().replace(/[^a-z0-9]/gi, '')
  const id = (name: string) => `${uid}-${name}`
  const fill = (name: string) => `url(#${id(name)})`
  const positions = [[505, 315], [340, 130], [590, 180], [210, 205], [405, 235]]
  const shown = destinations.slice(0, 5)
  const active = destinations.find((node) => node.code === selected)
  if (active && !shown.some((node) => node.code === selected)) shown[4] = active
  const nodes = shown.map((node, i) => ({
    ...node,
    x: positions[i][0],
    y: positions[i][1],
  }))
  const origin = { ...home, x: 145, y: 305, count: 0, verified: false }
  const outline =
    'M349 40 Q362 32 376 40 L685 211 Q703 223 687 236 L407 421 Q393 430 379 423 L39 306 Q18 296 38 283Z'
  const shortName = (name: string) =>
    name.length > 22 ? `${name.slice(0, 20)}…` : name
  return (
    <div class='connection-board'>
      <svg
        viewBox='0 0 730 470'
        role='group'
        aria-label='Plateau des collaborations : choisir un pays'
      >
        <defs>
          <linearGradient id={id('top')} x1='0' y1='0' x2='1' y2='1'>
            <stop stop-color='var(--surface-100)' />
            <stop offset='1' stop-color='var(--surface-000)' />
          </linearGradient>
          <linearGradient id={id('side')} x1='0' y1='0' x2='0' y2='1'>
            <stop stop-color='var(--surface-200)' />
            <stop offset='1' stop-color='var(--line-strong)' />
          </linearGradient>
          <linearGradient id={id('indigo')} x1='0' y1='0' x2='1' y2='1'>
            <stop stop-color='var(--indigo)' />
            <stop offset='1' stop-color='var(--indigo-side)' />
          </linearGradient>
          <pattern
            id={id('grid')}
            width='22'
            height='14'
            patternUnits='userSpaceOnUse'
            patternTransform='rotate(-8)'
          >
            <circle
              cx='1'
              cy='1'
              r='.85'
              fill='var(--line-control)'
              opacity='.32'
            />
          </pattern>
          <filter
            id={id('shadow')}
            x='-60%'
            y='-60%'
            width='220%'
            height='240%'
          >
            <feDropShadow
              dx='0'
              dy='5'
              stdDeviation='5'
              flood-color='var(--ink)'
              flood-opacity='.13'
            />
          </filter>
        </defs>
        <path
          d={outline}
          transform='translate(0 16)'
          fill={fill('side')}
          stroke='var(--line-strong)'
          filter={fill('shadow')}
        />
        <path d={outline} fill={fill('top')} stroke='var(--line-strong)' />
        <path d={outline} fill={fill('grid')} />
        {nodes.map((node) => (
          <path
            key={node.code}
            d={`M${origin.x + 25} ${origin.y - 34} C${origin.x + 145} ${
              origin.y - 35
            } ${node.x - 125} ${node.y - 20} ${node.x} ${node.y - 42}`}
            fill='none'
            stroke='var(--indigo)'
            stroke-linecap='round'
            stroke-width={selected === node.code ? 5 : 3.5}
            opacity={selected === node.code ? 1 : .33}
            stroke-dasharray={node.verified ? undefined : '7 10'}
          />
        ))}
        {[origin, ...nodes].sort((a, b) => a.y - b.y).map((node) => {
          const isHome = node.code === home.code
          const isActive = node.code === selected
          const name = shortName(node.name)
          const labelWidth = Math.min(175, Math.max(80, name.length * 7.6 + 22))
          const countWidth = Math.max(35, String(node.count).length * 11 + 16)
          const art = (
            <>
              {!isHome && (
                <rect
                  x={node.x - 72}
                  y={node.y - 99}
                  width='144'
                  height='170'
                  rx='16'
                  fill='transparent'
                />
              )}
              <g filter={fill('shadow')}>
                <ellipse
                  cx={node.x}
                  cy={node.y + 9}
                  rx='57'
                  ry='29'
                  fill={fill('side')}
                />
                <path
                  d={`M${node.x - 57} ${node.y - 4}v13a57 29 0 0 0 114 0V${
                    node.y - 4
                  }`}
                  fill={fill('side')}
                />
                <ellipse
                  cx={node.x}
                  cy={node.y - 4}
                  rx='57'
                  ry='29'
                  fill={fill('top')}
                  stroke='var(--line-strong)'
                  stroke-width='1.2'
                />
                {(isHome || isActive) && (
                  <ellipse
                    cx={node.x}
                    cy={node.y - 9}
                    rx='43'
                    ry='23'
                    fill='var(--indigo-soft)'
                    stroke='var(--indigo)'
                    stroke-width={isActive ? 2.5 : 1}
                  />
                )}
                <ellipse
                  cx={node.x}
                  cy={node.y - 16}
                  rx='34'
                  ry='18'
                  fill={fill('side')}
                />
                <path
                  d={`M${node.x - 34} ${node.y - 43}v27a34 18 0 0 0 68 0v-27Z`}
                  fill={fill('top')}
                  stroke='var(--line)'
                />
                <ellipse
                  cx={node.x}
                  cy={node.y - 43}
                  rx='34'
                  ry='18'
                  fill={fill('top')}
                  stroke='var(--line)'
                />
                <ellipse
                  cx={node.x}
                  cy={node.y - 43}
                  rx='14'
                  ry='8'
                  fill='var(--indigo-side)'
                />
                <ellipse
                  cx={node.x}
                  cy={node.y - 47}
                  rx='14'
                  ry='8'
                  fill={fill('indigo')}
                />
              </g>
              <g class='board-country-label'>
                <rect
                  x={node.x - labelWidth / 2}
                  y={node.y + 37}
                  width={labelWidth}
                  height='29'
                  rx='9'
                  fill='var(--surface-100)'
                  stroke={isActive ? 'var(--indigo)' : 'var(--line)'}
                />
                <text
                  x={node.x}
                  y={node.y + 56}
                  text-anchor='middle'
                  fill={isActive ? 'var(--indigo)' : 'var(--ink)'}
                >
                  {name}
                </text>
              </g>
              {isHome
                ? (
                  <g class='board-origin-label'>
                    <rect
                      x={node.x - 62}
                      y={node.y - 99}
                      width='124'
                      height='26'
                      rx='8'
                      fill='var(--indigo)'
                    />
                    <path
                      d={`m${node.x - 5} ${node.y - 73} 5 6 5-6`}
                      fill='var(--indigo)'
                    />
                    <text
                      x={node.x}
                      y={node.y - 82}
                      text-anchor='middle'
                      fill='var(--on-indigo)'
                    >
                      Point de départ
                    </text>
                  </g>
                )
                : (
                  <g class='board-count-label'>
                    <rect
                      x={node.x - countWidth / 2}
                      y={node.y - 91}
                      width={countWidth}
                      height='30'
                      rx='10'
                      fill={isActive ? 'var(--indigo)' : 'var(--surface-100)'}
                      stroke={isActive ? 'var(--indigo)' : 'var(--line-strong)'}
                    />
                    <text
                      x={node.x}
                      y={node.y - 70}
                      text-anchor='middle'
                      fill={isActive ? 'var(--on-indigo)' : 'var(--ink)'}
                    >
                      {node.count}
                    </text>
                  </g>
                )}
            </>
          )
          return isHome ? <g key={node.code}>{art}</g> : (
            <g
              key={node.code}
              role='button'
              tabindex={0}
              class='board-destination'
              aria-label={`${node.name}, ${node.count} ${
                node.count > 1 ? 'liens' : 'lien'
              }`}
              aria-pressed={isActive}
              onClick={() => onSelect(node.code)}
              onKeyDown={(event) => {
                if (event.key === 'Enter' || event.key === ' ') {
                  event.preventDefault()
                  onSelect(node.code)
                }
              }}
            >
              <title>{node.name}</title>
              {art}
            </g>
          )
        })}
      </svg>
      <p class='board-caption'>
        Positions schématiques · Sélectionnez un pays
        {destinations.length > shown.length && (
          <span>· {shown.length} pays visibles sur {destinations.length}</span>
        )}
      </p>
    </div>
  )
}
