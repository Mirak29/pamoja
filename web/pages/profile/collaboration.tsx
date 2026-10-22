import { A } from '@01edu/signal-router'
import {
  countries,
  type Login,
  people,
  personOf,
} from '/web/fixtures/people.ts'
import { linksOf } from '/web/fixtures/reputation.ts'
import { initials } from '/web/ui/avatar.tsx'
import { Eyebrow } from '/web/ui/eyebrow.tsx'
import { prism } from '/web/ui/shapes.tsx'
import { translate } from '/web/lib/language.ts'

// Longitude and latitude of the countries shown on the isometric grid
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
  RW: [29.9, -2],
  KE: [37.9, 0.2],
  ZA: [25, -29],
}

const project = (lon: number, lat: number): [number, number] => {
  const k = 4.4
  return [
    Math.round(200 + (lon + lat) * k * 0.866),
    Math.round(118 + (lon - lat) * k * 0.5),
  ]
}

const HOME_HEIGHT = 46

/**
 * Collaboration Map: a column per country on an isometric grid, its height
 * following the collaborations, an indigo thread to the profile country.
 * No outline of Africa, and the profile country is never counted among the
 * linked countries (§9.3).
 */
export const CollaborationMap = ({ login }: { login: Login }) => {
  const person = people[login]
  const home = person.countryCode
  const byCountry = new Map<
    string,
    { count: number; verified: boolean; names: string[] }
  >()
  for (const link of linksOf(login)) {
    // A developer without a country is not on the map (§9.3)
    const code = personOf(link.login).countryCode
    if (!code || code === home) continue
    const entry = byCountry.get(code) ??
      { count: 0, verified: false, names: [] }
    entry.count += link.count
    entry.verified ||= link.verified
    entry.names.push(personOf(link.login).name.split(' ')[0])
    byCountry.set(code, entry)
  }
  const [hx, hy] = positions[home] ? project(...positions[home]) : [200, 118]
  const columns = Object.entries(positions).map(([code, at]) => {
    const [x, y] = project(...at)
    const linked = byCountry.get(code)
    const height = code === home
      ? HOME_HEIGHT
      : linked
      ? Math.min(58, 12 + linked.count * 6)
      : 0
    return { code, x, y, height, linked, isHome: code === home }
  })
  const shown = columns.filter((c) => c.height).sort((a, b) => a.y - b.y)
  const threads = shown.filter((c) => !c.isHome).map((c) => {
    const y1 = hy - HOME_HEIGHT
    const y2 = c.y - c.height
    const peak = Math.min(y1, y2) - 34
    return {
      code: c.code,
      peak,
      d: `M${hx} ${y1} Q ${(hx + c.x) / 2} ${peak} ${c.x} ${y2}`,
      verified: c.linked?.verified,
    }
  })
  const floor = [[-21, -24], [42, -24], [42, 33], [-21, 33]]
    .map(([lon, lat]) => project(lon, -lat).join(','))
    .join(' ')
  // West Africa sits at the top of the grid: the view grows upwards so the
  // tallest column and its thread are never cut
  const viewTop = Math.min(
    0,
    ...shown.map((c) => c.y - c.height - 24),
    ...threads.map((t) => t.peak),
  )
  const count = byCountry.size
  return (
    <section class='slab flex flex-col gap-3 p-[22px]'>
      <div class='flex flex-wrap items-baseline justify-between gap-3'>
        <Eyebrow>Collaboration Map</Eyebrow>
        <span class='text-[13px] text-ink-muted'>
          {count} {count > 1 ? 'pays reliés' : 'pays relié'} depuis{' '}
          {person.country}
        </span>
      </div>
      <svg
        viewBox={`0 ${viewTop} 440 ${300 - viewTop}`}
        width='100%'
        class='block max-h-[340px]'
        role='img'
        aria-label='Carte des collaborations en Afrique'
      >
        <polygon
          points={floor}
          fill='var(--surface-000)'
          stroke='var(--line-strong)'
          stroke-width='0.9'
          stroke-dasharray='3 4'
        />
        {columns.filter((c) => !c.height).map(({ code, x, y }) => (
          <polygon
            key={code}
            points={[x, y - 3, x + 5, y, x, y + 3, x - 5, y].join(' ')}
            fill='none'
            stroke='var(--line-control)'
            stroke-width='0.9'
          />
        ))}
        {threads.map(({ code, d, verified }) => (
          <path
            key={code}
            d={d}
            fill='none'
            stroke='var(--indigo)'
            stroke-width='1.5'
            stroke-dasharray={verified ? '0' : '4 4'}
          />
        ))}
        {shown.map(({ code, x, y, height, isHome }) => {
          const { top, left, right } = prism(x, y, 9, 5.2, height)
          return (
            <g key={code}>
              <polygon
                points={left}
                fill='var(--surface-100)'
                stroke='var(--ink)'
                stroke-width='0.9'
                stroke-linejoin='round'
              />
              <polygon
                points={right}
                fill='var(--side)'
                stroke='var(--ink)'
                stroke-width='0.9'
                stroke-linejoin='round'
              />
              <polygon
                points={top}
                fill={isHome ? 'var(--indigo)' : 'var(--indigo-soft)'}
                stroke='var(--ink)'
                stroke-width='0.9'
                stroke-linejoin='round'
              />
            </g>
          )
        })}
        {
          /* Labels go over every column, with a halo: neighbouring
          countries stand close together */
        }
        {shown.map(({ code, x, y, height, linked }) => (
          <g
            key={code}
            paint-order='stroke'
            stroke='var(--surface-100)'
            stroke-width='3'
            stroke-linejoin='round'
            text-anchor='middle'
            class='font-mono text-[10px] font-semibold'
          >
            <text x={x} y={y + 18} fill='var(--ink)'>{code}</text>
            {linked && (
              <text x={x} y={y - height - 12} fill='var(--indigo)'>
                {linked.count}
              </text>
            )}
          </g>
        ))}
      </svg>
      {count
        ? (
          <div class='flex flex-col gap-1.5'>
            {[...byCountry].map(([code, { count, names }]) => (
              <span key={code} class='flex items-center gap-2.5 text-[13px]'>
                <span class='font-semibold'>
                  {translate(countryName(code))}
                </span>
                {names.join(', ')} · {count}{' '}
                {count > 1 ? 'collaborations' : 'collaboration'}
              </span>
            ))}
          </div>
        )
        : (
          <span class='text-[13px] text-ink-muted'>
            Pas encore de collaboration hors de son pays. Le fil se tend à la
            première.
          </span>
        )}
      <span class='text-[12px] text-ink-muted'>
        Fil plein : collaboration vérifiée par GitHub. Pointillé : donnée de
        démo.
      </span>
    </section>
  )
}

