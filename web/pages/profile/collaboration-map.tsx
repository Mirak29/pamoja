import { A } from '/web/ui/link.tsx'
import { useEffect, useMemo, useRef, useState } from 'preact/hooks'
import {
  countries,
  type Login,
  people,
  peopleChanged,
  personOf,
} from '/web/fixtures/people.ts'
import {
  badgesOf,
  type Link,
  linksOf,
  lockedBadgesOf,
  reputationChanged,
} from '/web/fixtures/reputation.ts'
import { ArrowLeft, Minus, Plus, RotateCcw } from '/web/assets/icons.tsx'
import { initials } from '/web/ui/avatar.tsx'
import { Button } from '/web/ui/button.tsx'
import { Eyebrow } from '/web/ui/eyebrow.tsx'
import { Input } from '/web/ui/input.tsx'
import { counted, shortCount } from '/web/lib/plural.ts'
import {
  BadgeMedal,
  levelName,
  metalText,
} from '/web/pages/profile/reputation.tsx'
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
const MAX_FACES = 4
// The people of a country come a page at a time, searchable past one page:
// a thousand collaborators never fill the screen
const PAGE = 12

type Linked = {
  count: number
  verified: boolean
  /** The people of the country, the strongest links first */
  people: Link[]
}

/** Collaborations of a profile by country, its own country left out */
export const linkedCountries = (login: Login, links = linksOf(login)) => {
  const home = people[login].countryCode
  const byCountry = new Map<string, Linked>()
  for (const link of links) {
    // A developer without a country is not on the map (§9.3)
    const code = personOf(link.login).countryCode
    if (!code || code === home) continue
    const entry = byCountry.get(code) ??
      { count: 0, verified: false, people: [] }
    entry.count += link.count
    entry.verified ||= link.verified
    entry.people.push(link)
    byCountry.set(code, entry)
  }
  for (const entry of byCountry.values()) {
    entry.people.sort((a, b) => b.count - a.count)
  }
  return [...byCountry].sort(([, a], [, b]) => b.count - a.count)
}

/** The people of a country matching a search, by name or login */
export const peopleMatching = (list: Link[], query: string) => {
  const words = query.trim().toLowerCase()
  if (!words) return list
  return list.filter(({ login }) =>
    personOf(login).name.toLowerCase().includes(words) ||
    login.toLowerCase().includes(words)
  )
}

/*
 * The globe is drawn by hand, without a map library: an orthographic view of
 * a sphere of radius `radius`, centred on (lon, lat), with the land of
 * Natural Earth, meridians and parallels, the countries and the threads
 * (§9.3).
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

// A land turns clockwise around its ground, a lake the other way. Read on
// the longitudes unwrapped across 180°; a ring around a pole (Antarctica)
// does not close once unwrapped and is a land
const turnsClockwise = (ring: number[]) => {
  let area = 0
  let shift = 0
  let previous = ring[0]
  const lons: number[] = []
  for (let i = 0; i < ring.length; i += 2) {
    const step = ring[i] - previous
    if (step > 180) shift -= 360
    else if (step < -180) shift += 360
    previous = ring[i]
    lons.push(ring[i] + shift)
  }
  if (Math.abs(lons.at(-1)! - lons[0]) > 180) return true
  for (let k = 0; k < lons.length; k++) {
    const next = (k + 1) % lons.length
    area += lons[k] * ring[2 * next + 1] - lons[next] * ring[2 * k + 1]
  }
  return area < 0
}

type Ring = { points: Vector[]; clockwise: boolean }

// The land weighs 53 KB: read with the first globe shown, not with every
// page of the app
let landRings: Ring[] = []
let landLoading: Promise<void> | undefined
const loadLand = () =>
  landLoading ??= import('./land.ts').then(({ land }) => {
    landRings = land.map((ring) => {
      const points: Vector[] = []
      for (let i = 0; i < ring.length; i += 2) {
        points.push(vectorOf(ring[i], ring[i + 1]))
      }
      return { points, clockwise: turnsClockwise(ring) }
    })
  })

/*
 * Land as filled shapes, cut at the horizon. A coast that goes behind the
 * globe leaves it at one point of the edge and comes back at another; the
 * shape follows the edge between them, on the side of what the ring holds.
 * The rings of Natural Earth turn clockwise around their land and the other
 * way around a lake: from where a coast leaves, the edge is followed in the
 * turn of its ring to the next place it comes back. Pushing the hidden
 * points onto the edge instead filled the sea once a large continent was
 * mostly behind.
 */

