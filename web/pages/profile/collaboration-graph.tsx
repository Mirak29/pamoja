import { A, url } from '@01edu/signal-router'
import { useState } from 'preact/hooks'
import { daysAgo } from '/web/fixtures/clock.ts'
import { communities } from '/web/fixtures/communities.ts'
import { type Login, people, personOf } from '/web/fixtures/people.ts'
import { projects } from '/web/fixtures/projects.ts'
import {
  type Dimension,
  projectNameOf,
  proofs,
} from '/web/fixtures/reputation.ts'
import { initials } from '/web/ui/avatar.tsx'
import { Button, OptionButton } from '/web/ui/button.tsx'
import { Drawer } from '/web/ui/dialog.tsx'
import { Eyebrow } from '/web/ui/eyebrow.tsx'
import { Input, Select } from '/web/ui/input.tsx'
import { Cube, prism } from '/web/ui/shapes.tsx'
import { counted, plural } from '/web/lib/plural.ts'
import { t, translate } from '/web/lib/language.ts'

/*
 * The working network of a profile: the places where proofs were given or
 * received (projects and communities), and the people met there. Working
 * links only, never follows (§9.3).
 */

// What a place counts, given and received together. Creating a project is
// not counted: the filled cube says it
const units: Partial<Record<Dimension, [string, string]>> = {
  review: ['review', 'reviews'],
  help: ['aide', 'aides'],
  oss: ['PR', 'PRs'],
  mentor: ['mentorat', 'mentorats'],
}

type Place = {
  key: string
  kind: 'project' | 'community'
  name: string
  owned: boolean
  counts: Partial<Record<Dimension, number>>
  verified: boolean
  total: number
  people: number
}

type Mate = {
  login: string
  /** The places shared with the profile, the most shared first */
  places: string[]
  /** Links by kind of work */
  kinds: Partial<Record<Dimension, number>>
  count: number
  verified: boolean
}

export type NetworkFilter = { only: Dimension | null; days: number | null }

/** Every place and person of the network, the strongest links first */
export const networkOf = (login: Login, { only, days }: NetworkFilter) => {
  const since = days ? daysAgo(days) : 0
  const places = new Map<string, Place>()
  const mates = new Map<
    string,
    Mate & { shared: Map<string, number> }
  >()
  const met = new Map<string, Set<string>>()
  for (const p of proofs) {
    if (only && p.dimension !== only) continue
    if (p.at < since) continue
    const given = p.who === login
    if (!given && p.by !== login) continue
    const key = p.project
      ? `project:${p.project}`
      : p.community
      ? `community:${p.community}`
      : undefined
    if (!key) continue
    const place = places.get(key) ?? {
      key,
      kind: p.project ? 'project' : 'community',
      name: p.project
        ? projectNameOf(p)
        : communities.find((c) => c.slug === p.community)?.name ??
          p.community!,
      owned: !!p.project && projects[p.project]?.owner === login,
      counts: {},
      verified: false,
      total: 0,
      people: 0,
    }
    place.counts[p.dimension] = (place.counts[p.dimension] ?? 0) + 1
    place.verified ||= p.verified
    place.total++
    places.set(key, place)
    const other = given ? p.by : p.who
    if (!other || other === login) continue
    const mate = mates.get(other) ?? {
      login: other,
      places: [],
      shared: new Map<string, number>(),
      kinds: {},
      count: 0,
      verified: false,
    }
    mate.count++
    mate.kinds[p.dimension] = (mate.kinds[p.dimension] ?? 0) + 1
    mate.verified ||= p.verified
    mate.shared.set(key, (mate.shared.get(key) ?? 0) + 1)
    mates.set(other, mate)
    met.set(key, (met.get(key) ?? new Set()).add(other))
  }
  for (const [key, people] of met) places.get(key)!.people = people.size
  return {
    places: [...places.values()].sort((a, b) => b.total - a.total),
    mates: [...mates.values()]
      .map(({ shared, ...mate }) => ({
        ...mate,
        places: [...shared].sort(([, a], [, b]) => b - a).map(([key]) => key),
      }))
      .sort((a, b) => b.count - a.count),
  }
}

