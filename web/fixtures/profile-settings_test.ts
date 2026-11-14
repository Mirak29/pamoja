import { assertEquals } from 'jsr:@std/assert@^1.0.13'
import { parseHTML } from 'npm:linkedom@0.18.12'

// The sections of a profile read from the server (PAM-302, §9.2)
Deno.test('profile settings: a profile shows all its sections, in its order', async () => {
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
    const { completeOrder, profileSections } = await import(
      './profile-settings.ts'
    )
    const all = profileSections.map(([key]) => key)
    // Never ordered: the server says [] and the default order applies
    assertEquals(completeOrder([]), all)
    // Ordered: its order first, then any section it does not name
    const ordered = completeOrder(['badges', 'reputation'])
    assertEquals(ordered.slice(0, 2), ['badges', 'reputation'])
    assertEquals(ordered.length, all.length)
    // An unknown or repeated key shows neither twice nor as a section
    assertEquals(completeOrder(['badges', 'badges', 'nope']).length, all.length)
    assertEquals(completeOrder(['badges', 'nope'])[0], 'badges')
  } finally {
    for (const key of Object.keys(replacements)) {
      if (originals[key]) Object.defineProperty(globalThis, key, originals[key])
      else Reflect.deleteProperty(globalThis, key)
    }
  }
})
