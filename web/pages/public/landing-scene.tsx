import { type Login, personOf } from '/web/fixtures/people.ts'

/*
 * The figure of the landing (PAM-128, §12.7): the loop of the demo (§18)
 * played on an isometric ground. Abdou in Dakar opens a pull request, the
 * matching looks around and picks Moussa in Abidjan, the indigo thread goes
 * to him dotted, GitHub confirms the review and it turns solid, then one
 * more proof lands on his column. Dotted is « not yet », solid is
 * « verified by GitHub », a column is a value: the rules of the interface.
 *
 * The animation is one cycle of 10 s (keyframes `scene-*` of style.css).
 * Without motion, every piece stays at the end of the story.
 */

// Projection at 30°, the one of the whole interface
const UNIT = 30
const ORIGIN = [290, 96] as const
const SIZE = 9
const THICKNESS = 10

type Point = readonly [number, number]

const at = (x: number, y: number, z = 0): Point => [
  ORIGIN[0] + (x - y) * 0.866 * UNIT,
  ORIGIN[1] + (x + y) * 0.5 * UNIT - z,
]

const down = ([x, y]: Point, by: number): Point => [x, y + by]

const points = (...list: Point[]) =>
  list.map(([x, y]) => `${x.toFixed(1)} ${y.toFixed(1)}`).join(' ')

const Face = (
  { list, fill, stroke = 'var(--ink)' }: {
    list: Point[]
    fill: string
    stroke?: string
  },
) => (
  <polygon
    points={points(...list)}
    fill={fill}
    stroke={stroke}
    stroke-width='0.9'
    stroke-linejoin='round'
  />
)

/** A column standing on the ground, from `base` up to `base + height` */
const Column = (
  { x, y, height, base = 0, width = 0.8, top, left, right }: {
    x: number
    y: number
    height: number
    base?: number
    width?: number
    top: string
    left: string
    right: string
  },
) => {
  const low = base
  const high = base + height
  return (
    <>
      <Face
        list={[
          at(x, y + width, low),
          at(x + width, y + width, low),
          at(x + width, y + width, high),
          at(x, y + width, high),
        ]}
        fill={left}
      />
      <Face
        list={[
          at(x + width, y + width, low),
          at(x + width, y, low),
          at(x + width, y, high),
          at(x + width, y + width, high),
        ]}
        fill={right}
      />
      <Face
        list={[
          at(x, y, high),
          at(x + width, y, high),
          at(x + width, y + width, high),
          at(x, y + width, high),
        ]}
        fill={top}
      />
    </>
  )
}

const RADIUS = 17

/** Where the disc of a person standing at a ground point is centered */
const discOf = (x: number, y: number): Point => {
  const [sx, sy] = at(x, y)
  return [sx, sy - RADIUS - 2]
}

const initialsOf = (login: Login) =>
  personOf(login).name.split(' ').map((word) => word[0]).join('').slice(0, 2)

// Who stands where, and the proofs each one already has (their column)
const cast: { login: Login; x: number; y: number; proofs: number }[] = [
  { login: 'amina', x: 1.6, y: 1.4, proofs: 22 },
  { login: 'moussa', x: 6.6, y: 2.3, proofs: 42 },
  { login: 'abdou', x: 2.6, y: 7.6, proofs: 14 },
  { login: 'kofi', x: 6.4, y: 6.9, proofs: 10 },
]

// Drawn from the back to the front: each one hides what stands behind
cast.sort((a, b) => a.x + a.y - (b.x + b.y))

const spot = (login: Login) => cast.find((c) => c.login === login)!

// The column of a person stands at their right
const columnOf = ({ x, y }: { x: number; y: number }) => ({
  x: x + 1.4,
  y: y - 0.6,
})

// Links not made yet between neighbours: dotted and gray
const neighbours: [Login, Login][] = [
  ['amina', 'moussa'],
  ['amina', 'abdou'],
  ['abdou', 'kofi'],
  ['kofi', 'moussa'],
]

const asker = spot('abdou')
const helper = spot('moussa')
const asked = discOf(asker.x, asker.y)
const picked = discOf(helper.x, helper.y)

// The thread leaves the top of the one who asks and reaches the side of the
// one who helps, low enough to pass in front of the others and under the
// score
const from: Point = [asked[0] + 4, asked[1] - RADIUS]
const to: Point = [picked[0] - RADIUS, picked[1] - 2]
const thread = `M${from[0].toFixed(1)} ${from[1].toFixed(1)} C ${
  (from[0] + 70).toFixed(1)
} ${(from[1] - 40).toFixed(1)}, ${(to[0] - 84).toFixed(1)} ${
  (to[1] - 34).toFixed(1)
}, ${to[0].toFixed(1)} ${to[1].toFixed(1)}`

const CAP = 9
const helperColumn = columnOf(helper)
const [countX, countY] = at(
  helperColumn.x + 0.4,
  helperColumn.y + 0.4,
  helper.proofs + CAP,
)