const summary = (place: Place) =>
  place.kind === 'community'
    ? counted(place.total, 'réponse acceptée', 'réponses acceptées')
    : (Object.entries(place.counts) as [Dimension, number][])
      .filter(([dimension]) => units[dimension])
      .sort(([, a], [, b]) => b - a)
      .map(([dimension, n]) => counted(n, ...units[dimension]!))
      .join(' · ') || translate('Son projet')

// Only a developer of the pages has a profile to open
const known = (login: string) => login in people

const kinds: [Dimension | null, string][] = [
  [null, 'Tout'],
  ['review', 'Reviews'],
  ['help', 'Aides'],
  ['oss', 'PRs'],
  ['mentor', 'Mentorat'],
]

const periods: [number | null, string][] = [
  [null, 'Depuis le début'],
  [365, '12 derniers mois'],
  [90, '90 derniers jours'],
]

/** The filters of the network: kind of link and period */
const Filters = (
  { filter, setFilter }: {
    filter: NetworkFilter
    setFilter: (filter: NetworkFilter) => void
  },
) => (
  <div class='flex flex-wrap items-center gap-1.5'>
    {kinds.map(([key, label]) => (
      <OptionButton
        key={label}
        pressed={filter.only === key}
        onClick={() => setFilter({ ...filter, only: key })}
      >
        {translate(label)}
      </OptionButton>
    ))}
    <div class='w-[180px]'>
      <Select
        compact
        aria-label='Période'
        value={String(filter.days ?? '')}
        onChange={(event) => {
          const value = event.currentTarget.value
          setFilter({ ...filter, days: value ? Number(value) : null })
        }}
      >
        {periods.map(([days, label]) => (
          <option key={label} value={String(days ?? '')}>{label}</option>
        ))}
      </Select>
    </div>
  </div>
)

// The kinds of link, each a shade of indigo in the bars
const shades: [Dimension, string, string][] = [
  ['review', 'reviews', 'bg-indigo'],
  ['help', 'aides', 'bg-indigo/65'],
  ['oss', 'PRs', 'bg-indigo/40'],
  ['mentor', 'mentorat', 'bg-indigo/20'],
]

// On a phone, the strongest links as a ranking: the rest is in the panel
const SHOWN = 8

/**
 * One collaborator: who, from where, on which places, and the work done
 * together as a bar, its length the number of links, its segments their
 * kinds.
 */
const CollaboratorRow = (
  { mate, max, placeName }: {
    mate: Mate
    max: number
    placeName: (key: string) => string
  },
) => {
  const person = personOf(mate.login)
  const name = <span class='text-[14px] font-semibold'>{person.name}</span>
  return (
    <div class='grid grid-cols-[auto_minmax(0,1fr)_auto] items-center gap-x-3 gap-y-1.5 border-t border-line py-2.5 sm:grid-cols-[auto_minmax(0,14rem)_minmax(0,1fr)_auto]'>
      <span class='disc size-8 text-[11px]'>{initials(person.name)}</span>
      <span class='flex min-w-0 flex-col gap-0.5'>
        {known(mate.login)
          ? <A href={`@${mate.login}`} class='truncate text-ink'>{name}</A>
          : <span class='truncate'>{name}</span>}
        <span class='truncate text-[12px] text-ink-muted'>
          {[person.country, mate.places.slice(0, 2).map(placeName).join(', ')]
            .filter(Boolean).join(' · ')}
        </span>
      </span>
      <span
        role='img'
        aria-label={shades
          .filter(([kind]) => mate.kinds[kind])
          .map(([kind, label]) => `${mate.kinds[kind]} ${translate(label)}`)
          .join(', ')}
        class='col-span-3 col-start-1 row-start-2 flex h-3 overflow-hidden rounded-[3px] sm:col-span-1 sm:col-start-3 sm:row-start-1'
      >
        {shades.map(([kind, , color]) =>
          mate.kinds[kind]
            ? (
              <span
                key={kind}
                class={`h-full ${color}`}
                style={{ width: `${mate.kinds[kind]! / max * 100}%` }}
              />
            )
            : null
        )}
      </span>
      <span class='font-mono text-[13px] text-indigo tabular-nums'>
        {mate.count}
      </span>
    </div>
  )
}

