import { navigate, url } from '@01edu/signal-router'
import { A } from '/web/ui/link.tsx'
import { useMemo, useState } from 'preact/hooks'
import { daysAgo } from '/web/fixtures/clock.ts'
import { communities } from '/web/fixtures/communities.ts'
import { type Login, people, personOf } from '/web/fixtures/people.ts'
import { projects } from '/web/fixtures/projects.ts'
import {
  type Dimension,
  projectNameOf,
  proofs,
  reputationChanged,
} from '/web/fixtures/reputation.ts'
import { initials } from '/web/ui/avatar.tsx'
import { Button, OptionButton } from '/web/ui/button.tsx'
import { Drawer } from '/web/ui/dialog.tsx'
import { Eyebrow } from '/web/ui/eyebrow.tsx'
import { Input, Select } from '/web/ui/input.tsx'
import { Cube, prism } from '/web/ui/shapes.tsx'
import { counted, plural, shortCount } from '/web/lib/plural.ts'
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
  /** Links by place */
  byPlace: Record<string, number>
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
  const mates = new Map<string, Mate>()
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
      byPlace: {},
      kinds: {},
      count: 0,
      verified: false,
    }
    mate.count++
    mate.kinds[p.dimension] = (mate.kinds[p.dimension] ?? 0) + 1
    mate.verified ||= p.verified
    mate.byPlace[key] = (mate.byPlace[key] ?? 0) + 1
    mates.set(other, mate)
    met.set(key, (met.get(key) ?? new Set()).add(other))
  }
  for (const [key, people] of met) places.get(key)!.people = people.size
  return {
    places: [...places.values()].sort((a, b) => b.total - a.total),
    mates: [...mates.values()]
      .map((mate) => ({
        ...mate,
        places: Object.entries(mate.byPlace).sort(([, a], [, b]) => b - a)
          .map(([key]) => key),
      }))
      .sort((a, b) => b.count - a.count),
  }
}

/** The work done with a person in a place; the others place counts it all */
const linksIn = (mate: Mate, key: string) =>
  key === OTHERS ? mate.count : mate.byPlace[key] ?? 0

/**
 * The people of a place, the most work there first. The « others » place
 * holds the people whose main place is not on the star.
 */
export const peopleOf = (mates: Mate[], key: string, main: string[]) =>
  key === OTHERS
    ? mates.filter((mate) => !main.includes(mate.places[0]))
    : mates.filter((mate) => mate.byPlace[key])
      .sort((a, b) => b.byPlace[key] - a.byPlace[key])