const Person = (
  { login, x, y, proofs }: {
    login: Login
    x: number
    y: number
    proofs: number
  },
) => {
  const [gx, gy] = at(x, y)
  const [cx, cy] = discOf(x, y)
  const column = columnOf({ x, y })
  return (
    <g>
      <Column
        {...column}
        height={proofs}
        top='var(--surface-200)'
        left='var(--surface-100)'
        right='var(--side)'
      />
      <ellipse
        cx={gx}
        cy={gy}
        rx='13'
        ry='7.5'
        stroke='var(--figure-edge)'
        stroke-width='0.9'
      />
      <circle cx={cx + 1.7} cy={cy + 1} r={RADIUS} fill='var(--figure-edge)' />
      <circle
        cx={cx}
        cy={cy}
        r={RADIUS}
        fill='var(--surface-200)'
        stroke='var(--figure-edge)'
      />
      <text
        x={cx}
        y={cy + 4}
        text-anchor='middle'
        fill='var(--ink)'
        class='font-display text-[11px] font-semibold'
        translate={false}
      >
        {initialsOf(login)}
      </text>
      <text
        x={gx}
        y={gy + 17}
        text-anchor='middle'
        fill='var(--ink-muted)'
        class='font-mono text-[9px] tracking-[.08em]'
        translate={false}
      >
        {personOf(login).city.toUpperCase()}
      </text>
    </g>
  )
}

// The matching looks at three developers before it picks one
const candidates: Login[] = ['amina', 'kofi', 'moussa']

const still = 'motion-reduce:animate-none'