/** What each shade of the bars means */
const Legend = () => (
  <span class='flex flex-wrap items-center gap-x-3 gap-y-1 text-[12px] text-ink-muted'>
    {shades.map(([kind, label, color]) => (
      <span key={kind} class='inline-flex items-center gap-1.5'>
        <span class={`size-2.5 rounded-[2px] ${color}`} />
        {translate(label)}
      </span>
    ))}
  </span>
)

/*
 * Geometry of the star: the developer in the centre, their main places on
 * an inner ring, the people on an outer ring, each in the part of the circle
 * of the place they share most.
 */
const W = 680
const H = 470
const CX = W / 2
const CY = H / 2
const INNER = [150, 96]
const OUTER = [228, 186]
const PLACES = 5
const STAR = 14
const OTHERS = 'others'

type Hub = {
  key: string
  name: string
  kind?: Place['kind']
  owned: boolean
  total: number
  summary: string
  people: string[]
  x: number
  y: number
}
type Point = Mate & {
  hub: string
  x: number
  y: number
  r: number
  cos: number
  sin: number
}

const at = ([rx, ry]: number[], angle: number) => ({
  x: CX + rx * Math.cos(angle),
  y: CY + ry * Math.sin(angle),
  cos: Math.cos(angle),
  sin: Math.sin(angle),
})

const starOf = (mates: Mate[], places: Place[]) => {
  const main = places.slice(0, PLACES)
  const rest = places.slice(PLACES)
  const shown = mates.slice(0, STAR)
  const hubOf = (mate: Mate) =>
    main.find((place) => place.key === mate.places[0])?.key ?? OTHERS
  const keys = [
    ...main.map((place) => place.key),
    ...(rest.length || shown.some((m) => hubOf(m) === OTHERS) ? [OTHERS] : []),
  ]
  // Each place gets a share of the circle by its people, plus room for its
  // name: a place without people shown still stands apart
  const weights = keys.map((key) =>
    shown.filter((mate) => hubOf(mate) === key).length + 2
  )
  const total = weights.reduce((a, b) => a + b, 0)
  const max = Math.max(1, ...shown.map((mate) => mate.count))
  const hubs: Hub[] = []
  const points: Point[] = []
  let start = -Math.PI / 2 - Math.PI * weights[0] / total
  keys.forEach((key, i) => {
    const span = 2 * Math.PI * weights[i] / total
    const place = main.find((p) => p.key === key)
    const members = shown.filter((mate) => hubOf(mate) === key)
    hubs.push({
      key,
      name: place?.name ??
        `+${rest.length} ${plural(rest.length, 'autre lieu', 'autres lieux')}`,
      kind: place?.kind,
      owned: !!place?.owned,
      total: place?.total ?? rest.reduce((sum, p) => sum + p.total, 0),
      summary: place ? summary(place) : '',
      people: members.map((mate) => mate.login),
      ...at(INNER, start + span / 2),
    })
    members.forEach((mate, j) => {
      points.push({
        ...mate,
        hub: key,
        r: 12 + 8 * Math.sqrt(mate.count / max),
        ...at(OUTER, start + span * (j + 0.5) / members.length),
      })
    })
    start += span
  })
  return { hubs, points }
}

