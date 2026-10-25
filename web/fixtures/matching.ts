import { communities } from '/web/fixtures/communities.ts'
import {
  type Login,
  people,
  type Person,
  personOf,
} from '/web/fixtures/people.ts'
import { confirmedHelpsOf } from '/web/fixtures/reputation.ts'
import { counted } from '/web/lib/plural.ts'
import { t, translate } from '/web/lib/language.ts'

// Deterministic matching of a help request (cahier des charges §7.3):
// skills 45, help type 15, confirmed helps 15, semantic proximity 10,
// availability 10, affinity 5. Computed by the server with PAM-209, here on
// the fixtures.

// Stands in for the embeddings of PAM-311: only skills that really overlap.
// A required skill one has not, but close to one of theirs, is proximity,
// never a skill point.
const nearSkills: Record<string, string[]> = {
  SQLite: ['PostgreSQL', 'SQL'],
  PostgreSQL: ['SQLite', 'SQL'],
  SQL: ['SQLite', 'PostgreSQL'],
  Go: ['Backend'],
  Backend: ['Go'],
  CI: ['Docker', 'Kubernetes'],
  Docker: ['Kubernetes', 'CI'],
  Kubernetes: ['Docker', 'CI'],
}

/** Below this score a developer is not notified */
export const MIN_SCORE = 50

export type Criterion = { label: string; points: number }

type Request = { author: Login; type: string; skills: string[] }

export const match = (person: Person, request: Request) => {
  const exact = request.skills.filter((skill) => person.skills.includes(skill))
  const near = request.skills.filter((skill) =>
    !person.skills.includes(skill) &&
    (nearSkills[skill] ?? []).some((other) => person.skills.includes(other))
  )
  // Without one required skill, a developer is never notified
  if (!exact.length) return { total: 0, criteria: [] }

  const criteria: Criterion[] = [{
    label: t`Skills : ${
      exact.join(', ')
    } · ${exact.length} sur ${request.skills.length}`,
    points: Math.round(45 * exact.length / request.skills.length),
  }]
  if (person.helpTypes.includes(request.type)) {
    criteria.push({
      label: t`Accepte les demandes « ${translate(request.type)} »`,
      points: 15,
    })
  }
  const review = request.type === 'Review de code'
  const helps = confirmedHelpsOf(
    person.login as Login,
    review ? 'review' : undefined,
  )
  const confirmed = Math.min(15, Math.round(helps / 14 * 15))
  if (confirmed) {
    criteria.push({
      label: review
        ? counted(helps, 'review confirmée', 'reviews confirmées')
        : counted(helps, 'aide confirmée', 'aides confirmées'),
      points: confirmed,
    })
  }
  if (near.length) {
    criteria.push({
      label: t`Proximité : ${
        near.map((skill) =>
          `${skill} ≈ ${
            nearSkills[skill].find((other) => person.skills.includes(other))
          }`
        ).join(', ')
      }`,
      points: Math.round(10 * near.length / request.skills.length),
    })
  }
  criteria.push(
    person.available
      ? { label: translate('Disponible cette semaine'), points: 10 }
      : { label: translate('Peu disponible'), points: 4 },
  )
  // A request read from the API may come from someone the pages do not know
  const author = personOf(request.author)
  const shared = person.communities.find((slug) =>
    author.communities.includes(slug)
  )
  if (shared) {
    criteria.push({
      label: t`Communauté ${
        communities.find((c) => c.slug === shared)?.name
      } en commun`,
      points: 5,
    })
  }
  return {
    total: Math.min(100, criteria.reduce((sum, c) => sum + c.points, 0)),
    criteria,
  }
}

export type Matched = {
  login: Login
  score: number
  criteria: Criterion[]
  /** Seat kept for a promising profile with fewer than 3 confirmed helps */
  promising: boolean
}

/** The 5 best profiles, one of them promising, then the next wave */
export const waves = (request: Request): [Matched[], Matched[]] => {
  const ranked = (Object.values(people) as Person[])
    .filter((person) => person.login !== request.author)
    .map((person) => ({ person, ...match(person, request) }))
    .filter((m) => m.total >= MIN_SCORE)
    .sort((a, b) => b.total - a.total)
  const promising = ranked.find((m) =>
    confirmedHelpsOf(m.person.login as Login) < 3
  )
  const rest = ranked.filter((m) => m !== promising)
  const size = promising ? 4 : 5
  const toMatched = (m: typeof ranked[number], isPromising = false) => ({
    login: m.person.login as Login,
    score: m.total,
    criteria: m.criteria,
    promising: isPromising,
  })
  return [
    [
      ...rest.slice(0, size).map((m) => toMatched(m)),
      ...(promising ? [toMatched(promising, true)] : []),
    ],
    rest.slice(size, size + 5).map((m) => toMatched(m)),
  ]
}
