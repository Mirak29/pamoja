import { useState } from 'preact/hooks'
import { A } from '@01edu/signal-router'
import { type Login, people } from '/web/fixtures/people.ts'
import { linksOf, proofs } from '/web/fixtures/reputation.ts'
import { counted } from '/web/lib/plural.ts'
import { Avatar, initials } from '/web/ui/avatar.tsx'
import { Eyebrow } from '/web/ui/eyebrow.tsx'

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

export { CollaborationMap } from './collaboration-map.tsx'

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
