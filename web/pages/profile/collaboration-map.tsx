import { A } from '@01edu/signal-router'
import { useEffect, useRef, useState } from 'preact/hooks'
import {
  countries,
  type Login,
  people,
  personOf,
} from '/web/fixtures/people.ts'
import { badgesOf, linksOf, lockedBadgesOf } from '/web/fixtures/reputation.ts'
import { Minus, Plus, RotateCcw } from '/web/assets/icons.tsx'
import { initials } from '/web/ui/avatar.tsx'
import { Button } from '/web/ui/button.tsx'
import { Eyebrow } from '/web/ui/eyebrow.tsx'
import {
  BadgeMedal,
  levelName,
  metalText,
} from '/web/pages/profile/reputation.tsx'
import { land } from '/web/pages/profile/land.ts'
import { t, translate } from '/web/lib/language.ts'

// Longitude and latitude of the countries placed on the globe
const positions: Record<string, [number, number]> = {
  SN: [-14.5, 14.5],
  GN: [-11, 10.5],
  ML: [-4, 17],
  BF: [-1.5, 12.3],
  CI: [-5.5, 7.5],
  GH: [-1, 7.9],
  TG: [1, 8.6],
  BJ: [2.3, 9.3],
  NG: [8, 9.5],
  CM: [12, 5.5],
  MA: [-6.8, 31.8],
  DZ: [3, 28],
  TN: [9.5, 34],
  EG: [30.8, 26.8],
  ET: [39.5, 9],
  UG: [32.3, 1.4],
  RW: [29.9, -2],
  KE: [37.9, 0.2],
  TZ: [34.9, -6.4],
  CD: [23.6, -2.9],
  AO: [17.9, -11.2],
  ZM: [27.8, -13.1],
  ZW: [29.2, -19],
  MZ: [35.5, -18.7],
  MG: [46.9, -18.8],
  ZA: [25, -29],
}

// The map names its countries with the ISO code; text uses the full name
const countryName = (code: string) =>
  Object.entries(countries).find(([, iso]) => iso === code)?.[0] ?? code

// The list shows the strongest countries; the rest is one click away
const MAX_COUNTRIES = 5
const MAX_PEOPLE = 4

type Linked = { count: number; verified: boolean; logins: Login[] }

/** Collaborations of a profile by country, its own country left out */
const linkedCountries = (login: Login) => {
  const home = people[login].countryCode
  const byCountry = new Map<string, Linked>()
  for (const link of linksOf(login)) {
    // A developer without a country is not on the map (§9.3)
    const code = personOf(link.login).countryCode
    if (!code || code === home) continue
    const entry = byCountry.get(code) ??
      { count: 0, verified: false, logins: [] }
    entry.count += link.count
    entry.verified ||= link.verified
    entry.logins.push(link.login)
    byCountry.set(code, entry)
  }
  return [...byCountry].sort(([, a], [, b]) => b.count - a.count)
}

/*
 * The globe is drawn by hand, without a map library: an orthographic view of
 * a sphere of radius `radius`, centred on (lon, lat). No coastline is drawn
 * (§9.3): only meridians and parallels, the countries and the threads.
 */

type View = { lon: number; lat: number; radius: number }
type Vector = [number, number, number]

const W = 360
const H = 360
const RAD = Math.PI / 180
const MIN_RADIUS = 110
const MAX_RADIUS = 900

const vectorOf = (lon: number, lat: number): Vector => [
  Math.cos(lat * RAD) * Math.cos(lon * RAD),
  Math.cos(lat * RAD) * Math.sin(lon * RAD),
  Math.sin(lat * RAD),
]

// Seen from the viewer: x to the right, y up, z towards the viewer
const turn = (v: Vector, view: View): Vector => {
  const lon = view.lon * RAD
  const lat = view.lat * RAD
  const front = v[0] * Math.cos(lon) + v[1] * Math.sin(lon)
  const side = -v[0] * Math.sin(lon) + v[1] * Math.cos(lon)
  return [
    side,
    Math.cos(lat) * v[2] - Math.sin(lat) * front,
    Math.sin(lat) * v[2] + Math.cos(lat) * front,
  ]
}

const screen = ([x, y]: Vector, view: View) =>
  [W / 2 + x * view.radius, H / 2 - y * view.radius] as const

