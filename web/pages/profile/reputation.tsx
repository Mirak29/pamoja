import { useState } from 'preact/hooks'
import { counted } from '/web/lib/plural.ts'
import { A } from '@01edu/signal-router'
import type { Login } from '/web/fixtures/people.ts'
import {
  type Badge,
  badgesOf,
  dimensions,
  levelNames,
  nextThreshold,
  proofsOf,
} from '/web/fixtures/reputation.ts'
import { Progress } from '/web/ui/progress.tsx'
import { BadgeEmblem } from './badge-emblem.tsx'

/** The five dimensions, each with its count of proofs (§8.1) */
export const dimensionsOf = (login: Login) => {
  const mine = proofsOf(login)
  return dimensions.map(([key, label]) => {
    const list = mine.filter((p) => p.dimension === key)
    const verified = list.filter((p) => p.verified).length
    return {
      key,
      label,
      count: list.length,
      next: nextThreshold(key, list.length),
      summary: counted(list.length, 'preuve') +
        (verified ? ` · ${counted(verified, 'vérifiée')} par GitHub` : ''),
    }
  })
}

/**
 * Bars of the five dimensions. On the full profile each one opens its
 * proofs; on the passport they are read only.
 */
export const DimensionBars = (
  { login, readOnly }: { login: Login; readOnly?: boolean },
) => (
  <>
    {dimensionsOf(login).map(({ key, label, count, next, summary }) => {
      const content = (
        <>
          <span class='flex justify-between gap-2 text-[14px]'>
            <span class='font-semibold'>{label}</span>
            <span class='font-mono text-data tabular-nums'>{count}</span>
          </span>
          <Progress value={count} max={next} label={label} />
          <span class='text-[12px] text-ink-muted'>
            {summary}
            {!readOnly && ' · Voir les preuves'}
          </span>
        </>
      )
      return readOnly
        ? <div key={key} class='flex flex-col gap-1.5'>{content}</div>
        : (
          <A
            key={key}
            params={{ dialog: `preuves-${key}` }}
            class='flex w-full flex-col gap-2 border-t border-line py-3.5 text-ink no-underline hover:text-indigo hover:no-underline'
          >
            {content}
          </A>
        )
    })}
  </>
)

export const levelName = (badge: Badge) =>
  badge.level < 0 ? 'En route' : levelNames[badge.level]

const BadgeSeal = ({ badge }: { badge: Badge }) => (
  <span class='badge-seal' data-level={badge.level}>
    <BadgeEmblem badge={badge} />
    <span class='badge-rank'>{levelName(badge)}</span>
  </span>
)