// The map labels its columns with the ISO code; text names the country
const countryName = (code: string) =>
  Object.entries(countries).find(([, iso]) => iso === code)?.[0] ?? code

/** Collaboration Graph: working links only, never follows (§9.3) */
export const CollaborationGraph = ({ login }: { login: Login }) => {
  const links = linksOf(login).slice(0, 7)
  const nodes = links.map((link, i) => {
    const angle = -Math.PI / 2 + i * 2 * Math.PI / links.length
    return {
      ...link,
      x: Math.round(200 + 140 * Math.cos(angle)),
      y: Math.round(110 + 78 * Math.sin(angle)),
    }
  })
  return (
    <section
      id='profil-collaborations'
      class='slab flex flex-col gap-3 p-[22px]'
    >
      <div class='flex flex-wrap items-baseline justify-between gap-3'>
        <Eyebrow>Collaboration Graph</Eyebrow>
        <span class='text-[13px] text-ink-muted'>
          Liens de travail uniquement : reviews, aides, PRs.
        </span>
      </div>
      {nodes.length
        ? (
          <>
            <svg
              viewBox='0 0 400 220'
              width='100%'
              class='block max-h-[260px]'
              role='img'
              aria-label='Graphe des collaborations'
            >
              {nodes.map((node) => (
                <line
                  key={node.login}
                  x1='200'
                  y1='110'
                  x2={node.x}
                  y2={node.y}
                  stroke='var(--indigo)'
                  stroke-width='1.3'
                  stroke-dasharray={node.verified ? '0' : '4 4'}
                />
              ))}
              <circle cx='201.7' cy='111' r='22' fill='var(--figure-edge)' />
              <circle
                cx='200'
                cy='110'
                r='22'
                fill='var(--indigo-soft)'
                stroke='var(--indigo)'
                stroke-width='1.5'
              />
              <text
                x='200'
                y='115'
                text-anchor='middle'
                fill='var(--ink)'
                class='font-display text-[13px] font-bold'
              >
                {initials(people[login].name)}
              </text>
              {nodes.map((node) => (
                <g key={node.login}>
                  <circle
                    cx={node.x}
                    cy={node.y}
                    r='16'
                    fill='var(--surface-200)'
                    stroke='var(--figure-edge)'
                  />
                  <text
                    x={node.x}
                    y={node.y + 4}
                    text-anchor='middle'
                    fill='var(--ink)'
                    class='font-display text-[10px] font-semibold'
                  >
                    {initials(personOf(node.login).name)}
                  </text>
                </g>
              ))}
            </svg>
            <div class='flex flex-wrap gap-2.5'>
              {nodes.map((node) => (
                <A
                  key={node.login}
                  href={`@${node.login}`}
                  class='tile inline-flex flex-col px-2.5 py-1.5 text-ink no-underline hover:no-underline'
                >
                  <span class='text-[13px] font-semibold'>
                    {personOf(node.login).name}
                  </span>
                  <span class='text-[11px] text-ink-muted'>
                    {node.count}{' '}
                    {node.count > 1 ? 'liens de travail' : 'lien de travail'}
                    {node.verified ? ' · vérifié' : ''}
                  </span>
                </A>
              ))}
            </div>
          </>
        )
        : (
          <span class='text-[13px] text-ink-muted'>
            Aucun lien de travail pour l’instant.
          </span>
        )}
    </section>
  )
}