// Tilts the view south so the countries sit above the centre: their threads
// then rise away from the globe instead of towards the viewer
const tilt = (view: View, degrees: number): View => ({
  ...view,
  lat: view.lat - degrees,
})

// Hidden when the sphere stands between the point and the viewer
const hidden = ([x, y, z]: Vector) => z < 0 && x * x + y * y < 1

// A line through the visible points, broken where it passes behind
const pathOf = (points: Vector[], view: View) => {
  let d = ''
  let drawing = false
  for (const point of points) {
    const seen = turn(point, view)
    if (hidden(seen)) {
      drawing = false
      continue
    }
    const [x, y] = screen(seen, view)
    d += `${drawing ? 'L' : 'M'}${x.toFixed(1)} ${y.toFixed(1)}`
    drawing = true
  }
  return d
}

const landRings = land.map((ring) => {
  const points: Vector[] = []
  for (let i = 0; i < ring.length; i += 2) {
    points.push(vectorOf(ring[i], ring[i + 1]))
  }
  return points
})

// Land as filled shapes: a point behind the globe is pushed onto its edge,
// so a coast that passes behind follows the horizon
const landOf = (view: View) => {
  let d = ''
  for (const ring of landRings) {
    let front = false
    let part = ''
    ring.forEach((point, i) => {
      let [x, y, z] = turn(point, view)
      if (z < 0) {
        const norm = Math.hypot(x, y) || 1
        x /= norm
        y /= norm
      } else front = true
      const [sx, sy] = screen([x, y, z], view)
      part += `${i ? 'L' : 'M'}${sx.toFixed(1)} ${sy.toFixed(1)}`
    })
    if (front) d += `${part}Z`
  }
  return d
}

const steps = (from: number, to: number, step: number) =>
  Array.from(
    { length: Math.round((to - from) / step) + 1 },
    (_, i) => from + i * step,
  )

// Meridians and parallels every 15 degrees
const graticule = [
  ...steps(-180, 165, 15).map((lon) =>
    steps(-90, 90, 3).map((lat) => vectorOf(lon, lat))
  ),
  ...steps(-75, 75, 15).map((lat) =>
    steps(-180, 180, 3).map((lon) => vectorOf(lon, lat))
  ),
]

// A great circle that rises above the sphere, higher for longer trips
const arcOf = (from: Vector, to: Vector): Vector[] => {
  const dot = from[0] * to[0] + from[1] * to[1] + from[2] * to[2]
  const angle = Math.acos(Math.min(1, Math.max(-1, dot)))
  const lift = 0.2 + 0.3 * angle / Math.PI
  return steps(0, 1, 1 / 40).map((t) => {
    const a = Math.sin((1 - t) * angle) / Math.sin(angle)
    const b = Math.sin(t * angle) / Math.sin(angle)
    const k = 1 + lift * Math.sin(Math.PI * t)
    return [
      (a * from[0] + b * to[0]) * k,
      (a * from[1] + b * to[1]) * k,
      (a * from[2] + b * to[2]) * k,
    ]
  })
}

/** The view that frames some points: centred on them, zoomed to fit */
const frame = (points: Vector[]): View => {
  if (!points.length) return { lon: 15, lat: 5, radius: 150 }
  const sum = points.reduce((s, p) => [s[0] + p[0], s[1] + p[1], s[2] + p[2]])
  const norm = Math.hypot(...sum) || 1
  const center: Vector = [sum[0] / norm, sum[1] / norm, sum[2] / norm]
  const spread = Math.max(
    0.14,
    ...points.map((p) =>
      Math.acos(
        Math.min(1, p[0] * center[0] + p[1] * center[1] + p[2] * center[2]),
      )
    ),
  )
  return {
    lon: Math.atan2(center[1], center[0]) / RAD,
    lat: Math.asin(center[2]) / RAD,
    radius: Math.min(
      MAX_RADIUS,
      Math.max(MIN_RADIUS * 1.2, 100 / Math.sin(Math.min(spread, 1.4))),
    ),
  }
}

const reducedMotion = () =>
  globalThis.matchMedia?.('(prefers-reduced-motion: reduce)').matches ?? false

const ease = (t: number) =>
  t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2

type Node = {
  code: string
  kind: 'home' | 'linked' | 'ghost'
  at: Vector
  linked?: Linked
}