/** The places drawn on the star, the strongest first */
const mainOf = (places: Place[]) =>
  places.slice(0, PLACES).map((place) => place.key)

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
// A place beside the graph lists its first people, the rest in the panel
const LISTED = 8
// The panel shows its rows a page at a time: a network of thousands stays
// light to open and to search
const ROWS = 30

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
  /** Its people, all of them, not only those drawn */
  count: number
  angle: number
  x: number
  y: number
}
type Point = Mate & {
  hub: string
  /** The links shown beside the name: in the focused place, or in all */
  here: number
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

// A disc grows with the work, by its area
const radiusOf = (links: number, max: number) => 12 + 8 * Math.sqrt(links / max)

/**
 * The star: at most five places and fourteen people, whatever the size of the
 * network. The places keep their seats; a focused place brings its own people
 * to the outer ring, fanned out around it.
 */
export const starOf = (
  mates: Mate[],
  places: Place[],
  focus: string | null,
) => {
  const main = mainOf(places)
  const rest = places.slice(PLACES)
  const shown = mates.slice(0, STAR)
  const hubOf = (mate: Mate) =>
    main.includes(mate.places[0]) ? mate.places[0] : OTHERS
  const keys = [
    ...main,
    ...(rest.length || shown.some((m) => hubOf(m) === OTHERS) ? [OTHERS] : []),
  ]
  // Each place gets a seat wide enough for its name, at most 40°, and the
  // rest of the circle by its people shown: a place without people still
  // stands apart from its neighbours
  const counts = keys.map((key) =>
    shown.filter((mate) => hubOf(mate) === key).length
  )
  const seat = Math.min(2 * Math.PI / 9, 1.6 * Math.PI / keys.length)
  const spare = 2 * Math.PI - seat * keys.length
  const spans = counts.map((count) =>
    seat + spare * count / Math.max(1, shown.length)
  )
  const max = Math.max(1, ...shown.map((mate) => mate.count))
  const hubs: Hub[] = []
  const points: Point[] = []
  let start = -Math.PI / 2 - spans[0] / 2
  keys.forEach((key, i) => {
    const span = spans[i]
    const place = places.find((p) => p.key === key)
    const angle = start + span / 2
    hubs.push({
      key,
      name: place?.name ??
        `+${rest.length} ${plural(rest.length, 'autre lieu', 'autres lieux')}`,
      kind: place?.kind,
      owned: !!place?.owned,
      total: place?.total ?? rest.reduce((sum, p) => sum + p.total, 0),
      summary: place ? summary(place) : '',
      count: peopleOf(mates, key, main).length,
      angle,
      ...at(INNER, angle),
    })
    const members = shown.filter((mate) => hubOf(mate) === key)
    members.forEach((mate, j) => {
      points.push({
        ...mate,
        hub: key,
        here: mate.count,
        r: radiusOf(mate.count, max),
        ...at(OUTER, start + span * (j + 0.5) / members.length),
      })
    })
    start += span
  })
  const hub = hubs.find((h) => h.key === focus)
  if (!hub) return { hubs, points, main }
  // Focused, a place fans its people out around it, on half the ring at
  // most: the threads never cross the centre
  const members = peopleOf(mates, hub.key, main).slice(0, STAR)
  const fan = Math.min(Math.PI, members.length * 0.45)
  const most = Math.max(1, ...members.map((mate) => linksIn(mate, hub.key)))
  return {
    hubs,
    main,
    points: members.map((mate, j) => ({
      ...mate,
      hub: hub.key,
      here: linksIn(mate, hub.key),
      r: radiusOf(linksIn(mate, hub.key), most),
      ...at(OUTER, hub.angle - fan / 2 + fan * (j + 0.5) / members.length),
    })),
  }
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
  if (kind === 'project') {
    return slug in projects ? `project/${slug}` : undefined
  }
  if (kind === 'community') return `community/${slug}`
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
 * centre, their main projects and communities around, each with its number
 * of people, then the people met in each, named with their number of links
 * (§9.3). Thicker threads for more work. A click on a place focuses it: its
 * own people come to the outer ring. A place or a person shows its detail
 * beside the graph, on hover or kept by a click. The whole network is in the
 * « Réseau de travail » panel. Working links only, never follows. On a phone,
 * where names would be too small, the people as a ranking, the places as
 * chips that narrow it.
 */
export const CollaborationGraph = ({ login }: { login: Login }) => {
  const [filter, setFilter] = useState<NetworkFilter>({
    only: null,
    days: null,
  })
  const [hovered, setHovered] = useState<string | null>(null)
  const [selected, select] = useState<string | null>(null)
  // The place whose people are on the outer ring
  const [focus, setFocus] = useState<string | null>(null)
  // Computed once per filter and per new proof, not at each hover
  const version = reputationChanged.value
  const network = useMemo(() => networkOf(login, filter), [
    login,
    filter,
    version,
  ])
  const { hubs, points, main } = starOf(network.mates, network.places, focus)
  const left = network.mates.length - Math.min(STAR, network.mates.length)
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
  const focused = hubs.find((hub) => hub.key === focus)
  const lit = (hub: string, login?: string) =>
    !active || active === `p:${hub}` ||
    (!!login && active === `u:${login}`) ||
    (!login && person?.hub === hub)
  // A place kept by a click is also focused; let go, the star comes back.
  // A person kept or let go leaves the focused place as it is
  const keep = (key: string | null) => {
    select(key)
    if (key?.startsWith('p:')) setFocus(key.slice(2))
    else if (!key && selected?.startsWith('p:')) setFocus(null)
  }
  // Back to the whole network
  const reset = () => {
    select(null)
    setFocus(null)
  }
  const props = (key: string) => pick(key, keep, selected, setHovered)
  const filterWith = (next: NetworkFilter) => {
    setFilter(next)
    reset()
  }
  const ranking = focus ? peopleOf(network.mates, focus, main) : network.mates
  return (
    <section
      id='profil-collaborations'
      class='slab flex flex-col gap-3 p-[22px]'
    >
      <div class='flex flex-wrap items-center justify-between gap-3'>
        <Eyebrow>Collaboration Graph</Eyebrow>
        <Filters filter={filter} setFilter={filterWith} />
      </div>
      {network.mates.length
        ? (
          <>
            {
              /* The detail goes beside the graph only where the graph keeps names
            readable; below it otherwise */
            }
            <div class='hidden gap-5 sm:grid xl:grid-cols-[minmax(0,1fr)_16rem]'>
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
                {hubs.map((hub) => (
                  <HubNode
                    key={hub.key}
                    hub={hub}
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
                main={main}
                person={person}
                place={place}
                placeName={placeName}
                kept={!!selected && selected === active}
                onPick={keep}
                onBack={reset}
              />
            </div>
            <div class='flex flex-col gap-2 sm:hidden'>
              <span class='text-[12px] text-ink-muted'>Par lieu</span>
              <div class='flex flex-wrap gap-1.5'>
                <OptionButton pressed={!focus} onClick={reset}>
                  Tout le réseau
                </OptionButton>
                {hubs.filter((hub) => hub.count).map((hub) => (
                  <OptionButton
                    key={hub.key}
                    pressed={focus === hub.key}
                    class='max-w-full'
                    onClick={() =>
                      focus === hub.key ? reset() : keep(`p:${hub.key}`)}
                  >
                    <span class='truncate'>
                      {hub.kind === 'community' ? `# ${hub.name}` : hub.name}
                    </span>
                    <span class='font-mono text-[12px] text-ink-muted'>
                      {shortCount(hub.count)}
                    </span>
                  </OptionButton>
                ))}
              </div>
              <Legend />
              <div class='flex flex-col'>
                {ranking.slice(0, SHOWN).map((mate) => (
                  <CollaboratorRow
                    key={mate.login}
                    mate={mate}
                    max={max}
                    placeName={placeName}
                  />
                ))}
              </div>
            </div>
            <div class='flex flex-wrap items-center justify-between gap-3'>
              <Key />
              {focused && focused.key !== OTHERS
                ? (
                  <Button
                    variant='secondary'
                    size={34}
                    params={{ dialog: 'network', lieu: focused.key }}
                  >
                    {t`Voir ses ${shortCount(focused.count)} personnes`}
                  </Button>
                )
                : (
                  <Button
                    variant='secondary'
                    size={34}
                    params={{ dialog: 'network', lieu: null }}
                  >
                    {left
                      ? t`Voir tout le réseau (+${shortCount(left)})`
                      : translate('Voir tout le réseau')}
                  </Button>
                )}
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
  { hub, dimmed, on, props }: {
    hub: Hub
    dimmed: boolean
    on: boolean
    props: NodeProps
  },
) => {
  const shape = hub.kind === 'community'
    ? prism(hub.x, hub.y + 6, 17, 10, 5)
    : prism(hub.x, hub.y + 10, 15, 8.7, 17)
  const ghost = hub.key === OTHERS
  // The name goes away from the centre, above in the upper half: two
  // neighbours never write into the same gap
  const y = Math.sin(hub.angle) < 0 ? hub.y - 36 : hub.y + 34
  const count = shortCount(hub.count)
  return (
    <g
      {...props}
      aria-label={`${hub.name}, ${counted(hub.count, 'personne')}`}
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
      {hub.count > 0 && (
        <g aria-hidden='true'>
          <rect
            x={hub.x + 12}
            y={hub.y - 20}
            width={Math.max(15, count.length * 6 + 8)}
            height='15'
            rx='7.5'
            fill='var(--indigo)'
            stroke='var(--surface-100)'
          />
          <text
            x={hub.x + 12 + Math.max(15, count.length * 6 + 8) / 2}
            y={hub.y - 9}
            text-anchor='middle'
            fill='var(--on-indigo)'
            font-size='9.5'
            class='font-mono font-semibold'
          >
            {count}
          </text>
        </g>
      )}
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
          {point.here}
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
  { login, network, main, person, place, placeName, kept, onPick, onBack }: {
    login: Login
    network: ReturnType<typeof networkOf>
    main: string[]
    person?: Point
    place?: Hub
    placeName: (key: string) => string
    kept: boolean
    onPick: (key: string) => void
    onBack: () => void
  },
) => {
  const box = 'well flex flex-col gap-3 self-start p-4'
  // Read out once kept (a click, or Enter), not at each hover
  const live = kept ? 'polite' : undefined
  const close = kept && (
    <button
      type='button'
      class='cursor-pointer self-start text-[12px] font-semibold text-indigo hover:underline'
      onClick={onBack}
    >
      Retour au réseau
    </button>
  )
  if (person) {
    const who = personOf(person.login)
    return (
      <aside class={box} aria-live={live}>
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
    const members = peopleOf(network.mates, place.key, main)
    return (
      <aside class={box} aria-live={live}>
        <span class='flex items-center gap-2.5'>
          <Cube size={28} top={place.owned ? 'filled' : 'soft'} />
          <span class='text-[15px] font-semibold'>
            {place.kind === 'community' ? `# ${place.name}` : place.name}
          </span>
        </span>
        <span class='text-[12px] text-ink-muted'>
          {[counted(members.length, 'personne'), place.summary]
            .filter(Boolean).join(' · ')}
        </span>
        {members.length > 0 && (
          <span class='flex flex-col gap-1.5'>
            {members.slice(0, LISTED).map((mate) => (
              <button
                key={mate.login}
                type='button'
                class='flex cursor-pointer items-center gap-2 text-left text-[13px] hover:text-indigo'
                onClick={() => onPick(`u:${mate.login}`)}
              >
                <span class='disc size-6 shrink-0 text-[10px]'>
                  {initials(personOf(mate.login).name)}
                </span>
                <span class='min-w-0 flex-1 truncate'>
                  {personOf(mate.login).name}
                </span>
                <span class='font-mono text-[12px] text-indigo'>
                  {linksIn(mate, place.key)}
                </span>
              </button>
            ))}
          </span>
        )}
        {
          /* Kept, the place is focused and the link is under the graph */
        }
        {members.length > LISTED && !kept && (
          <Button
            params={{
              dialog: 'network',
              lieu: place.key === OTHERS ? null : place.key,
            }}
            variant='secondary'
            size={32}
          >
            {place.key === OTHERS
              ? translate('Voir tout le réseau')
              : t`Voir ses ${shortCount(members.length)} personnes`}
          </Button>
        )}
        {href && (
          <Button href={href} variant='secondary' size={32}>
            {place.kind === 'community'
              ? 'Voir la communauté'
              : 'Voir le projet'}
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
        Survole un projet ou une personne pour en voir le détail ; clique un
        projet pour amener ses personnes autour de lui.
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

/** « Voir 30 de plus », and how many are left */
const More = (
  { left, onMore }: { left: number; onMore: () => void },
) =>
  left > 0
    ? (
      <button
        type='button'
        class='cursor-pointer self-start pt-2 text-[13px] font-semibold text-indigo hover:underline'
        onClick={onMore}
      >
        {t`Voir ${Math.min(ROWS, left)} de plus`}
        <span class='font-normal text-ink-muted'>
          {' · '}
          {t`${left} restantes`}
        </span>
      </button>
    )
    : null

/**
 * The whole working network in a side panel, for the profiles too big for
 * the graph: every person and every place, searchable, with the filters of
 * the graph, thirty rows at a time. Opened from a place (?lieu=), it holds
 * the people of that place; each place of the list opens its own.
 */
export const NetworkDrawer = ({ login }: { login: Login }) => {
  const [filter, setFilter] = useState<NetworkFilter>({
    only: null,
    days: null,
  })
  const [query, setQuery] = useState('')
  const [shown, setShown] = useState({ mates: ROWS, places: ROWS })
  const version = reputationChanged.value
  const open = url.params.dialog === 'network'
  const network = useMemo(
    () => open ? networkOf(login, filter) : undefined,
    [open, login, filter, version],
  )
  if (!network) return null
  const scope = url.params.lieu || null
  const words = query.trim().toLowerCase()
  const match = (name: string) => !words || name.toLowerCase().includes(words)
  const placeName = (key: string) =>
    network.places.find((place) => place.key === key)?.name ?? ''
  const within = scope
    ? peopleOf(network.mates, scope, mainOf(network.places))
    : network.mates
  const mates = within.filter((mate) =>
    match(personOf(mate.login).name) ||
    mate.places.some((key) => match(placeName(key)))
  )
  const places = scope
    ? []
    : network.places.filter((place) => match(place.name))
  const max = Math.max(1, ...within.map((mate) => mate.count))
  const reset = () => setShown({ mates: ROWS, places: ROWS })
  const scopeTo = (key: string | null) => {
    reset()
    navigate({ params: { lieu: key } })
  }
  return (
    <Drawer
      id='network'
      label='Réseau de travail'
      width={480}
      clear={['lieu']}
      header={<Eyebrow>Réseau de travail · {people[login].name}</Eyebrow>}
    >
      <div class='flex flex-col gap-4 p-[22px]'>
        <Filters
          filter={filter}
          setFilter={(next) => {
            setFilter(next)
            reset()
          }}
        />
        <Input
          type='search'
          placeholder={scope
            ? 'Chercher une personne'
            : 'Chercher une personne, un projet ou une communauté'}
          aria-label='Chercher dans le réseau'
          value={query}
          onInput={(event) => {
            setQuery(event.currentTarget.value)
            reset()
          }}
        />
        {scope && (
          <span class='flex flex-wrap items-center gap-x-3 gap-y-1 text-[13px]'>
            <span>
              {'Dans '}
              <span class='font-semibold'>
                {placeName(scope) || translate('ce lieu')}
              </span>
            </span>
            <button
              type='button'
              class='cursor-pointer font-semibold text-indigo hover:underline'
              onClick={() => scopeTo(null)}
            >
              Tout le réseau
            </button>
          </span>
        )}
        <h2 class='font-display text-[19px] leading-6 font-semibold'>
          {counted(mates.length, 'personne')}
        </h2>
        <div class='flex flex-col'>
          {mates.slice(0, shown.mates).map((mate) => (
            <CollaboratorRow
              key={mate.login}
              mate={mate}
              max={max}
              placeName={placeName}
            />
          ))}
          <More
            left={mates.length - shown.mates}
            onMore={() => setShown({ ...shown, mates: shown.mates + ROWS })}
          />
        </div>
        {!scope && (
          <>
            <h2 class='font-display text-[19px] leading-6 font-semibold'>
              {counted(
                places.length,
                'projet ou communauté',
                'projets ou communautés',
              )}
            </h2>
            <div class='flex flex-col'>
              {places.slice(0, shown.places).map((place) => (
                <button
                  key={place.key}
                  type='button'
                  class='flex cursor-pointer items-center gap-3 border-t border-line py-2.5 text-left hover:text-indigo'
                  aria-label={t`Voir les personnes de ${place.name}`}
                  onClick={() => scopeTo(place.key)}
                >
                  <Cube size={24} top={place.owned ? 'filled' : 'soft'} />
                  <span class='flex min-w-0 flex-1 flex-col gap-0.5'>
                    <span class='truncate text-[14px] font-semibold'>
                      {place.kind === 'community'
                        ? `# ${place.name}`
                        : place.name}
                    </span>
                    <span class='text-[12px] text-ink-muted'>
                      {summary(place)} · {counted(place.people, 'personne')}
                    </span>
                  </span>
                </button>
              ))}
              <More
                left={places.length - shown.places}
                onMore={() =>
                  setShown({ ...shown, places: shown.places + ROWS })}
              />
            </div>
          </>
        )}
        {!mates.length && !places.length && (
          <span class='text-[13px] text-ink-muted'>
            Aucun lien de travail pour ces filtres.
          </span>
        )}
      </div>
    </Drawer>
  )
}
