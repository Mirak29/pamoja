import { assertEquals } from 'jsr:@std/assert@^1.0.13'
import type { HelpRequest } from '/web/fixtures/help.ts'
import type { Proof } from '/web/fixtures/reputation.ts'
import { workByCountry } from './collaboration-data.ts'

const people = {
  abdou: { countryCode: 'SN' },
  moussa: { countryCode: 'CI' },
  awa: { countryCode: 'SN' },
  kofi: { countryCode: 'GH' },
  zeinab: { countryCode: 'CI' },
  yao: { countryCode: '' },
}
const proof = (extra: Partial<Proof> = {}): Proof => ({
  id: 'p1',
  who: 'abdou',
  by: 'moussa',
  dimension: 'review',
  title: 'Review',
  at: 1,
  verified: false,
  demo: true,
  ...extra,
})
const request = (extra: Partial<HelpRequest> = {}): HelpRequest => ({
  id: 'h1',
  author: 'abdou',
  helper: 'moussa',
  type: 'Review de code',
  title: 'Aide',
  description: '',
  skills: [],
  level: '',
  duration: '',
  status: 'accepted',
  at: 2,
  demo: true,
  ...extra,
})

Deno.test('Carte : les liens donnés et reçus se retrouvent dans le détail et le total', () => {
  const [country] = workByCountry('abdou', people, [
    proof(),
    proof({
      id: 'p2',
      who: 'moussa',
      by: 'abdou',
      verified: true,
      demo: false,
    }),
  ], [request()])
  assertEquals(country.code, 'CI')
  assertEquals(country.count, 3)
  assertEquals(country.people, [{ login: 'moussa', count: 3 }])
  assertEquals(country.items.map((item) => item.direction), [
    'received',
    'given',
    'received',
  ])
  assertEquals(country.breakdown, [{ label: 'Reviews de code', count: 2 }, {
    label: 'Demandes d’aide',
    count: 1,
  }])
  assertEquals(country.verified, true)
  assertEquals(country.demo, true)
})

Deno.test('Carte : une demande associée à une preuve reste un élément distinct, sans seconde preuve', () => {
  const [country] = workByCountry('abdou', people, [proof({ help: 'h1' })], [
    request({ status: 'completed' }),
  ])
  assertEquals(country.count, 2)
  assertEquals(country.items.filter((item) => item.type === 'proof').length, 1)
  assertEquals(
    country.items.filter((item) => item.type === 'request').length,
    1,
  )
  assertEquals(country.verified, false)
})

Deno.test('Carte : pays du profil, pays absent, auto-lien et demandes sans aidant sont exclus', () => {
  const result = workByCountry('abdou', people, [
    proof({ by: 'awa' }),
    proof({ by: 'yao' }),
    proof({ by: 'abdou' }),
    proof({ who: 'kofi', by: 'zeinab' }),
  ], [request({ helper: undefined }), request({ helper: 'awa' })])
  assertEquals(result, [])
  assertEquals(
    workByCountry('yao', people, [proof({ who: 'yao', by: 'moussa' })], []),
    [],
  )
})

Deno.test('Carte : les personnes sont regroupées par pays et les totaux correspondent à leurs éléments', () => {
  const result = workByCountry('abdou', people, [
    proof({ by: 'kofi', dimension: 'oss' }),
    proof({ by: 'moussa' }),
    proof({ by: 'zeinab', dimension: 'mentor' }),
  ], [])
  assertEquals(result.map((country) => [country.code, country.count]), [[
    'CI',
    2,
  ], ['GH', 1]])
  assertEquals(result[0].people.length, 2)
  for (const country of result) {
    assertEquals(country.items.length, country.count)
    assertEquals(
      country.breakdown.reduce((sum, entry) => sum + entry.count, 0),
      country.count,
    )
    assertEquals(
      country.people.reduce((sum, entry) => sum + entry.count, 0),
      country.count,
    )
  }
})

Deno.test('Carte : une aide proposée compte, mais son journal ne crée pas de preuve GitHub', () => {
  const [country] = workByCountry('abdou', people, [], [
    request({
      author: 'kofi',
      helper: 'abdou',
      demo: false,
      log: [{ text: 'Review détectée', at: 2, verified: true }],
    }),
  ])
  assertEquals(country.code, 'GH')
  assertEquals(country.count, 1)
  assertEquals(country.items[0].direction, 'given')
  assertEquals(country.verified, false)
  assertEquals(country.demo, false)
})