export const LandingScene = () => (
  <svg
    viewBox='0 0 580 392'
    fill='none'
    aria-hidden='true'
    class='block h-auto w-full max-w-[640px]'
  >
    <defs>
      {/* The dotted thread shows as far as this stroke has been drawn */}
      <mask
        id='scene-drawn'
        maskUnits='userSpaceOnUse'
        x='0'
        y='0'
        width='580'
        height='392'
      >
        <path
          d={thread}
          stroke='#fff'
          stroke-width='8'
          pathLength='1'
          stroke-dasharray='1'
          class={`animate-scene-draw ${still}`}
        />
      </mask>
    </defs>

    {/* The ground, a slab like every other */}
    <Face
      list={[
        at(0, SIZE),
        at(SIZE, SIZE),
        down(at(SIZE, SIZE), THICKNESS),
        down(at(0, SIZE), THICKNESS),
      ]}
      fill='var(--surface-100)'
    />
    <Face
      list={[
        at(SIZE, SIZE),
        at(SIZE, 0),
        down(at(SIZE, 0), THICKNESS),
        down(at(SIZE, SIZE), THICKNESS),
      ]}
      fill='var(--side)'
    />
    <Face
      list={[at(0, 0), at(SIZE, 0), at(SIZE, SIZE), at(0, SIZE)]}
      fill='var(--surface-100)'
    />
    {Array.from({ length: SIZE - 1 }, (_, i) => i + 1).map((i) => (
      <g key={i} stroke='var(--line)' stroke-width='0.6'>
        <line
          x1={at(i, 0)[0]}
          y1={at(i, 0)[1]}
          x2={at(i, SIZE)[0]}
          y2={at(i, SIZE)[1]}
        />
        <line
          x1={at(0, i)[0]}
          y1={at(0, i)[1]}
          x2={at(SIZE, i)[0]}
          y2={at(SIZE, i)[1]}
        />
      </g>
    ))}

    {neighbours.map(([a, b]) => {
      const [x1, y1] = at(spot(a).x, spot(a).y)
      const [x2, y2] = at(spot(b).x, spot(b).y)
      return (
        <line
          key={`${a}-${b}`}
          x1={x1}
          y1={y1}
          x2={x2}
          y2={y2}
          stroke='var(--figure-edge)'
          stroke-width='0.9'
          stroke-dasharray='2 4'
        />
      )
    })}

    {/* The matching looks around: a ring under each developer it weighs */}
    {candidates.map((login, i) => {
      const [gx, gy] = at(spot(login).x, spot(login).y)
      return (
        <ellipse
          key={login}
          cx={gx}
          cy={gy}
          rx='19'
          ry='11'
          stroke='var(--indigo)'
          stroke-width='1.5'
          style={{ animationDelay: `${i * 220}ms` }}
          class={`origin-center opacity-0 [transform-box:fill-box] animate-scene-ring ${still}`}
        />
      )
    })}

    {cast.map((person) => <Person key={person.login} {...person} />)}

    {/* The helper picked: an indigo edge, and why (the score) */}
    <g class={`animate-scene-pick ${still}`}>
      <circle
        cx={picked[0]}
        cy={picked[1]}
        r={RADIUS}
        stroke='var(--indigo)'
        stroke-width='1.8'
      />
      <text
        x={picked[0] + 1}
        y={picked[1] - RADIUS - 11}
        text-anchor='middle'
        fill='var(--indigo)'
        class='font-mono text-[11px] font-medium'
        translate={false}
      >
        93 / 100
      </text>
    </g>

    {/* The pull request of the one who asks */}
    <g class={`animate-scene-pr ${still}`}>
      <line
        x1={asked[0] - 9}
        y1={asked[1] - 40}
        x2={asked[0] - 3}
        y2={asked[1] - RADIUS - 2}
        stroke='var(--figure-edge)'
        stroke-dasharray='2 3'
      />
      <g
        transform={`translate(${(asked[0] - 14).toFixed(1)} ${
          (asked[1] - 58).toFixed(1)
        })`}
      >
        <g transform='translate(0 5) matrix(.866 .5 -.866 .5 0 0)'>
          <rect
            x='-22'
            y='-16'
            width='44'
            height='32'
            rx='4'
            fill='var(--side)'
            stroke='var(--ink)'
            stroke-width='0.9'
            vector-effect='non-scaling-stroke'
          />
        </g>
        <g transform='matrix(.866 .5 -.866 .5 0 0)'>
          <rect
            x='-22'
            y='-16'
            width='44'
            height='32'
            rx='4'
            fill='var(--indigo-soft)'
            stroke='var(--ink)'
            stroke-width='0.9'
            vector-effect='non-scaling-stroke'
          />
          <line
            x1='-14'
            y1='-7'
            x2='8'
            y2='-7'
            stroke='var(--indigo)'
            stroke-width='1.5'
            stroke-linecap='round'
            vector-effect='non-scaling-stroke'
          />
          <line
            x1='-14'
            y1='1'
            x2='14'
            y2='1'
            stroke='var(--figure-edge)'
            stroke-width='0.9'
            stroke-linecap='round'
            vector-effect='non-scaling-stroke'
          />
          <line
            x1='-14'
            y1='8'
            x2='2'
            y2='8'
            stroke='var(--figure-edge)'
            stroke-width='0.9'
            stroke-linecap='round'
            vector-effect='non-scaling-stroke'
          />
        </g>
        <text
          x='-40'
          y='-12'
          text-anchor='end'
          fill='var(--ink)'
          class='font-mono text-[10px] font-medium'
          translate={false}
        >
          PR #81
        </text>
      </g>
    </g>

    {
      /* The thread: dotted while the review is on its way, solid once GitHub
        confirmed it */
    }
    <g class={`animate-scene-fade ${still}`}>
      <path
        id='scene-thread'
        d={thread}
        stroke='var(--indigo)'
        stroke-width='1.6'
        stroke-dasharray='4 5'
        stroke-linecap='round'
        mask='url(#scene-drawn)'
      />
      <path
        d={thread}
        stroke='var(--indigo)'
        stroke-width='2'
        stroke-linecap='round'
        class={`animate-scene-solid ${still}`}
      />
      <circle cx={from[0]} cy={from[1]} r='2.8' fill='var(--indigo)' />
    </g>

    {/* The request travelling along the thread */}
    <g class={`opacity-0 animate-scene-packet ${still}`}>
      <rect
        x='-4.5'
        y='-4.5'
        width='9'
        height='9'
        rx='1.5'
        fill='var(--indigo)'
        stroke='var(--surface-100)'
        stroke-width='1.2'
        transform='rotate(45)'
      >
        <animateMotion
          dur='10s'
          repeatCount='indefinite'
          calcMode='linear'
          keyTimes='0;0.33;0.56;1'
          keyPoints='0;0;1;1'
        >
          <mpath href='#scene-thread' />
        </animateMotion>
      </rect>
    </g>

    {/* GitHub confirmed the review */}
    <g
      class={`origin-center [transform-box:fill-box] animate-scene-check ${still}`}
    >
      <circle
        cx={picked[0] + 12}
        cy={picked[1] - 11}
        r='7.5'
        fill='var(--verified-soft)'
        stroke='var(--verified)'
        stroke-width='1.2'
      />
      <polyline
        points={`${picked[0] + 8.4},${picked[1] - 11} ${picked[0] + 11},${
          picked[1] - 8.4
        } ${picked[0] + 15.8},${picked[1] - 13.6}`}
        stroke='var(--verified)'
        stroke-width='1.6'
        stroke-linecap='round'
        stroke-linejoin='round'
      />
    </g>

    {/* One more proof lands on the column of the helper */}
    <g class={`animate-scene-cap ${still}`}>
      <Column
        {...helperColumn}
        base={helper.proofs}
        height={CAP}
        top='var(--indigo)'
        left='var(--indigo-soft)'
        right='var(--indigo-soft-side)'
      />
    </g>
    <text
      x={countX}
      y={countY - 14}
      text-anchor='middle'
      fill='var(--ink-muted)'
      class={`font-mono text-[12px] font-medium opacity-0 animate-scene-was ${still}`}
      translate={false}
    >
      14
    </text>
    <text
      x={countX}
      y={countY - 14}
      text-anchor='middle'
      fill='var(--indigo)'
      class={`font-mono text-[12px] font-semibold animate-scene-now ${still}`}
      translate={false}
    >
      15
    </text>
  </svg>
)
