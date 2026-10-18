import type { HelpRequest } from '/web/fixtures/help.ts'
import type { Login, Person } from '/web/fixtures/people.ts'
import type { Proof } from '/web/fixtures/reputation.ts'

export type WorkItem =
  & {
    other: Login
    direction: 'given' | 'received'
  }
  & ({ type: 'proof'; proof: Proof } | {
    type: 'request'
    request: HelpRequest
  })

const kinds = [
  ['review', 'Reviews de code'],
  ['help', 'Aides confirmées'],
  ['mentor', 'Mentorats'],
  ['oss', 'Contributions open source'],
  ['build', 'Constructions de projets'],
  ['request', 'Demandes d’aide'],
] as const

export type CountryWork = {
  code: string
  count: number
  verified: boolean
  demo: boolean
  people: { login: Login; count: number }[]
  items: WorkItem[]
  breakdown: { label: string; count: number }[]
}

/** Same work sources as linksOf; incoming and outgoing work both count.
 * A request and a proof are separate records, not distinct collaborations. */
export const workByCountry = (
  login: Login,
  people: Record<string, Pick<Person, 'countryCode'>>,
  proofs: readonly Proof[],
  requests: readonly HelpRequest[],
): CountryWork[] => {
  const home = people[login]?.countryCode
  if (!home) return []
  const groups = new Map<string, WorkItem[]>()
  const add = (item: WorkItem) => {
    const code = people[item.other]?.countryCode
    if (!code || code === home || item.other === login) return
    const group = groups.get(code) ?? []
    group.push(item)
    groups.set(code, group)
  }
  for (const proof of proofs) {
    const other = proof.who === login
      ? proof.by
      : proof.by === login
      ? proof.who
      : undefined
    if (other) {
      add({
        type: 'proof',
        proof,
        other,
        direction: proof.who === login ? 'given' : 'received',
      })
    }
  }
  for (const request of requests) {
    const other = request.helper === login
      ? request.author
      : request.author === login
      ? request.helper
      : undefined
    if (other) {
      add({
        type: 'request',
        request,
        other,
        direction: request.helper === login ? 'given' : 'received',
      })
    }
  }
  return [...groups].map(([code, items]) => {
    const collaborators = new Map<Login, number>()
    for (const item of items) {
      collaborators.set(item.other, (collaborators.get(item.other) ?? 0) + 1)
    }
    return {
      code,
      count: items.length,
      verified: items.some((item) =>
        item.type === 'proof' && item.proof.verified
      ),
      demo: items.some((item) =>
        item.type === 'proof' ? item.proof.demo : item.request.demo
      ),
      people: [...collaborators].map(([login, count]) => ({ login, count }))
        .sort((a, b) => b.count - a.count),
      items: [...items].sort((a, b) =>
        (b.type === 'proof' ? b.proof.at : b.request.at) -
        (a.type === 'proof' ? a.proof.at : a.request.at)
      ),
      breakdown: kinds.map(([kind, label]) => ({
        label,
        count: items.filter((item) =>
          (item.type === 'proof' ? item.proof.dimension : 'request') === kind
        ).length,
      })).filter((entry) =>
        entry.count > 0
      ),
    }
  }).sort((a, b) => b.count - a.count)
}
