import { assert, assertEquals } from 'jsr:@std/assert@^1.0.13'
import { parseHTML } from 'npm:linkedom@0.18.12'

// The Collaboration Map and Graph hold a network of a thousand people
// without drawing it all (§9.3)
Deno.test('collaboration views: a thousand collaborators, a page at a time', async () => {
  const { document, window } = parseHTML(
    '<html><head><base href="http://localhost/"></head><body></body></html>',
  )
  const replacements = {
    document,
    location: new URL('http://localhost/'),
    history: window.history ?? { pushState() {}, replaceState() {} },
    navigator: { languages: ['fr-FR'], language: 'fr-FR' },
    localStorage: { getItem: () => null, setItem() {}, removeItem() {} },
    sessionStorage: { getItem: () => null, setItem() {}, removeItem() {} },
  }
  const originals = Object.getOwnPropertyDescriptors(globalThis)
  for (const [key, value] of Object.entries(replacements)) {
    Object.defineProperty(globalThis, key, { value, configurable: true })
  }
  try {
    const { hearOf } = await import('/web/fixtures/people.ts')
    const { proofs } = await import('/web/fixtures/reputation.ts')
    const { linkedCountries, peopleMatching } = await import(
      './collaboration-map.tsx'
    )
    const { networkOf, peopleOf, starOf } = await import(
      './collaboration-graph.tsx'
    )
    // A thousand developers, most in Kenya, who reviewed the work of Abdou
    // on forty projects, the first ones more often
    const start = proofs.length
    for (let i = 0; i < 1000; i++) {
      const login = `dev${i}`
      hearOf(login, `Dev ${i}`, i < 600 ? 'KE' : i < 900 ? 'NG' : 'GH')
      for (let k = 0; k <= i % 3; k++) {
        proofs.push({
          id: `scale-${i}-${k}`,
          who: 'abdou',
          by: login as never,
          dimension: 'review',
          title: 'Review',
          project: `scale-${(i + k) % 40}` as never,
          projectName: `Projet ${(i + k) % 40}`,
          at: Date.now(),
          verified: true,
          demo: true,
        })
      }
    }

    // Map: each country knows who, the strongest links first, searchable
    const kenya = linkedCountries('abdou').find(([code]) => code === 'KE')![1]
    const scale = kenya.people.filter((link) => link.login.startsWith('dev'))
    assertEquals(scale.length, 600)
    const counts = kenya.people.map((link) => link.count)
    assertEquals(counts, [...counts].sort((a, b) => b - a))
    // « Dev 42 » finds Dev 42 and Dev 420 to 429, all in Kenya
    const found = peopleMatching(kenya.people, 'dev 42')
    assertEquals(found.length, 11)
    assert(found.every((link) => link.login.startsWith('dev42')))

    // Graph: a star of at most six places and fourteen people
    const network = networkOf('abdou', { only: null, days: null })
    assert(network.mates.length >= 1000)
    const star = starOf(network.mates, network.places, null)
    assert(star.hubs.length <= 6)
    assertEquals(star.points.length, 14)
    // Each place says how many people it holds, not only those drawn
    const first = star.hubs[0]
    assertEquals(first.count, network.places[0].people)
    assert(first.count > 14)

    // Focused, a place brings its own people, the most work there first
    const focused = starOf(network.mates, network.places, first.key)
    assertEquals(focused.points.length, 14)
    assert(focused.points.every((point) => point.byPlace[first.key]))
    const here = focused.points.map((point) => point.here)
    assertEquals(here, [...here].sort((a, b) => b - a))
    assertEquals(
      peopleOf(network.mates, first.key, star.main).length,
      first.count,
    )
    // The others place holds the people whose main place is off the star
    assert(
      peopleOf(network.mates, 'others', star.main)
        .every((mate) => !star.main.includes(mate.places[0])),
    )
    proofs.splice(start)
  } finally {
    for (const key of Object.keys(replacements)) {
      if (originals[key]) Object.defineProperty(globalThis, key, originals[key])
      else delete (globalThis as Record<string, unknown>)[key]
    }
  }
})
