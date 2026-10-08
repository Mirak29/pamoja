import { communities } from '/web/fixtures/communities.ts'
import { type Login, people, type Person } from '/web/fixtures/people.ts'

// Deterministic matching of a help request (cahier des charges §7.3):
// skills 45, help type 15, confirmed helps 15, proximity 10, availability 10,
// affinity 5. Computed by the server with PAM-209, here on the fixtures.

/** Skills close enough to count as half a match */
const nearSkills: Record<string, string[]> = {
  SQLite: ['PostgreSQL', 'SQL'],
  PostgreSQL: ['SQLite', 'SQL'],
  SQL: ['SQLite', 'PostgreSQL'],
  Concurrency: ['Go', 'Kubernetes'],
  Go: ['Backend'],
  Backend: ['Go', 'TypeScript'],
  React: ['UI', 'TypeScript'],
  TypeScript: ['React', 'Deno'],
  CI: ['Docker', 'Kubernetes'],
  Docker: ['Kubernetes', 'CI'],
  Kubernetes: ['Docker', 'CI'],
  Security: ['Go'],
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
  if (!exact.length && !near.length) return { total: 0, criteria: [] }

  const criteria: Criterion[] = [{
    label: exact.length ? `Skills : ${exact.join(', ')}` : 'Skills proches',
    points: Math.round(
      45 * (exact.length + near.length * 0.5) / request.skills.length,
    ),
  }]
  if (person.helpTypes.includes(request.type)) {
    criteria.push({
      label: `Accepte les demandes « ${request.type} »`,
      points: 15,
    })
  }
  const confirmed = Math.min(15, Math.round(person.confirmedHelps / 14 * 15))
  if (confirmed) {
    const unit = request.type === 'Review de code' ? 'review' : 'aide'
    const plural = person.confirmedHelps > 1 ? 's' : ''
    criteria.push({
      label: `${person.confirmedHelps} ${unit}${plural} confirmée${plural}`,
      points: confirmed,
    })
  }
  if (near.length) {
    criteria.push({
      label: `Proximité : ${
        near.map((skill) =>
          `${skill} ≈ ${
            nearSkills[skill].find((other) => person.skills.includes(other))
          }`
        ).join(', ')
      }`,
      points: 10,
    })
  }
  criteria.push(
    person.available
      ? { label: person.openTo ?? 'Disponible cette semaine', points: 10 }
      : { label: 'Peu disponible', points: 4 },
  )
  const author = people[request.author]
  const shared = person.communities.find((slug) =>
    author.communities.includes(slug)
  )
  if (shared) {
    criteria.push({
      label: `Communauté ${
        communities.find((c) => c.slug === shared)?.name
      } en commun`,
      points: 5,
    })
  } else if (author.countryCode === person.countryCode) {
    criteria.push({ label: `Même pays (${person.country})`, points: 5 })
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
    .filter((m) => m.total > 0)
    .sort((a, b) => b.total - a.total)
  const promising = ranked.find((m) => m.person.confirmedHelps < 3)
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
