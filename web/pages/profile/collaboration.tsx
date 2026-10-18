import { useState } from 'preact/hooks'
import { A } from '@01edu/signal-router'
import { countries, type Login, people } from '/web/fixtures/people.ts'
import { type Link, linksOf, proofs } from '/web/fixtures/reputation.ts'
import { counted, plural } from '/web/lib/plural.ts'
import { Avatar, initials } from '/web/ui/avatar.tsx'
import { Eyebrow } from '/web/ui/eyebrow.tsx'
import { prism } from '/web/ui/shapes.tsx'

const countryName = (code: string) =>
  Object.entries(countries).find(([, iso]) => iso === code)?.[0] ?? code

const Legend = ({ login }: { login: Login }) => (
  <div class='collab-legend'>
    <span>
      <i /> Au moins une preuve GitHub
    </span>
    <span>
      <i class='is-dashed' /> Sans preuve GitHub
    </span>
    {proofs.some((proof) =>
      proof.demo && (proof.who === login || proof.by === login)
    ) && <span>Ce réseau contient des données de démonstration.</span>}
  </div>
)

// The columns are spaced as a schematic: geography never obscures a name.
export const CollaborationMap = ({ login }: { login: Login }) => {
  const person = people[login]
  const [selected, setSelected] = useState('')
  const byCountry = new Map<
    string,
    { count: number; verified: boolean; links: Link[] }
  >()
  for (const link of linksOf(login)) {
    const code = people[link.login].countryCode
    if (!code || code === person.countryCode) continue
    const entry = byCountry.get(code) ??
      { count: 0, verified: false, links: [] }
    entry.count += link.count
    entry.verified ||= link.verified
    entry.links.push(link)
    byCountry.set(code, entry)
  }
  const entries = person.countryCode
    ? [...byCountry].sort((a, b) => b[1].count - a[1].count)
    : []
  const active = entries.find(([code]) => code === selected) ?? entries[0]
  const total = entries.reduce((sum, [, entry]) => sum + entry.count, 0)
  const max = Math.max(1, ...entries.map(([, entry]) => entry.count))
  const rows = Math.ceil(entries.length / 3)
  const height = Math.max(330, 230 + rows * 110)
  const home = { x: 110, y: height - 65, height: 48 }
  const columns = entries.map(([code, entry], i) => ({
    code,
    ...entry,
    x: 255 + i % 3 * 120,
    y: 150 + Math.floor(i / 3) * 110 + (i % 3 === 1 ? -30 : 0),
    height: 20 + entry.count / max * 56,
  }))
  return (
    <section class='slab collab-section'>
      <div class='collab-heading'>
        <div>
          <Eyebrow>Collaboration Map</Eyebrow>
          <h2>Le code traverse les frontières.</h2>
        </div>
        <span class='collab-stat'>
          <b>{entries.length}</b> pays relié{entries.length > 1 ? 's' : ''}
        </span>
      </div>
      <p class='collab-subtitle'>
        Depuis {person.country || 'un pays à renseigner'} ·{' '}
        {counted(total, 'lien de travail', 'liens de travail')}{' '}
        à travers les frontières.
      </p>
      {entries.length && person.countryCode
        ? (
          <div class='collab-map-layout'>
            <div class='collab-map-stage'>
              <span class='collection-label map-stage-label'>
                Réseau transfrontalier
              </span>
              <svg
                viewBox={`0 0 610 ${height}`}
                role='group'
                aria-label='Carte schématique : sélectionner un pays'
              >
                <path
                  d={`M35 170 300 35 590 ${height - 155} 325 ${height - 20}Z`}
                  fill='var(--surface-100)'
                  stroke='var(--line-strong)'
                />
                {[0, 1, 2, 3, 4].map((i) => (
                  <path
                    key={i}
                    d={`M${80 + i * 49} ${147 - i * 25} ${370 + i * 49} ${
                      height - 43 - i * 25
                    }`}
                    fill='none'
                    stroke='var(--line)'
                    stroke-dasharray='2 5'
                  />
                ))}
                {columns.map((column) => (
                  <path
                    key={column.code}
                    d={`M${home.x} ${home.y - home.height} Q${home.x + 30} ${
                      column.y - column.height - 60
                    } ${column.x} ${column.y - column.height}`}
                    fill='none'
                    stroke='var(--indigo)'
                    stroke-width={column.code === active?.[0] ? 2.8 : 1.4}
                    opacity={column.code === active?.[0] ? 1 : 0.35}
                    stroke-dasharray={column.verified ? undefined : '5 5'}
                  />
                ))}
                {[{ code: person.countryCode, ...home, count: 0 }, ...columns]
                  .map((column) => {
                    const isHome = column.code === person.countryCode
                    const isActive = column.code === active?.[0]
                    const faces = prism(
                      column.x,
                      column.y,
                      19,
                      11,
                      column.height,
                    )
                    const content = (
                      <>
                        <ellipse
                          cx={column.x + 4}
                          cy={column.y + 12}
                          rx='27'
                          ry='9'
                          fill='var(--line)'
                          opacity='.6'
                        />
                        <polygon
                          points={faces.left}
                          fill={isHome || isActive
                            ? 'var(--indigo-soft)'
                            : 'var(--surface-100)'}
                          stroke='var(--figure-edge)'
                          stroke-linejoin='round'
                        />
                        <polygon
                          points={faces.right}
                          fill={isHome || isActive
                            ? 'var(--indigo-soft-side)'
                            : 'var(--side)'}
                          stroke='var(--figure-edge)'
                          stroke-linejoin='round'
                        />
                        <polygon
                          points={faces.top}
                          fill={isHome || isActive
                            ? 'var(--indigo)'
                            : 'var(--surface-200)'}
                          stroke={isHome || isActive
                            ? 'var(--indigo-edge)'
                            : 'var(--figure-edge)'}
                          stroke-linejoin='round'
                        />
                        {!isHome && (
                          <text
                            x={column.x}
                            y={column.y - column.height - 24}
                            text-anchor='middle'
                            class='map-count'
                          >
                            {column.count}
                          </text>
                        )}
                        <text
                          x={column.x}
                          y={column.y + 33}
                          text-anchor='middle'
                          class='map-country'
                        >
                          {countryName(column.code)}
                        </text>
                        {isHome && (
                          <text
                            x={column.x}
                            y={column.y + 50}
                            text-anchor='middle'
                            class='map-caption'
                          >
                            Point de départ
                          </text>
                        )}
                      </>
                    )
                    return isHome ? <g key={column.code}>{content}</g> : (
                      <g
                        key={column.code}
                        role='button'
                        tabIndex={0}
                        aria-label={`${countryName(column.code)}, ${
                          counted(
                            column.count,
                            'lien de travail',
                            'liens de travail',
                          )
                        }`}
                        aria-pressed={isActive}
                        class='map-country-button'
                        onClick={() => setSelected(column.code)}
                        onKeyDown={(event) => {
                          if (event.key === 'Enter' || event.key === ' ') {
                            event.preventDefault()
                            setSelected(column.code)
                          }
                        }}
                      >
                        <title>{countryName(column.code)}</title>
                        {content}
                      </g>
                    )
                  })}
              </svg>
              <span class='map-footnote'>
                Grille isométrique · positions schématiques
              </span>
            </div>
            <div class='country-list'>
              <span class='collection-label'>Les pays du réseau</span>
              {entries.map(([code, entry], i) => (
                <button
                  key={code}
                  type='button'
                  class='country-row'
                  aria-pressed={code === active?.[0]}
                  onClick={() => setSelected(code)}
                >
                  <span class='country-index'>
                    {String(i + 1).padStart(2, '0')}
                  </span>
                  <span>
                    <strong>{countryName(code)}</strong>
                    <small>
                      {counted(entry.links.length, 'collaborateur')}
                    </small>
                  </span>
                  <b>
                    {entry.count}
                    <small>{plural(entry.count, 'lien')}</small>
                  </b>
                </button>
              ))}
              {active && (
                <div
                  class='country-detail'
                  aria-live='polite'
                  aria-atomic='true'
                >
                  <span class='collection-label'>
                    Avec qui ? · {countryName(active[0])}
                  </span>
                  {active[1].links.map((link) => (
                    <A
                      key={link.login}
                      href={`@${link.login}`}
                      class='country-person'
                    >
                      <Avatar
                        name={people[link.login].name}
                        src={people[link.login].avatarUrl}
                        size={28}
                      />
                      <span>{people[link.login].name}</span>
                      <span aria-hidden='true'>↗</span>
                    </A>
                  ))}
                </div>
              )}
            </div>
          </div>
        )
        : (
          <div class='collection-empty'>
            Les premières collaborations à l’étranger dessineront ce réseau. Un
            pays renseigné sur le profil permet d’y apparaître.
          </div>
        )}
      <Legend login={login} />
    </section>
  )
}