/** What was done together, in words: « 12 reviews · 5 aides » */
const kindsLine = (mate: Mate) =>
  shades
    .filter(([kind]) => mate.kinds[kind] && units[kind])
    .map(([kind]) => counted(mate.kinds[kind]!, ...units[kind]!))
    .join(' · ')

// The page of a place: a project, or a community
const hrefOf = (key: string) => {
  const [kind, slug] = key.split(':')
  if (kind === 'project') return slug in projects ? `projet/${slug}` : undefined
  if (kind === 'community') return `communaute/${slug}`
}

/** Hover or focus to look, click or Enter to keep the selection */
const pick = (
  key: string,
  select: (key: string | null) => void,
  selected: string | null,
  setHovered: (key: string | null) => void,
) => ({
  tabIndex: 0,
  role: 'button' as const,
  'aria-pressed': selected === key,
  class: 'cursor-pointer outline-none',
  onMouseEnter: () => setHovered(key),
  onMouseLeave: () => setHovered(null),
  onFocus: () => setHovered(key),
  onBlur: () => setHovered(null),
  onClick: () => select(selected === key ? null : key),
  onKeyDown: (event: KeyboardEvent) => {
    if (event.key !== 'Enter' && event.key !== ' ') return
    event.preventDefault()
    select(selected === key ? null : key)
  },
})

/**
 * Collaboration Graph as a star, the projects first: the developer in the
 * centre, their main projects and communities around, then the people met
 * in each, named with their number of links (§9.3). Thicker threads for
 * more work. A place or a person shows its detail beside the graph, on
 * hover or kept by a click. The whole network is in the « Réseau de
 * travail » panel. Working links only, never follows. On a phone, where
 * names would be too small, the people as a ranking.
 */