// Where the edge of the globe crosses the segment from a seen point to a
// hidden one, on the circle of the horizon
const horizon = (seen: Vector, behind: Vector): Vector => {
  const t = seen[2] / (seen[2] - behind[2])
  const x = seen[0] + t * (behind[0] - seen[0])
  const y = seen[1] + t * (behind[1] - seen[1])
  const norm = Math.hypot(x, y) || 1
  return [x / norm, y / norm, 0]
}

/** A stretch of coast in front of the globe, from the edge to the edge */
type Stretch = { points: Vector[]; from: number; to: number }

const angleOf = ([x, y]: Vector) => Math.atan2(y, x)

// Clockwise distance along the edge, seen with y up
const clockwise = (from: number, to: number) =>
  ((from - to) % (2 * Math.PI) + 2 * Math.PI) % (2 * Math.PI)
const counterclockwise = (from: number, to: number) => clockwise(to, from)

const landOf = (view: View) => {
  const point = (v: Vector) => {
    const [x, y] = screen(v, view)
    return `${x.toFixed(1)} ${y.toFixed(1)}`
  }
  const r = view.radius.toFixed(1)
  let d = ''
  for (const ring of landRings) {
    const seen = ring.points.map((p) => turn(p, view))
    // The edge is followed on the side of what the ring holds: clockwise
    // around a land, the other way around a lake, which the fill then cuts
    // out of the land around it
    const along = ring.clockwise ? clockwise : counterclockwise
    const start = seen.findIndex((p) => p[2] < 0)
    if (start === -1) {
      // All in front: the coast as it is
      d += `M${seen.map(point).join('L')}Z`
      continue
    }
    // From a hidden point, so each stretch has its two ends on the edge
    const stretches: Stretch[] = []
    let current: Vector[] | null = null
    for (let k = 1; k <= seen.length; k++) {
      const prev = seen[(start + k - 1) % seen.length]
      const next = seen[(start + k) % seen.length]
      if (prev[2] < 0 && next[2] >= 0) current = [horizon(next, prev), next]
      else if (prev[2] >= 0 && next[2] >= 0) current?.push(next)
      else if (prev[2] >= 0 && next[2] < 0 && current) {
        const out = horizon(prev, next)
        current.push(out)
        stretches.push({
          points: current,
          from: angleOf(current[0]),
          to: angleOf(out),
        })
        current = null
      }
    }
    // Each stretch, then the edge clockwise to the next one, until the shape
    // closes on its first stretch
    const left = new Set(stretches)
    for (const first of stretches) {
      if (!left.has(first)) continue
      left.delete(first)
      d += `M${first.points.map(point).join('L')}`
      let stretch = first
      for (;;) {
        const candidates = [...left, first]
        const next = candidates.reduce((best, s) =>
          along(stretch.to, s.from) < along(stretch.to, best.from) ? s : best
        )
        const span = along(stretch.to, next.from)
        // Sweep 1 is clockwise as seen, whichever way y points
        d += `A${r} ${r} 0 ${span > Math.PI ? 1 : 0} ${
          ring.clockwise ? 1 : 0
        } ${point(next.points[0])}`
        if (next === first) break
        left.delete(next)
        d += `L${next.points.map(point).join('L')}`
        stretch = next
      }
      d += 'Z'
    }
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

type Marker = {
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
/**
 * What the globe shows, whatever the angle: computed once per profile, not
 * at each frame of a drag
 */
const mapOf = (login: Login) => {
  const person = people[login]
  const home = person.countryCode
  const ranked = linkedCountries(login)
  const linked = new Map(ranked)
  const max = Math.max(1, ...ranked.map(([, c]) => c.count))
  const toLink = [...new Set(Object.values(people).map((p) => p.countryCode))]
    .filter((code) => code !== home && !linked.has(code) && positions[code])
  const homeAt = positions[home] && vectorOf(...positions[home])
  const nodes: Marker[] = [
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
  const cross = badgesOf(login).find((b) => b.key === 'cross_border')
  const crossLocked = lockedBadgesOf(login).find((b) =>
    b.key === 'cross_border'
  )
  return {
    person,
    ranked,
    max,
    toLink,
    homeAt,
    nodes,
    framing,
    cross,
    crossLocked,
  }
}

export const CollaborationMap = ({ login }: { login: Login }) => {
  // New proofs or people (the API answered) compute it again
  const version = `${reputationChanged.value}:${peopleChanged.value}`
  const {
    person,
    ranked,
    max,
    toLink,
    homeAt,
    nodes,
    framing,
    cross,
    crossLocked,
  } = useMemo(() => mapOf(login), [login, version])

  const [hovered, setHovered] = useState<string | null>(null)
  // The country whose people are listed beside the globe
  const [chosen, setChosen] = useState<string | null>(null)
  const [allCountries, setAllCountries] = useState(false)
  // On a touch screen the globe leaves the finger to the page until it is
  // touched: then it is held, turns under the finger, and the page waits
  const [held, setHeld] = useState(false)
  const box = useRef<HTMLDivElement>(null)
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
  // The fingers on the globe: one turns it, two pinch to zoom
  const fingers = useRef(new Map<number, { x: number; y: number }>())
  const pinch = useRef<{ distance: number; radius: number } | null>(null)
  // A press that has not moved yet: let go there, it is a tap, which picks
  // the country under it or takes the globe in hand
  const press = useRef<
    { id: number; x: number; y: number; moved: boolean } | null
  >(null)
  const spread = () => {
    const [a, b] = [...fingers.current.values()]
    return Math.hypot(a.x - b.x, a.y - b.y) || 1
  }
  const radiusWithin = (radius: number) =>
    Math.min(MAX_RADIUS, Math.max(MIN_RADIUS, radius))
  // A drag starts again from where the fingers are, without a jump
  const grab = (x: number, y: number) =>
    drag.current = { x, y, from: current.current }
  const release = (event: PointerEvent) => {
    fingers.current.delete(event.pointerId)
    pinch.current = null
    const [left] = [...fingers.current.values()]
    drag.current = null
    if (left) grab(left.x, left.y)
  }

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
    setChosen(null)
    setHeld(false)
    flyTo(framing)
    return () => cancelAnimationFrame(motion.current)
  }, [login])

  // A held globe goes back to the page with a touch elsewhere or Escape
  useEffect(() => {
    if (!held) return
    const away = (event: PointerEvent) => {
      if (!box.current?.contains(event.target as Node)) setHeld(false)
    }
    const escape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setHeld(false)
    }
    document.addEventListener('pointerdown', away)
    document.addEventListener('keydown', escape)
    return () => {
      document.removeEventListener('pointerdown', away)
      document.removeEventListener('keydown', escape)
    }
  }, [held])

  // The sea and the threads show at once, the land as soon as it is read
  const [, setLandShown] = useState(landRings.length > 0)
  useEffect(() => {
    if (!landRings.length) loadLand().then(() => setLandShown(true))
  }, [])

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
  // From the list, the globe also flies to the country
  const pick = (code: string) => {
    setChosen(code)
    if (positions[code]) focus(code)
  }

  const seen = nodes
    .map((node) => ({ ...node, seen: turn(node.at, view) }))
    .filter((node) => node.seen[2] > 0)
    .sort((a, b) => a.seen[2] - b.seen[2])
  // The linked country nearest a tap, within a fingertip: the markers of
  // neighbours overlap once the globe is small
  const countryAt = (event: PointerEvent) => {
    const rect = (event.currentTarget as SVGSVGElement).getBoundingClientRect()
    const x = (event.clientX - rect.left) * W / rect.width
    const y = (event.clientY - rect.top) * H / rect.height
    let best: { code: string; distance: number } | undefined
    for (const node of seen) {
      if (node.kind !== 'linked') continue
      const [nx, ny] = screen(node.seen, view)
      const distance = Math.hypot(nx - x, ny - y)
      if (distance < 18 && (!best || distance < best.distance)) {
        best = { code: node.code, distance }
      }
    }
    return best?.code
  }
  const lit = hovered ?? chosen
  const dim = (code: string) => lit !== null && lit !== code
  const hover = (code: string | null) => () => setHovered(code)
  const [cx, cy] = [W / 2, H / 2]
  const country = chosen ? ranked.find(([code]) => code === chosen) : undefined

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
      <div class='grid items-start gap-5 md:grid-cols-[minmax(0,1.15fr)_minmax(0,1fr)]'>
        <div class='relative flex flex-col gap-2'>
          {
            /* Held, the frame of the globe is outlined: inside it the finger
            turns the globe, outside it scrolls the page */
          }
          <div
            ref={box}
            class={`relative mx-auto w-full max-w-[440px] rounded-xl outline-2 outline-offset-2 transition-[outline-color] ${
              held ? 'outline-indigo' : 'outline-transparent'
            }`}
          >
            <svg
              viewBox={`0 0 ${W} ${H}`}
              width='100%'
              class={`block cursor-grab select-none active:cursor-grabbing ${
                held ? 'touch-none' : ''
              }`}
              role='img'
              tabIndex={0}
              aria-label='Globe des collaborations. Flèches pour le tourner, plus et moins pour zoomer.'
              onPointerDown={(event) => {
                // A second finger makes a pinch, never a tap
                press.current = fingers.current.size ? null : {
                  id: event.pointerId,
                  x: event.clientX,
                  y: event.clientY,
                  moved: false,
                }
                // Not held, a finger belongs to the page: it scrolls, or taps
                if (event.pointerType === 'touch' && !held) return
                cancelAnimationFrame(motion.current)
                fingers.current.set(event.pointerId, {
                  x: event.clientX,
                  y: event.clientY,
                })
                if (fingers.current.size === 2) {
                  drag.current = null
                  pinch.current = {
                    distance: spread(),
                    radius: current.current.radius,
                  }
                } else grab(event.clientX, event.clientY)
                try {
                  event.currentTarget.setPointerCapture(event.pointerId)
                } catch {
                  // A pointer already gone: nothing to follow
                }
              }}
              onPointerMove={(event) => {
                const tap = press.current
                if (
                  tap?.id === event.pointerId &&
                  Math.hypot(event.clientX - tap.x, event.clientY - tap.y) > 6
                ) tap.moved = true
                if (!fingers.current.has(event.pointerId)) return
                fingers.current.set(event.pointerId, {
                  x: event.clientX,
                  y: event.clientY,
                })
                if (pinch.current && fingers.current.size >= 2) {
                  const { distance, radius } = pinch.current
                  return setView({
                    ...current.current,
                    radius: radiusWithin(radius * spread() / distance),
                  })
                }
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
              onPointerUp={(event) => {
                const tap = press.current
                press.current = null
                if (tap?.id === event.pointerId && !tap.moved) {
                  const code = countryAt(event)
                  if (code) setChosen(code === chosen ? null : code)
                  else if (event.pointerType === 'touch') setHeld(true)
                }
                release(event)
              }}
              // The page took the finger to scroll: no tap, nothing to follow
              onPointerCancel={(event) => {
                press.current = null
                release(event)
              }}
              // The wheel alone scrolls the page; with Ctrl or Cmd, which is
              // also what a pinch on a trackpad sends, it zooms the globe
              onWheel={(event) => {
                if (!event.ctrlKey && !event.metaKey) return
                event.preventDefault()
                cancelAnimationFrame(motion.current)
                const step = Math.max(-60, Math.min(60, event.deltaY))
                setView({
                  ...current.current,
                  radius: radiusWithin(
                    current.current.radius * Math.exp(-step / 200),
                  ),
                })
              }}
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
                  const width = (lit === code ? 1.2 : 0) + 1.2 +
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
                // Markers grow with the zoom: dots on the whole globe,
                // labelled discs once the countries stand apart
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
                const on = lit === code
                // The number of people, in a pill as wide as the number
                const count = shortCount(linked!.people.length)
                const pill = Math.max(11, count.length * 3.8 + 5)
                // A country is a disc, like the schools on the 01 globe, with
                // its people in an indigo pill
                return (
                  <g
                    key={code}
                    class='cursor-pointer'
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
                      fill={on ? 'var(--indigo-soft)' : 'var(--surface-100)'}
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
                        <rect
                          x={x + 8 - pill / 2}
                          y={y - 13.5}
                          width={pill}
                          height='11'
                          rx='5.5'
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
                          {count}
                        </text>
                      </>
                    )}
                  </g>
                )
              })}
              {
                /* The country looked at is named in a pill, whatever the
                zoom */
              }
              {seen.filter((node) => node.code === lit).map(
                ({ code, seen: at, linked }) => {
                  const [x, y] = screen(at, view)
                  const label = `${translate(countryName(code))} · ${
                    counted(linked?.people.length ?? 0, 'personne')
                  }`
                  const width = label.length * 4.4 + 12
                  return (
                    <g key={code} pointer-events='none'>
                      <rect
                        x={x - width / 2}
                        y={y - 30}
                        width={width}
                        height='14'
                        rx='4'
                        fill='var(--surface-100)'
                        stroke='var(--figure-edge)'
                      />
                      <text
                        x={x}
                        y={y - 20.5}
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
            {held && (
              <div class='absolute top-2.5 left-2.5'>
                <Button size={32} onClick={() => setHeld(false)}>
                  Terminé
                </Button>
              </div>
            )}
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
          </div>
          <span class='text-[12px] text-ink-muted pointer-coarse:hidden'>
            Glisse pour faire tourner le globe, pince ou Ctrl + molette pour
            zoomer. Un pays montre ses personnes.
          </span>
          <span class='hidden text-[12px] text-ink-muted pointer-coarse:inline'>
            {held
              ? translate(
                'Un doigt fait tourner le globe, deux doigts zooment. « Terminé » rend la main à la page.',
              )
              : translate(
                'Touche le globe pour le prendre en main, ou un pays pour voir ses personnes.',
              )}
          </span>
        </div>
        <div class='flex flex-col gap-1.5'>
          {country
            ? (
              <CountryPeople
                key={country[0]}
                code={country[0]}
                linked={country[1]}
                onBack={() => setChosen(null)}
              />
            )
            : (
              <>
                {ranked.slice(0, allCountries ? undefined : MAX_COUNTRIES)
                  .map(([code, linked]) => (
                    <CountryRow
                      key={code}
                      code={code}
                      linked={linked}
                      max={max}
                      on={hovered === code}
                      onHover={hover}
                      onPick={() => pick(code)}
                    />
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
                    Pas encore de collaboration hors de son pays. Le fil se tend
                    à la première.
                  </span>
                )}
              </>
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

/** A face that opens the profile, when the developer has one */
const Face = ({ login }: { login: Login }) => {
  const name = personOf(login).name
  const shape = 'disc size-6 text-[10px]'
  return login in people
    ? (
      <A
        href={`@${login}`}
        aria-label={name}
        class={`${shape} no-underline hover:no-underline`}
      >
        {initials(name)}
      </A>
    )
    : <span class={shape} aria-hidden='true'>{initials(name)}</span>
}

/** A country of the list: its share of the work, and a few of its faces */
const CountryRow = (
  { code, linked, max, on, onHover, onPick }: {
    code: string
    linked: Linked
    max: number
    on: boolean
    onHover: (code: string | null) => () => void
    onPick: () => void
  },
) => {
  const name = translate(countryName(code))
  const faces = linked.people.slice(0, MAX_FACES)
  const left = linked.people.length - faces.length
  return (
    <div
      class={`flex flex-col gap-1.5 rounded-md border px-3 py-2 ${
        on ? 'border-indigo bg-indigo-soft' : 'border-transparent'
      }`}
      onMouseEnter={onHover(code)}
      onMouseLeave={onHover(null)}
    >
      <span class='flex flex-wrap items-baseline justify-between gap-x-2'>
        <button
          type='button'
          class='cursor-pointer text-left text-[14px] font-semibold text-ink hover:underline'
          aria-label={t`Voir les personnes de ${name}`}
          onClick={onPick}
        >
          {name}
        </button>
        <span class='font-mono text-[12px] whitespace-nowrap text-indigo'>
          {counted(linked.people.length, 'personne')} ·{' '}
          {counted(linked.count, 'collaboration')}
        </span>
      </span>
      <span class='block h-1.5 overflow-hidden rounded-full bg-line'>
        <span
          class='block h-full rounded-full bg-indigo'
          style={{ width: `${linked.count / max * 100}%` }}
        />
      </span>
      <span class='flex flex-wrap items-center gap-1.5'>
        {faces.map(({ login }) => <Face key={login} login={login} />)}
        <span class='text-[12px] text-ink-muted'>
          {faces.map(({ login }) => personOf(login).name.split(' ')[0])
            .join(', ')}
        </span>
        {left > 0 && (
          <button
            type='button'
            class='cursor-pointer text-[12px] font-semibold text-indigo hover:underline'
            onClick={onPick}
          >
            {t`+${left} · voir qui`}
          </button>
        )}
      </span>
    </div>
  )
}

/**
 * Who, in a country: its people, the strongest links first, a page at a
 * time, with a search once they pass a page
 */
const CountryPeople = (
  { code, linked, onBack }: {
    code: string
    linked: Linked
    onBack: () => void
  },
) => {
  const [query, setQuery] = useState('')
  const [shown, setShown] = useState(PAGE)
  const name = translate(countryName(code))
  const found = peopleMatching(linked.people, query)
  const left = found.length - shown
  return (
    <div class='flex flex-col gap-2.5 px-3' aria-live='polite'>
      <button
        type='button'
        class='inline-flex cursor-pointer items-center gap-1.5 self-start text-[13px] font-semibold text-indigo hover:underline'
        onClick={onBack}
      >
        <ArrowLeft class='size-3.5' />
        Tous les pays
      </button>
      <span class='flex flex-wrap items-baseline justify-between gap-x-3 gap-y-1'>
        <h3 class='font-display text-[17px] font-semibold'>{name}</h3>
        <span class='font-mono text-[12px] text-indigo'>
          {counted(linked.people.length, 'personne')} ·{' '}
          {counted(linked.count, 'collaboration')}
        </span>
      </span>
      {linked.people.length > PAGE && (
        <Input
          type='search'
          compact
          placeholder='Chercher une personne'
          aria-label={t`Chercher parmi les personnes de ${name}`}
          value={query}
          onInput={(event) => {
            setQuery(event.currentTarget.value)
            setShown(PAGE)
          }}
        />
      )}
      <ul class='flex flex-col'>
        {found.slice(0, shown).map(({ login, count }) => (
          <li
            key={login}
            class='flex items-center gap-2.5 border-t border-line py-2'
          >
            <span class='disc size-8 shrink-0 text-[11px]' aria-hidden='true'>
              {initials(personOf(login).name)}
            </span>
            <span class='flex min-w-0 flex-1 flex-col'>
              {login in people
                ? (
                  <A
                    href={`@${login}`}
                    class='truncate text-[14px] font-semibold text-ink'
                  >
                    {personOf(login).name}
                  </A>
                )
                : (
                  <span class='truncate text-[14px] font-semibold'>
                    {personOf(login).name}
                  </span>
                )}
              <span class='truncate font-mono text-[11px] text-ink-muted'>
                @{login}
              </span>
            </span>
            <span class='shrink-0 font-mono text-[12px] text-indigo'>
              {counted(count, 'lien')}
            </span>
          </li>
        ))}
      </ul>
      {left > 0 && (
        <button
          type='button'
          class='cursor-pointer self-start text-[13px] font-semibold text-indigo hover:underline'
          onClick={() => setShown(shown + PAGE)}
        >
          {t`Voir ${Math.min(PAGE, left)} de plus`}
          <span class='font-normal text-ink-muted'>
            {' · '}
            {t`${left} restantes`}
          </span>
        </button>
      )}
      {!found.length && (
        <span class='text-[13px] text-ink-muted'>
          Personne de ce nom dans ce pays.
        </span>
      )}
    </div>
  )
}