/** The same collection on the full profile and the public passport. */
export const BadgeList = (
  { login, compact }: { login: Login; compact?: boolean },
) => {
  const badges = badgesOf(login)
  const [selected, setSelected] = useState('')
  const unlocked = badges.filter((badge) => badge.level >= 0)
  const upcoming = badges.filter((badge) => badge.level < 0)
  const active = badges.find((badge) => badge.name === selected) ??
    unlocked[0] ?? badges[0]
  const earned = unlocked.length
  if (!active) {
    return (
      <div class='collection-empty'>
        <span class='font-display text-[18px] font-semibold'>
          Le premier badge se construit ensemble.
        </span>
        <span>
          Une review utile, une aide confirmée, un projet livré : chaque
          contribution compte.
        </span>
      </div>
    )
  }
  if (compact) {
    const featured = [...unlocked].sort((a, b) =>
      b.level - a.level || b.count - a.count
    ).slice(0, 3)
    return featured.length
      ? (
        <div class='badge-compact'>
          <div class='trophy-shelf trophy-shelf-compact'>
            {featured.map((badge) => (
              <div key={badge.name} class='trophy-item'>
                <BadgeSeal badge={badge} />
                <span class='badge-name'>{badge.name}</span>
              </div>
            ))}
          </div>
          <span class='trophy-footnote'>
            Des contributions, reconnues par les autres.
          </span>
        </div>
      )
      : <div class='collection-empty'>Le premier trophée est en chemin.</div>
  }
  const demo = proofsOf(login).some((proof) => proof.demo)
  return (
    <div class='badge-collection'>
      <div class='collection-intro'>
        <div>
          <h2>Une collection construite ensemble.</h2>
          <p>Chaque trophée raconte une contribution.</p>
        </div>
        <span class='collection-counter'>
          <b>{earned}</b> débloqué{earned > 1 ? 's' : ''}
        </span>
      </div>
      {earned > 0
        ? (
          <div class='trophy-shelf' role='group' aria-label='Trophées obtenus'>
            {unlocked.map((badge) => (
              <button
                key={badge.name}
                type='button'
                class='trophy-item'
                aria-pressed={badge.name === active.name}
                onClick={() => setSelected(badge.name)}
              >
                <BadgeSeal badge={badge} />
                <span class='badge-name'>{badge.name}</span>
                <span class='trophy-selection' aria-hidden='true'>
                  {badge.name === active.name ? 'En détail ↓' : 'Découvrir ↗'}
                </span>
              </button>
            ))}
          </div>
        )
        : (
          <div class='collection-empty'>
            <strong>Une place attend ton premier trophée.</strong>
            <span>
              Les contributions en cours ci-dessous te rapprochent du niveau
              Bronze.
            </span>
          </div>
        )}
      {upcoming.length > 0 && (
        <div class='trophy-upcoming'>
          <div class='trophy-upcoming-heading'>
            <span class='collection-label'>En cours de construction</span>
            <span>
              {counted(upcoming.length, 'badge en route', 'badges en route')}
            </span>
          </div>
          <div
            class='trophy-goals'
            role='group'
            aria-label='Badges en progression'
          >
            {upcoming.map((badge) => (
              <button
                key={badge.name}
                type='button'
                class='trophy-goal'
                aria-pressed={badge.name === active.name}
                onClick={() => setSelected(badge.name)}
              >
                <span class='trophy-goal-art'>
                  <BadgeEmblem badge={badge} />
                </span>
                <span class='trophy-goal-content'>
                  <strong>{badge.name}</strong>
                  <span>{badge.nextLabel}</span>
                  <Progress
                    value={badge.count}
                    max={badge.next!}
                    label={`${badge.name} · ${badge.nextLabel}`}
                    thin
                  />
                </span>
                <span class='trophy-goal-count'>
                  {badge.count}
                  <small>/ {badge.next}</small>
                </span>
              </button>
            ))}
          </div>
        </div>
      )}
      <div class='badge-detail' aria-live='polite' aria-atomic='true'>
        <div class='badge-detail-heading'>
          <div>
            <span class='collection-label'>
              {active.next ? 'Prochain objectif' : 'Parcours complété'}
            </span>
            <h3>{active.name}</h3>
            <p>{active.nextLabel}</p>
          </div>
          <span class='badge-detail-number'>
            {active.count}
            <small>/ {active.next ?? active.count}</small>
          </span>
        </div>
        <ol class='badge-levels' aria-label={`Paliers de ${active.name}`}>
          {levelNames.map((name, i) => (
            <li
              key={name}
              data-reached={i <= active.level}
              aria-current={i === active.level ? 'step' : undefined}
            >
              <span aria-hidden='true'>
                {i <= active.level ? '✓' : String(i + 1).padStart(2, '0')}
              </span>
              {name}
            </li>
          ))}
        </ol>
        <div class='badge-detail-footer'>
          <span>
            {demo
              ? 'Progression sur données de démonstration.'
              : 'Progression calculée depuis les contributions.'}
          </span>
          {active.dimension
            ? (
              <A params={{ dialog: `preuves-${active.dimension}` }}>
                Voir les preuves <span aria-hidden='true'>↗</span>
              </A>
            )
            : (
              <span>
                Collaborateurs de pays distincts, hors pays du profil.
              </span>
            )}
        </div>
      </div>
    </div>
  )
}