export const CollaborationGraph = ({ login }: { login: Login }) => {
  const [filter, setFilter] = useState<NetworkFilter>({
    only: null,
    days: null,
  })
  const [hovered, setHovered] = useState<string | null>(null)
  const [selected, select] = useState<string | null>(null)
  const network = networkOf(login, filter)
  const { hubs, points } = starOf(network.mates, network.places)
  const left = network.mates.length - points.length
  const max = Math.max(1, ...network.mates.map((mate) => mate.count))
  const hubMax = Math.max(
    1,
    ...hubs.filter((hub) => hub.key !== OTHERS).map((hub) => hub.total),
  )
  const placeName = (key: string) =>
    network.places.find((place) => place.key === key)?.name ?? ''
  // What the graph shows in detail: the hovered node, or else the kept one
  const active = hovered ?? selected
  const person = points.find((point) => `u:${point.login}` === active)
  const place = hubs.find((hub) => `p:${hub.key}` === active)
  const lit = (hub: string, login?: string) =>
    !active || active === `p:${hub}` ||
    (!!login && active === `u:${login}`) ||
    (!login && person?.hub === hub)
  const props = (key: string) => pick(key, select, selected, setHovered)
  return (
    <section
      id='profil-collaborations'
      class='slab flex flex-col gap-3 p-[22px]'
    >
      <div class='flex flex-wrap items-center justify-between gap-3'>
        <Eyebrow>Collaboration Graph</Eyebrow>
        <Filters filter={filter} setFilter={setFilter} />
      </div>
      {points.length
        ? (
          <>
            <div class='hidden gap-5 sm:grid lg:grid-cols-[minmax(0,1fr)_16rem]'>
              <svg
                viewBox={`0 0 ${W} ${H}`}
                width='100%'
                class='block'
                role='group'
                aria-label='Graphe des collaborations'
              >
                {hubs.map((hub) => (
                  <line
                    key={hub.key}
                    x1={CX}
                    y1={CY}
                    x2={hub.x}
                    y2={hub.y}
                    stroke='var(--indigo)'
                    stroke-width={hub.key === OTHERS
                      ? 2
                      : 2 + 6 * hub.total / hubMax}
                    stroke-dasharray={hub.key === OTHERS ? '5 4' : undefined}
                    stroke-linecap='round'
                    class='transition-opacity duration-200'
                    style={{ opacity: lit(hub.key) ? 0.85 : 0.12 }}
                  />
                ))}
                {points.map((point) => {
                  const hub = hubs.find((h) => h.key === point.hub)!
                  return (
                    <line
                      key={point.login}
                      x1={hub.x}
                      y1={hub.y}
                      x2={point.x}
                      y2={point.y}
                      stroke='var(--indigo)'
                      stroke-width={1 + 3 * point.count / max}
                      stroke-dasharray={point.verified ? undefined : '4 4'}
                      stroke-linecap='round'
                      class='transition-opacity duration-200'
                      style={{
                        opacity: lit(point.hub, point.login) ? 0.6 : 0.1,
                      }}
                    />
                  )
                })}
                <circle
                  cx={CX + 2.6}
                  cy={CY + 1.5}
                  r='32'
                  fill='var(--figure-edge)'
                />
                <circle
                  cx={CX}
                  cy={CY}
                  r='32'
                  fill='var(--indigo)'
                  stroke='var(--indigo-edge)'
                />
                <text
                  x={CX}
                  y={CY + 7}
                  text-anchor='middle'
                  fill='var(--on-indigo)'
                  font-size='18'
                  class='font-display font-bold'
                >
                  {initials(people[login].name)}
                </text>
                {hubs.map((hub, i) => (
                  <HubNode
                    key={hub.key}
                    hub={hub}
                    above={i % 2 === 1}
                    dimmed={!lit(hub.key)}
                    on={active === `p:${hub.key}`}
                    props={props(`p:${hub.key}`)}
                  />
                ))}
                {points.map((point) => (
                  <StarNode
                    key={point.login}
                    point={point}
                    dimmed={!lit(point.hub, point.login)}
                    on={active === `u:${point.login}`}
                    props={props(`u:${point.login}`)}
                  />
                ))}
              </svg>
              <Detail
                login={login}
                network={network}
                person={person}
                place={place}
                placeName={placeName}
                kept={!!selected && selected === active}
                onPick={(key) => select(key)}
              />
            </div>
            <div class='flex flex-col sm:hidden'>
              <Legend />
              {network.mates.slice(0, SHOWN).map((mate) => (
                <CollaboratorRow
                  key={mate.login}
                  mate={mate}
                  max={max}
                  placeName={placeName}
                />
              ))}
            </div>
            <div class='flex flex-wrap items-center justify-between gap-3'>
              <Key />
              <Button
                variant='secondary'
                size={34}
                params={{ dialog: 'reseau' }}
              >
                {left
                  ? t`Voir tout le réseau (+${left})`
                  : translate('Voir tout le réseau')}
              </Button>
            </div>
          </>
        )
        : (
          <span class='text-[13px] text-ink-muted'>
            Aucun lien de travail pour ces filtres.
          </span>
        )}
    </section>
  )
}

type NodeProps = ReturnType<typeof pick>

