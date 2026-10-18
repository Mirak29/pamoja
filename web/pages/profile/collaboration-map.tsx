import { useState } from 'preact/hooks'
import { A, url } from '@01edu/signal-router'
import { countries, type Login, people } from '/web/fixtures/people.ts'
import { helpRequests } from '/web/fixtures/help.ts'
import { projects } from '/web/fixtures/projects.ts'
import { dimensions, proofs } from '/web/fixtures/reputation.ts'
import { counted, plural } from '/web/lib/plural.ts'
import { githubUrl } from '/web/lib/links.ts'
import { Avatar } from '/web/ui/avatar.tsx'
import { DemoBadge, StatusBadge, VerifiedBadge } from '/web/ui/badge.tsx'
import { Drawer } from '/web/ui/dialog.tsx'
import { Eyebrow } from '/web/ui/eyebrow.tsx'
import { CollaborationBoard } from './collaboration-board.tsx'
import {
  type CountryWork,
  workByCountry,
  type WorkItem,
} from './collaboration-data.ts'

const countryName = (code: string) =>
  Object.entries(countries).find(([, iso]) => iso === code)?.[0] ?? code
const drawerId = (code: string) => `liens-pays-${code}`

const WorkRow = ({ item }: { item: WorkItem }) => {
  const proof = item.type === 'proof' ? item.proof : undefined
  const request = item.type === 'request' ? item.request : undefined
  const project = proof?.project ?? request?.project
  const sourceProject = project && projects[project]
  const record = item.type === 'proof' ? item.proof : item.request
  return (
    <article class='map-work-row'>
      <div class='map-work-type'>
        <span>
          {proof
            ? dimensions.find(([kind]) => kind === proof.dimension)?.[1]
            : 'Demande d’aide'}
        </span>
        {proof?.verified && <VerifiedBadge />}
        {record.demo && <DemoBadge />}
      </div>
      <h3>{record.title}</h3>
      <p>
        {request
          ? item.direction === 'given' ? 'Aide proposée à' : 'Aide demandée à'
          : item.direction === 'given'
          ? 'Apporté à'
          : 'Reçu de'} <A href={`@${item.other}`}>{people[item.other].name}</A>
      </p>
      {request && <StatusBadge status={request.status} />}
      <div class='map-work-links'>
        {sourceProject && <A href={`projet/${project}`}>{sourceProject.name}
        </A>}
        {proof?.pullRequest && sourceProject && (
          <a href={githubUrl(sourceProject, 'pull', proof.pullRequest)}>
            PR #{proof.pullRequest} sur GitHub ↗
          </a>
        )}
        {(request || proof?.help) && (
          <A href={`aide/${request?.id ?? proof?.help}`}>Voir la demande ↗</A>
        )}
        {proof?.post && <A href={`post/${proof.post}`}>Voir la réponse ↗</A>}
      </div>
    </article>
  )
}

const CountryDrawer = ({ entry }: { entry: CountryWork }) => (
  <Drawer
    id={drawerId(entry.code)}
    label={`Liens de travail · ${countryName(entry.code)}`}
    width={480}
    header={<Eyebrow>Les contributions derrière le lien</Eyebrow>}
  >
    <div class='map-work-drawer'>
      <h2>{countryName(entry.code)}</h2>
      <p>
        {counted(entry.count, 'lien de travail', 'liens de travail')} avec{' '}
        {counted(entry.people.length, 'collaborateur')}.
      </p>
      <p class='map-count-note'>
        Une preuve et sa demande d’aide sont deux éléments du suivi. Ce total ne
        représente pas un nombre de collaborations distinctes.
      </p>
      {entry.items.map((item) => (
        <WorkRow
          key={`${item.type}-${
            item.type === 'proof' ? item.proof.id : item.request.id
          }`}
          item={item}
        />
      ))}
    </div>
  </Drawer>
)