/**
 * Collaboration Map: a globe that turns under the finger, an indigo thread
 * from the profile country to each country it worked with, thicker for more
 * collaborations, and the countries ranked beside it (§9.3). The countries
 * where developers of Pamoja live, not linked yet, are dotted. The profile
 * country is never counted.
 */
export const CollaborationMap = ({ login }: { login: Login }) => {
  const person = people[login]
  const home = person.countryCode
  const ranked = linkedCountries(login)
  const linked = new Map(ranked)
  const max = Math.max(1, ...ranked.map(([, c]) => c.count))
  const toLink = [...new Set(Object.values(people).map((p) => p.countryCode))]
    .filter((code) => code !== home && !linked.has(code) && positions[code])
  const homeAt = positions[home] && vectorOf(...positions[home])
  const nodes: Node[] = [
    ...(homeAt ? [{ code: home, kind: 'home' as const, at: homeAt }] : []),
    ...ranked
      .filter(([code]) => positions[code])
      .map(([code, linked]) => ({
        code,
        kind: 'linked' as const,
        at: vectorOf(...positions[code]),
        linked,
      })),
    ...toLink.map((code) => ({
      code,
      kind: 'ghost' as const,
      at: vectorOf(...positions[code]),
    })),
  ]
  // The whole globe, like the map of the 01 network, turned to the countries
  const framing = tilt(
    { ...frame(nodes.map((node) => node.at)), radius: 165 },
    15,
  )

  const [hovered, setHovered] = useState<string | null>(null)
  const [allCountries, setAllCountries] = useState(false)
  // The globe opens turned away and flies to the countries, like a trip
  const [view, setView] = useState<View>(() =>
    reducedMotion() ? framing : {
      ...framing,
      lon: framing.lon - 70,
      lat: framing.lat - 15,
      radius: MIN_RADIUS,
    }
  )
  const current = useRef(view)
  current.current = view
  const motion = useRef(0)
  const drag = useRef<{ x: number; y: number; from: View } | null>(null)

  const flyTo = (target: View) => {
    cancelAnimationFrame(motion.current)
    if (reducedMotion()) return setView(target)
    const from = current.current
    const turnLon = ((target.lon - from.lon + 540) % 360) - 180
    const start = performance.now()
    const step = (now: number) => {
      const t = Math.min(1, (now - start) / 1100)
      const e = ease(t)
      setView({
        lon: from.lon + turnLon * e,
        lat: from.lat + (target.lat - from.lat) * e,
        radius: from.radius + (target.radius - from.radius) * e,
      })
      if (t < 1) motion.current = requestAnimationFrame(step)
    }
    motion.current = requestAnimationFrame(step)
  }

  useEffect(() => {
    flyTo(framing)
    return () => cancelAnimationFrame(motion.current)
  }, [login])

  const zoom = (factor: number) =>
    flyTo({
      ...current.current,
      radius: Math.min(
        MAX_RADIUS,
        Math.max(MIN_RADIUS, current.current.radius * factor),
      ),
    })
  const focus = (code: string) => {
    if (!homeAt) return
    const pair = frame([homeAt, vectorOf(...positions[code])])
    flyTo(tilt({ ...pair, radius: Math.max(420, pair.radius) }, 2))
  }

  const seen = nodes
    .map((node) => ({ ...node, seen: turn(node.at, view) }))
    .filter((node) => node.seen[2] > 0)
    .sort((a, b) => a.seen[2] - b.seen[2])
  const dim = (code: string) => hovered !== null && hovered !== code
  const hover = (code: string | null) => () => setHovered(code)
  const [cx, cy] = [W / 2, H / 2]
  const cross = badgesOf(login).find((b) => b.key === 'cross_border')
  const crossLocked = lockedBadgesOf(login).find((b) =>
    b.key === 'cross_border'
  )

  return (
    <section class='slab flex flex-col gap-3 p-[22px]'>
      <div class='flex flex-wrap items-baseline justify-between gap-3'>
        <Eyebrow>Collaboration Map</Eyebrow>
        <span class='text-[13px] text-ink-muted'>
          {ranked.length} {ranked.length > 1 ? 'pays reliés' : 'pays relié'}
          {' '}
          depuis {person.country}
        </span>
      </div>
      <div class='grid items-center gap-5 md:grid-cols-[minmax(0,1.15fr)_minmax(0,1fr)]'>
        <div class='relative flex flex-col gap-2'>
          <svg
            viewBox={`0 0 ${W} ${H}`}
            width='100%'
            class='mx-auto block max-w-[440px] cursor-grab touch-pan-y select-none active:cursor-grabbing'
            role='img'
            tabIndex={0}
            aria-label='Globe des collaborations. Flèches pour le tourner, plus et moins pour zoomer.'
            onPointerDown={(event) => {
              cancelAnimationFrame(motion.current)
              drag.current = {
                x: event.clientX,
                y: event.clientY,
                from: current.current,
              }
              event.currentTarget.setPointerCapture(event.pointerId)
            }}
            onPointerMove={(event) => {
              const start = drag.current
              if (!start) return
              const scale = W /
                event.currentTarget.getBoundingClientRect().width
              const per = scale / start.from.radius / RAD
              setView({
                ...start.from,
                lon: start.from.lon - (event.clientX - start.x) * per,
                lat: Math.min(
                  80,
                  Math.max(
                    -80,
                    start.from.lat + (event.clientY - start.y) * per,
                  ),
                ),
              })
            }}
            onPointerUp={() => drag.current = null}
            onPointerCancel={() => drag.current = null}
            onKeyDown={(event) => {
              const shift: Record<string, [number, number]> = {
                ArrowLeft: [-8, 0],
                ArrowRight: [8, 0],
                ArrowUp: [0, 8],
                ArrowDown: [0, -8],
              }
              if (event.key === '+' || event.key === '=') zoom(1.3)
              else if (event.key === '-') zoom(1 / 1.3)
              else if (shift[event.key]) {
                const [lon, lat] = shift[event.key]
                const from = current.current
                flyTo({
                  ...from,
                  lon: from.lon + lon * 150 / from.radius,
                  lat: Math.min(
                    80,
                    Math.max(-80, from.lat + lat * 150 / from.radius),
                  ),
                })
              } else return
              event.preventDefault()
            }}
          >
            {
              /* The colours of Pamoja: indigo sea, land in the colour of the
              slabs. The sphere stands on the ground: its thickness is an
              offset disc, never a blurred shadow */
            }
            <circle
              cx={cx + 3.5}
              cy={cy + 2}
              r={view.radius}
              fill='var(--figure-edge)'
            />
            <circle cx={cx} cy={cy} r={view.radius} fill='var(--indigo)' />
            <path d={landOf(view)} fill='var(--surface-100)' />
            <path
              d={graticule.map((line) => pathOf(line, view)).join('')}
              fill='none'
              stroke='var(--on-indigo)'
              stroke-width='0.5'
              opacity='0.3'
            />
            <circle
              cx={cx}
              cy={cy}
              r={view.radius}
              fill='none'
              stroke='var(--surface-100)'
              stroke-width='2'
            />
            {homeAt && nodes.filter((node) => node.kind === 'linked').map(
              ({ code, at, linked }) => {
                const d = pathOf(arcOf(homeAt, at), view)
                const width = (hovered === code ? 1.2 : 0) + 1.2 +
                  2.2 * linked!.count / max
                const dash = linked!.verified ? '0' : '4 3'
                // A light halo keeps the thread readable over sea and land
                return (
                  <g
                    key={code}
                    fill='none'
                    stroke-linecap='round'
                    stroke-dasharray={dash}
                    opacity={dim(code) ? 0.25 : 1}
                  >
                    <path
                      d={d}
                      stroke='var(--surface-100)'
                      stroke-width={width + 2.4}
                    />
                    <path
                      d={d}
                      stroke='var(--indigo)'
                      stroke-width={width}
                    />
                  </g>
                )
              },
            )}
            {seen.map(({ code, kind, seen: at, linked }) => {
              const [x, y] = screen(at, view)
              // Markers grow with the zoom: dots on the whole globe, labelled
              // discs once the countries stand apart
              const k = Math.min(1, Math.max(0.5, view.radius / 330))
              const labelled = k > 0.8
              if (kind === 'home') {
                return (
                  <g key={code}>
                    <circle
                      cx={x + 1.7 * k}
                      cy={y + k}
                      r={12 * k}
                      fill='var(--figure-edge)'
                    />
                    <circle
                      cx={x}
                      cy={y}
                      r={12 * k}
                      fill='var(--indigo)'
                      stroke='var(--surface-100)'
                      stroke-width='1.5'
                    />
                    {labelled && (
                      <text
                        x={x}
                        y={y + 3.2}
                        text-anchor='middle'
                        fill='var(--on-indigo)'
                        font-size='9'
                        class='font-display font-bold'
                      >
                        {initials(person.name)}
                      </text>
                    )}
                  </g>
                )
              }
              if (kind === 'ghost') {
                return (
                  <g key={code}>
                    <circle
                      cx={x}
                      cy={y}
                      r={7.5 * k}
                      fill='var(--surface-100)'
                      stroke='var(--line-control)'
                      stroke-dasharray='2 1.5'
                    />
                    {labelled && (
                      <text
                        x={x}
                        y={y + 2}
                        text-anchor='middle'
                        fill='var(--ink-muted)'
                        font-size='5.5'
                        class='font-mono font-semibold'
                      >
                        {code}
                      </text>
                    )}
                  </g>
                )
              }
              const on = hovered === code
              // A country is a disc, like the schools on the 01 globe, with
              // its count in an indigo badge
              return (
                <g
                  key={code}
                  opacity={dim(code) ? 0.45 : 1}
                  onMouseEnter={hover(code)}
                  onMouseLeave={hover(null)}
                >
                  <circle
                    cx={x + 1.7 * k}
                    cy={y + k}
                    r={10 * k}
                    fill='var(--figure-edge)'
                  />
                  <circle
                    cx={x}
                    cy={y}
                    r={10 * k}
                    fill='var(--surface-100)'
                    stroke={on ? 'var(--indigo)' : 'var(--figure-edge)'}
                    stroke-width={on ? 1.6 : 0.8}
                  />
                  {labelled && (
                    <>
                      <text
                        x={x}
                        y={y + 2.4}
                        text-anchor='middle'
                        fill='var(--ink)'
                        font-size='7'
                        class='font-mono font-semibold'
                      >
                        {code}
                      </text>
                      <circle
                        cx={x + 8}
                        cy={y - 8}
                        r='5.5'
                        fill='var(--indigo)'
                        stroke='var(--surface-100)'
                      />
                      <text
                        x={x + 8}
                        y={y - 5.8}
                        text-anchor='middle'
                        fill='var(--on-indigo)'
                        font-size='6'
                        class='font-mono font-semibold'
                      >
                        {linked!.count}
                      </text>
                    </>
                  )}
                </g>
              )
            })}
            {
              /* The hovered country is named in a pill, whatever the zoom */
            }
            {seen.filter((node) => node.code === hovered).map(
              ({ code, seen: at, linked }) => {
                const [x, y] = screen(at, view)
                const label = `${translate(countryName(code))} · ${
                  linked?.count ?? 0
                }`
                const width = label.length * 4.6 + 12
                return (
                  <g key={code} pointer-events='none'>
                    <rect
                      x={x - width / 2}
                      y={y - 28}
                      width={width}
                      height='14'
                      rx='4'
                      fill='var(--surface-100)'
                      stroke='var(--figure-edge)'
                    />
                    <text
                      x={x}
                      y={y - 18.5}
                      text-anchor='middle'
                      fill='var(--ink)'
                      font-size='7.5'
                      class='font-semibold'
                    >
                      {label}
                    </text>
                  </g>
                )
              },
            )}
          </svg>
          <div class='absolute top-2.5 right-2.5 flex flex-col gap-1.5'>
            <Button
              variant='secondary'
              size={32}
              square
              aria-label='Zoomer'
              onClick={() => zoom(1.4)}
            >
              <Plus class='size-4' />
            </Button>
            <Button
              variant='secondary'
              size={32}
              square
              aria-label='Dézoomer'
              onClick={() => zoom(1 / 1.4)}
            >
              <Minus class='size-4' />
            </Button>
            <Button
              variant='secondary'
              size={32}
              square
              aria-label='Recentrer'
              onClick={() => flyTo(framing)}
            >
              <RotateCcw class='size-4' />
            </Button>
          </div>
          <span class='text-[12px] text-ink-muted'>
            Glisse pour faire tourner le globe. Un pays de la liste t’y emmène.
          </span>
        </div>
        <div class='flex flex-col gap-1.5'>
          {ranked.slice(0, allCountries ? undefined : MAX_COUNTRIES).map((
            [code, { count, logins }],
          ) => (
            <div
              key={code}
              class={`flex flex-col gap-1.5 rounded-md border px-3 py-2 ${
                hovered === code
                  ? 'border-indigo bg-indigo-soft'
                  : 'border-transparent'
              }`}
              onMouseEnter={hover(code)}
              onMouseLeave={hover(null)}
            >
              <span class='flex items-baseline justify-between gap-2'>
                <button
                  type='button'
                  class='cursor-pointer text-left text-[14px] font-semibold text-ink hover:underline'
                  aria-label={t`Centrer le globe sur ${
                    translate(countryName(code))
                  }`}
                  onClick={() => focus(code)}
                >
                  {translate(countryName(code))}
                </button>
                <span class='font-mono text-[12px] text-indigo'>
                  {count} {count > 1 ? 'collaborations' : 'collaboration'}
                </span>
              </span>
              <span class='block h-1.5 overflow-hidden rounded-full bg-line'>
                <span
                  class='block h-full rounded-full bg-indigo'
                  style={{ width: `${count / max * 100}%` }}
                />
              </span>
              <span class='flex flex-wrap items-center gap-1.5'>
                {logins.slice(0, MAX_PEOPLE).map((other) =>
                  other in people
                    ? (
                      <A
                        key={other}
                        href={`@${other}`}
                        aria-label={personOf(other).name}
                        class='disc size-6 text-[10px] no-underline hover:no-underline'
                      >
                        {initials(personOf(other).name)}
                      </A>
                    )
                    : (
                      <span key={other} class='disc size-6 text-[10px]'>
                        {initials(personOf(other).name)}
                      </span>
                    )
                )}
                <span class='text-[12px] text-ink-muted'>
                  {logins.slice(0, MAX_PEOPLE)
                    .map((other) => personOf(other).name.split(' ')[0])
                    .join(', ')}
                  {logins.length > MAX_PEOPLE &&
                    ` +${logins.length - MAX_PEOPLE}`}
                </span>
              </span>
            </div>
          ))}
          {ranked.length > MAX_COUNTRIES && (
            <button
              type='button'
              class='cursor-pointer self-start px-3 text-[13px] font-semibold text-indigo hover:underline'
              onClick={() => setAllCountries(!allCountries)}
            >
              {allCountries
                ? translate('Voir moins de pays')
                : t`Voir les ${ranked.length} pays`}
            </button>
          )}
          {!ranked.length && (
            <span class='text-[13px] text-ink-muted'>
              Pas encore de collaboration hors de son pays. Le fil se tend à la
              première.
            </span>
          )}
          {(cross || crossLocked) && (
            <div class='mt-1 flex items-center gap-3 border-t border-line px-3 pt-3'>
              <BadgeMedal
                badge='cross_border'
                level={cross?.level ?? -1}
                progress={cross?.next ? cross.count / cross.next : 0}
                locked={!cross}
                size={34}
              />
              <span class='flex flex-col gap-0.5'>
                <span class='text-[13px] font-semibold'>
                  {translate(cross?.name ?? crossLocked!.name)}
                  {cross && (
                    <span
                      class='font-mono text-[11px] font-medium tracking-[.06em] uppercase'
                      style={{ color: metalText(cross.level) }}
                    >
                      {' · '}
                      {translate(levelName(cross))}
                    </span>
                  )}
                </span>
                <span class='text-[12px] text-ink-muted'>
                  {cross ? cross.nextLabel : crossLocked!.hint}
                </span>
              </span>
            </div>
          )}
        </div>
      </div>
      {toLink.length > 0 && (
        <span class='text-[12px] text-ink-muted'>
          {t`En pointillé : ${
            toLink.map((code) => translate(countryName(code))).join(', ')
          }, où vivent des développeurs Pamoja à relier.`}
        </span>
      )}
      <span class='text-[12px] text-ink-muted'>
        Fil plein : collaboration vérifiée par GitHub. Pointillé : donnée de
        démo.
      </span>
    </section>
  )
}