/** A place on the inner ring: a cube for a project, a tile for a community */
const HubNode = (
  { hub, above, dimmed, on, props }: {
    hub: Hub
    /** Every other name goes above its shape, so neighbours do not collide */
    above: boolean
    dimmed: boolean
    on: boolean
    props: NodeProps
  },
) => {
  const shape = hub.kind === 'community'
    ? prism(hub.x, hub.y + 6, 17, 10, 5)
    : prism(hub.x, hub.y + 10, 15, 8.7, 17)
  const ghost = hub.key === OTHERS
  const y = above ? hub.y - 36 : hub.y + 34
  return (
    <g
      {...props}
      aria-label={hub.name}
      class={`${props.class} transition-opacity duration-200`}
      style={{ opacity: dimmed ? 0.3 : 1 }}
    >
      <g
        stroke={on
          ? 'var(--indigo)'
          : ghost
          ? 'var(--line-control)'
          : 'var(--ink)'}
        stroke-width={on ? 1.6 : 1}
        stroke-linejoin='round'
        stroke-dasharray={ghost ? '3 2.5' : undefined}
      >
        <polygon points={shape.left} fill='var(--surface-100)' />
        <polygon
          points={shape.right}
          fill={ghost ? 'var(--surface-100)' : 'var(--side)'}
        />
        <polygon
          points={shape.top}
          fill={ghost
            ? 'var(--surface-100)'
            : hub.owned || on
            ? 'var(--indigo)'
            : 'var(--indigo-soft)'}
        />
      </g>
      <text
        x={hub.x}
        y={y}
        text-anchor='middle'
        paint-order='stroke'
        stroke='var(--surface-100)'
        stroke-width='4'
        stroke-linejoin='round'
      >
        <tspan
          fill={ghost ? 'var(--indigo)' : 'var(--ink)'}
          font-size='13'
          class='font-semibold'
        >
          {hub.kind === 'community' ? `# ${hub.name}` : hub.name}
        </tspan>
        {hub.summary && (
          <tspan x={hub.x} dy='14' fill='var(--ink-muted)' font-size='10.5'>
            {hub.summary.split(' · ').slice(0, 2).join(' · ')}
          </tspan>
        )}
      </text>
    </g>
  )
}

/** A collaborator on the outer ring: a disc, its first name and links */
const StarNode = (
  { point, dimmed, on, props }: {
    point: Point
    dimmed: boolean
    on: boolean
    props: NodeProps
  },
) => {
  const person = personOf(point.login)
  // The name goes outwards: beside on the sides, above or below at the ends
  const side = Math.abs(point.cos) > 0.35
  const anchor = !side ? 'middle' : point.cos > 0 ? 'start' : 'end'
  const lx = side ? point.x + Math.sign(point.cos) * (point.r + 7) : point.x
  const ly = side
    ? point.y + 4
    : point.sin < 0
    ? point.y - point.r - 8
    : point.y + point.r + 16
  return (
    <g
      {...props}
      aria-label={person.name}
      class={`${props.class} transition-opacity duration-200`}
      style={{ opacity: dimmed ? 0.3 : 1 }}
    >
      <circle
        cx={point.x + 1.7}
        cy={point.y + 1}
        r={point.r}
        fill='var(--figure-edge)'
      />
      <circle
        cx={point.x}
        cy={point.y}
        r={point.r}
        fill={on ? 'var(--indigo-soft)' : 'var(--surface-200)'}
        stroke={on ? 'var(--indigo)' : 'var(--figure-edge)'}
        stroke-width={on ? 2 : 1}
      />
      <text
        x={point.x}
        y={point.y + point.r * 0.3}
        text-anchor='middle'
        fill='var(--ink)'
        font-size={point.r * 0.72}
        class='font-display font-semibold'
      >
        {initials(person.name)}
      </text>
      <text
        x={lx}
        y={ly}
        text-anchor={anchor}
        paint-order='stroke'
        stroke='var(--surface-100)'
        stroke-width='3'
      >
        <tspan fill='var(--ink)' font-size='12' class='font-semibold'>
          {person.name.split(' ')[0]}
        </tspan>
        <tspan fill='var(--indigo)' font-size='11' class='font-mono' dx='4'>
          {point.count}
        </tspan>
      </text>
    </g>
  )
}

/**
 * Beside the graph, the detail of what is looked at: a place and its people,
 * a person and the work done together, or else the network in a few lines.
 */