/** The approved matte connection atlas; numbers come only from work records. */
export const CollaborationMap = ({ login }: { login: Login }) => {
  const person = people[login]
  const [selected, setSelected] = useState('')
  const entries = workByCountry(login, people, proofs, helpRequests)
  const opened = entries.find((entry) =>
    url.params.dialog === drawerId(entry.code)
  )
  const active = opened ?? entries.find((entry) => entry.code === selected) ??
    entries[0]
  const demo = entries.some((entry) => entry.demo)
  const verified = entries.some((entry) => entry.verified)
  const unverified = entries.some((entry) => !entry.verified)
  const total = entries.reduce((sum, entry) => sum + entry.count, 0)
  return (
    <section class='slab collab-section connection-map'>
      <div class='connection-heading'>
        <div>
          <Eyebrow>Collaboration Map</Eyebrow>
          <h2>Le code crée des ponts.</h2>
        </div>
        {demo && (
          <span class='map-demo-label'>Contient des données de démo</span>
        )}
      </div>
      <p class='connection-subtitle'>
        Point de départ : {person.country || 'un pays à renseigner'} ·{' '}
        {entries.length} {plural(entries.length, 'pays relié', 'pays reliés')}
      </p>
      {active
        ? (
          <div class='connection-layout'>
            <CollaborationBoard
              home={{ code: person.countryCode, name: person.country }}
              destinations={entries.map((entry) => ({
                code: entry.code,
                name: countryName(entry.code),
                count: entry.count,
                verified: entry.verified,
              }))}
              selected={active.code}
              onSelect={setSelected}
            />
            <div class='connection-panel'>
              <div
                class='connection-country-list'
                role='group'
                aria-label='Choisir un pays de collaboration'
              >
                {entries.map((entry) => (
                  <button
                    key={entry.code}
                    type='button'
                    class='connection-country'
                    aria-pressed={entry.code === active.code}
                    onClick={() => setSelected(entry.code)}
                  >
                    <span class='connection-dot' aria-hidden='true' />
                    <strong>{countryName(entry.code)}</strong>
                    <span>{counted(entry.count, 'lien')}</span>
                    <span aria-hidden='true'>›</span>
                  </button>
                ))}
              </div>
              <div
                class='connection-detail'
                aria-live='polite'
                aria-atomic='true'
              >
                <span class='collection-label'>
                  Avec qui ? · {countryName(active.code)}
                </span>
                <div class='connection-people'>
                  {active.people.map((other) => (
                    <A
                      key={other.login}
                      href={`@${other.login}`}
                      class='connection-person'
                    >
                      <Avatar
                        name={people[other.login].name}
                        src={people[other.login].avatarUrl}
                        size={42}
                      />
                      <span>
                        <strong>{people[other.login].name}</strong>
                        <small>
                          {counted(
                            other.count,
                            'lien de travail',
                            'liens de travail',
                          )}
                        </small>
                      </span>
                      <span aria-hidden='true'>↗</span>
                    </A>
                  ))}
                </div>
                <p class='connection-context'>
                  {counted(active.people.length, 'personne')} et{' '}
                  {counted(active.count, 'lien de travail', 'liens de travail')}
                  {' '}
                  relient ces deux pays.
                </p>
                <dl class='connection-breakdown'>
                  {active.breakdown.map((entry) => (
                    <div key={entry.label}>
                      <dt>{entry.label}</dt>
                      <dd>{entry.count}</dd>
                    </div>
                  ))}
                </dl>
                <A
                  params={{ dialog: drawerId(active.code) }}
                  class='connection-action'
                >
                  Explorer les contributions <span aria-hidden='true'>↗</span>
                </A>
              </div>
            </div>
          </div>
        )
        : (
          <div class='connection-empty'>
            <span aria-hidden='true' class='connection-empty-symbol'>
              ◇ ↔ ◇
            </span>
            <h3>
              {person.countryCode
                ? 'Le premier pont reste à construire.'
                : 'Un point de départ pour ce réseau.'}
            </h3>
            <p>
              {person.countryCode
                ? 'Une review ou une aide entre développeurs de pays différents fera apparaître le premier lien ici.'
                : 'Le pays du profil permet de situer ses collaborations.'}
            </p>
          </div>
        )}
      <div class='connection-footer'>
        <div class='collab-legend'>
          {verified && (
            <span>
              <i /> Au moins une preuve GitHub
            </span>
          )}
          {unverified && (
            <span>
              <i class='is-dashed' /> Sans preuve GitHub
            </span>
          )}
          {!entries.length && (
            <span>
              Les pays du réseau apparaîtront au fil du travail partagé.
            </span>
          )}
        </div>
        {active && (
          <span>
            {counted(total, 'lien de travail', 'liens de travail')} · {counted(
              entries.reduce((sum, entry) => sum + entry.people.length, 0),
              'collaborateur',
            )}
          </span>
        )}
      </div>
      {opened && <CountryDrawer entry={opened} />}
    </section>
  )
}
