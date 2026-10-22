import { assertEquals } from 'jsr:@std/assert@^1.0.13'
import { parseHTML } from 'npm:linkedom@0.18.12'
import { h, options, render } from 'preact'
import { signal } from '@preact/signals'

Deno.test('language: English render, switching, member content and screens fed by mutated data', async () => {
  const { document } = parseHTML('<html><body><main></main></body></html>')
  const storage = new Map<string, string>()
  const replacements = {
    document,
    navigator: { languages: ['en-US'], language: 'en-US' },
    localStorage: {
      getItem: (key: string) => storage.get(key) ?? null,
      setItem: (key: string, value: string) => storage.set(key, value),
      removeItem: (key: string) => storage.delete(key),
    },
  }
  const originals = Object.getOwnPropertyDescriptors(globalThis)
  const previousVNode = options.vnode
  for (const [key, value] of Object.entries(replacements)) {
    Object.defineProperty(globalThis, key, { value, configurable: true })
  }
  const root = document.querySelector('main')!
  const flush = () => new Promise((resolve) => setTimeout(resolve, 50))
  try {
    const { language, setLanguagePreference, t, translate } = await import(
      './language.ts'
    )

    // Data mutated in place, as the fixtures are, and a signal that says so
    const data = { count: 0 }
    const changed = signal(0)
    let received = ''
    const Child = (
      { label, data }: { label: string; data: { count: number } },
    ) => {
      received = label
      return h(
        'button',
        { title: 'Accueil' },
        label,
        data.count,
        h('span', null, 'Message original écrit par un membre'),
      )
    }
    const Page = () => {
      changed.value
      return h(Child, { label: 'Accueil', data })
    }
    // As web/app.tsx: the tree is built again when the language changes
    const App = () => h(Page, { key: language.value })

    render(h(App, null), root)
    assertEquals(root.textContent, 'Home0Message original écrit par un membre')
    // A component prop is content: never translated
    assertEquals(received, 'Accueil')
    assertEquals(root.querySelector('button')!.getAttribute('title'), 'Home')
    assertEquals(document.documentElement.lang, 'en')

    // QA-16: a child with the same props still shows the mutated data
    data.count = 1
    changed.value++
    await flush()
    assertEquals(root.textContent, 'Home1Message original écrit par un membre')

    setLanguagePreference('fr')
    await flush()
    assertEquals(
      root.textContent,
      'Accueil1Message original écrit par un membre',
    )
    setLanguagePreference('en')
    await flush()
    assertEquals(root.textContent, 'Home1Message original écrit par un membre')

    // Another tab chose French: the storage holds it when the event comes
    storage.set('language', 'fr')
    const event = new Event('storage')
    Object.defineProperties(event, {
      key: { value: 'language' },
      newValue: { value: 'fr' },
    })
    globalThis.dispatchEvent(event)
    await flush()
    assertEquals(
      root.textContent,
      'Accueil1Message original écrit par un membre',
    )
    setLanguagePreference('system')
    await flush()
    assertEquals(language.value, 'en')
    assertEquals(root.textContent, 'Home1Message original écrit par un membre')
    assertEquals(storage.has('language'), false)

    // Only whole sentences of the interface: a member's text that begins
    // like one of them stays as written
    assertEquals(translate('Accueil'), 'Home')
    assertEquals(translate('Tu as vu la démo ?'), 'Tu as vu la démo ?')
    assertEquals(translate('Dans deux semaines'), 'Dans deux semaines')
    // Sentences with values: the words are translated, never the values
    const name = 'Accueil'
    assertEquals(t`Écrire à ${name}`, 'Write to Accueil')
    assertEquals(
      t`Déplacer « ${'Tests'} » vers ${'Fait'}`,
      'Move “Tests” to Fait',
    )
    setLanguagePreference('fr')
    assertEquals(t`Écrire à ${name}`, 'Écrire à Accueil')
  } finally {
    render(null, root)
    options.vnode = previousVNode
    for (const key of Object.keys(replacements)) {
      if (originals[key]) Object.defineProperty(globalThis, key, originals[key])
      else Reflect.deleteProperty(globalThis, key)
    }
  }
})