const Detail = (
  { login, network, person, place, placeName, kept, onPick }: {
    login: Login
    network: ReturnType<typeof networkOf>
    person?: Point
    place?: Hub
    placeName: (key: string) => string
    kept: boolean
    onPick: (key: string | null) => void
  },
) => {
  const box = 'well flex flex-col gap-3 self-start p-4'
  const close = kept && (
    <button
      type='button'
      class='cursor-pointer self-start text-[12px] font-semibold text-indigo hover:underline'
      onClick={() => onPick(null)}
    >
      Retour au réseau
    </button>
  )
  if (person) {
    const who = personOf(person.login)
    return (
      <aside class={box} aria-live='polite'>
        <span class='flex items-center gap-3'>
          <span class='disc size-10 text-[13px]'>{initials(who.name)}</span>
          <span class='flex min-w-0 flex-col'>
            <span class='truncate text-[15px] font-semibold'>{who.name}</span>
            <span class='text-[12px] text-ink-muted'>{who.country}</span>
          </span>
        </span>
        <span class='text-[13px]'>
          {counted(person.count, 'lien de travail', 'liens de travail')}
          {person.verified ? ` · ${translate('vérifié')}` : ''}
        </span>
        <span class='flex h-2.5 overflow-hidden rounded-[3px]'>
          {shades.map(([kind, , color]) =>
            person.kinds[kind]
              ? (
                <span
                  key={kind}
                  class={`h-full ${color}`}
                  style={{
                    width: `${person.kinds[kind]! / person.count * 100}%`,
                  }}
                />
              )
              : null
          )}
        </span>
        <span class='text-[12px] text-ink-muted'>{kindsLine(person)}</span>
        <span class='text-[12px] text-ink-muted'>
          {person.places.slice(0, 4).map(placeName).join(', ')}
        </span>
        {known(person.login) && (
          <Button href={`@${person.login}`} variant='secondary' size={32}>
            Voir le profil
          </Button>
        )}
        {close}
      </aside>
    )
  }
  if (place) {
    const href = hrefOf(place.key)
    return (
      <aside class={box} aria-live='polite'>
        <span class='flex items-center gap-2.5'>
          <Cube size={28} top={place.owned ? 'filled' : 'soft'} />
          <span class='text-[15px] font-semibold'>
            {place.kind === 'community' ? `# ${place.name}` : place.name}
          </span>
        </span>
        {place.summary && (
          <span class='text-[12px] text-ink-muted'>{place.summary}</span>
        )}
        {place.people.length > 0 && (
          <span class='flex flex-col gap-1.5'>
            {place.people.map((other) => (
              <button
                key={other}
                type='button'
                class='flex cursor-pointer items-center gap-2 text-left text-[13px] hover:text-indigo'
                onClick={() => onPick(`u:${other}`)}
              >
                <span class='disc size-6 text-[10px]'>
                  {initials(personOf(other).name)}
                </span>
                {personOf(other).name}
              </button>
            ))}
          </span>
        )}
        {href && (
          <Button href={href} variant='secondary' size={32}>
            {place.kind === 'community'
              ? 'Voir la communauté'
              : 'Voir le projet'}
          </Button>
        )}
        {place.key === OTHERS && (
          <Button params={{ dialog: 'reseau' }} variant='secondary' size={32}>
            Voir tout le réseau
          </Button>
        )}
        {close}
      </aside>
    )
  }
  const [top] = network.mates
  const [first] = network.places
  const countries = new Set(
    network.mates.map((mate) => personOf(mate.login).countryCode)
      .filter(Boolean),
  )
  return (
    <aside class={box}>
      <span class='text-[15px] font-semibold'>
        {t`Le réseau de ${personOf(login).name.split(' ')[0]}`}
      </span>
      <span class='flex flex-col gap-1.5 text-[13px]'>
        <span>{counted(network.mates.length, 'personne')}</span>
        <span>
          {counted(
            network.places.length,
            'projet ou communauté',
            'projets ou communautés',
          )}
        </span>
        <span>{counted(countries.size, 'pays', 'pays')}</span>
      </span>
      {first && (
        <span class='text-[12px] text-ink-muted'>
          {t`Lieu principal : ${first.name}`}
        </span>
      )}
      {top && (
        <span class='text-[12px] text-ink-muted'>
          {t`Lien le plus fort : ${personOf(top.login).name} (${top.count})`}
        </span>
      )}
      <span class='text-[12px] text-ink-muted'>
        Survole ou clique un projet ou une personne pour en voir le détail.
      </span>
    </aside>
  )
}