/** Working relationships, with an equivalent keyboard-friendly list. */
export const CollaborationGraph = ({ login }: { login: Login }) => {
  const links = linksOf(login)
  const [selected, setSelected] = useState<Login | undefined>()
  const active = links.find((link) => link.login === selected) ?? links[0]
  const shown = links.slice(0, 7)
  const max = Math.max(1, ...links.map((link) => link.count))
  const nodes = shown.map((link, i) => {
    const angle = -Math.PI / 2 + i * 2 * Math.PI / shown.length
    return {
      ...link,
      x: Math.round(270 + 180 * Math.cos(angle)),
      y: Math.round(190 + 130 * Math.sin(angle)),
    }
  })
  return (
    <section class='slab collab-section'>
      <div class='collab-heading'>
        <div>
          <Eyebrow>Collaboration Graph</Eyebrow>
          <h2>Les personnes derrière le travail.</h2>
        </div>
        <span class='collab-stat'>
          <b>{links.length}</b> collaborateur{links.length > 1 ? 's' : ''}
        </span>
      </div>
      <p class='collab-subtitle'>
        Reviews, aides et contributions : des liens construits en faisant.
      </p>
      {active
        ? (
          <div class='collab-graph-layout'>
            <div class='collab-graph-stage'>
              <svg
                viewBox='0 0 540 390'
                role='group'
                aria-label='Réseau de collaborateurs : sélectionner une personne'
              >
                <ellipse
                  cx='270'
                  cy='190'
                  rx='180'
                  ry='130'
                  fill='none'
                  stroke='var(--line-strong)'
                  stroke-dasharray='2 7'
                />
                <ellipse
                  cx='270'
                  cy='190'
                  rx='96'
                  ry='69'
                  fill='none'
                  stroke='var(--line)'
                />
                {nodes.map((node) => (
                  <line
                    key={node.login}
                    x1='270'
                    y1='190'
                    x2={node.x}
                    y2={node.y}
                    stroke='var(--indigo)'
                    stroke-width={1 + node.count / max * 3}
                    opacity={active.login === node.login ? 1 : 0.2}
                    stroke-dasharray={node.verified ? undefined : '5 5'}
                  />
                ))}
                <circle
                  cx='274'
                  cy='196'
                  r='35'
                  fill='var(--indigo-soft-side)'
                />
                <circle
                  cx='270'
                  cy='190'
                  r='35'
                  fill='var(--indigo-soft)'
                  stroke='var(--indigo)'
                  stroke-width='2'
                />
                <text
                  x='270'
                  y='196'
                  text-anchor='middle'
                  class='graph-initials graph-self'
                >
                  {initials(people[login].name)}
                </text>
                <text x='270' y='242' text-anchor='middle' class='graph-name'>
                  {people[login].name.split(' ')[0]}
                </text>
                {nodes.map((node) => (
                  <g
                    key={node.login}
                    role='button'
                    tabIndex={0}
                    aria-label={`${people[node.login].name}, ${
                      counted(node.count, 'lien de travail', 'liens de travail')
                    }`}
                    aria-pressed={active.login === node.login}
                    class='graph-node'
                    onClick={() => setSelected(node.login)}
                    onKeyDown={(event) => {
                      if (event.key === 'Enter' || event.key === ' ') {
                        event.preventDefault()
                        setSelected(node.login)
                      }
                    }}
                  >
                    <title>{people[node.login].name}</title>
                    <circle
                      cx={node.x + 3}
                      cy={node.y + 5}
                      r='24'
                      fill='var(--side)'
                      stroke='var(--figure-edge)'
                    />
                    <circle
                      cx={node.x}
                      cy={node.y}
                      r='24'
                      fill={active.login === node.login
                        ? 'var(--indigo-soft)'
                        : 'var(--surface-100)'}
                      stroke={active.login === node.login
                        ? 'var(--indigo)'
                        : 'var(--figure-edge)'}
                      stroke-width={active.login === node.login ? 2 : 1}
                    />
                    <text
                      x={node.x}
                      y={node.y + 5}
                      text-anchor='middle'
                      class='graph-initials'
                    >
                      {initials(people[node.login].name)}
                    </text>
                    <circle
                      cx={node.x + 21}
                      cy={node.y - 20}
                      r='12'
                      fill='var(--indigo)'
                    />
                    <text
                      x={node.x + 21}
                      y={node.y - 16}
                      text-anchor='middle'
                      class='graph-weight'
                    >
                      {node.count}
                    </text>
                    <text
                      x={node.x}
                      y={node.y + 44}
                      text-anchor='middle'
                      class='graph-name'
                    >
                      {people[node.login].name.split(' ')[0]}
                    </text>
                  </g>
                ))}
              </svg>
              <span class='map-footnote'>
                L’épaisseur du fil indique le nombre de
                liens{links.length > shown.length
                  ? ` · ${shown.length} personnes affichées sur ${links.length}`
                  : ''}.
              </span>
            </div>
            <div class='network-panel'>
              <span class='collection-label'>Le cercle de collaboration</span>
              <div
                class='network-list'
                role='group'
                aria-label='Choisir un collaborateur'
              >
                {links.map((link) => (
                  <button
                    key={link.login}
                    type='button'
                    class='network-person'
                    aria-pressed={active.login === link.login}
                    onClick={() => setSelected(link.login)}
                  >
                    <Avatar
                      name={people[link.login].name}
                      src={people[link.login].avatarUrl}
                      size={34}
                    />
                    <span>
                      <strong>{people[link.login].name}</strong>
                      <small>
                        {people[link.login].country || 'Pays non renseigné'}
                      </small>
                    </span>
                    <b>{link.count}</b>
                  </button>
                ))}
              </div>
              <div class='network-detail' aria-live='polite' aria-atomic='true'>
                <strong>{people[active.login].name}</strong>
                <span>
                  {counted(active.count, 'lien de travail', 'liens de travail')}
                  {' '}
                  · {active.verified
                    ? 'au moins une preuve GitHub'
                    : 'sans preuve GitHub'}
                </span>
                <A href={`@${active.login}`}>
                  Explorer son profil <span aria-hidden='true'>↗</span>
                </A>
              </div>
            </div>
          </div>
        )
        : (
          <div class='collection-empty'>
            Une première review ou une aide partagée fera apparaître un
            collaborateur ici.
          </div>
        )}
      <Legend login={login} />
    </section>
  )
}