/** The legend of the graph, drawn with its own shapes */
const Key = () => (
  <span class='flex flex-wrap items-center gap-x-4 gap-y-1.5 text-[12px] text-ink-muted'>
    <span class='inline-flex items-center gap-1.5'>
      <Cube size={16} top='filled' /> son projet
    </span>
    <span class='inline-flex items-center gap-1.5'>
      <Cube size={16} /> un projet
    </span>
    <span class='inline-flex items-center gap-1.5'>
      <span class='disc size-4' /> une personne
    </span>
    <span class='inline-flex items-center gap-1.5'>
      <span class='h-[5px] w-6 rounded-full bg-indigo' /> plus de travail
    </span>
    <span class='inline-flex items-center gap-1.5'>
      <span class='w-6 border-t-2 border-dashed border-indigo' /> démo
    </span>
  </span>
)

/**
 * The whole working network in a side panel, for the profiles too big for
 * the graph: every person and every place, searchable, with the filters of
 * the graph.
 */
export const NetworkDrawer = ({ login }: { login: Login }) => {
  const [filter, setFilter] = useState<NetworkFilter>({
    only: null,
    days: null,
  })
  const [query, setQuery] = useState('')
  if (url.params.dialog !== 'reseau') return null
  const network = networkOf(login, filter)
  const words = query.trim().toLowerCase()
  const match = (name: string) => !words || name.toLowerCase().includes(words)
  const placeName = (key: string) =>
    network.places.find((place) => place.key === key)?.name ?? ''
  const mates = network.mates.filter((mate) =>
    match(personOf(mate.login).name) ||
    mate.places.some((key) => match(placeName(key)))
  )
  const places = network.places.filter((place) => match(place.name))
  const max = Math.max(1, ...network.mates.map((mate) => mate.count))
  return (
    <Drawer
      id='reseau'
      label='Réseau de travail'
      width={480}
      header={<Eyebrow>Réseau de travail · {people[login].name}</Eyebrow>}
    >
      <div class='flex flex-col gap-4 p-[22px]'>
        <Filters filter={filter} setFilter={setFilter} />
        <Input
          type='search'
          placeholder='Chercher une personne, un projet ou une communauté'
          aria-label='Chercher dans le réseau'
          value={query}
          onInput={(event) => setQuery(event.currentTarget.value)}
        />
        <h2 class='font-display text-[19px] leading-6 font-semibold'>
          {counted(mates.length, 'personne')}
        </h2>
        <div class='flex flex-col'>
          {mates.map((mate) => (
            <CollaboratorRow
              key={mate.login}
              mate={mate}
              max={max}
              placeName={placeName}
            />
          ))}
        </div>
        <h2 class='font-display text-[19px] leading-6 font-semibold'>
          {counted(
            places.length,
            'projet ou communauté',
            'projets ou communautés',
          )}
        </h2>
        <div class='flex flex-col'>
          {places.map((place) => (
            <div
              key={place.key}
              class='flex items-center gap-3 border-t border-line py-2.5'
            >
              <Cube size={24} top={place.owned ? 'filled' : 'soft'} />
              <span class='flex min-w-0 flex-1 flex-col gap-0.5'>
                <span class='text-[14px] font-semibold'>{place.name}</span>
                <span class='text-[12px] text-ink-muted'>
                  {summary(place)} · {counted(place.people, 'personne')}
                </span>
              </span>
            </div>
          ))}
        </div>
        {!mates.length && !places.length && (
          <span class='text-[13px] text-ink-muted'>
            Aucun lien de travail pour ces filtres.
          </span>
        )}
      </div>
    </Drawer>
  )
}
