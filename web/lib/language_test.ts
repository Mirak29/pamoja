import { assertEquals } from 'jsr:@std/assert@^1.0.13'
import { parseHTML } from 'npm:linkedom@0.18.12'
import { h, options, render } from 'preact'
import { useState } from 'preact/hooks'

Deno.test('language: English render, switching and clicks preserve component state', async () => {
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
    const { language, setLanguagePreference } = await import('./language.ts')
    let received = ''
    const Child = ({ children }: { children: string }) => {
      received = children
      const [count, setCount] = useState(0)
      return h(
        'button',
        {
          onClick: () => setCount(count + 1),
          title: 'Accueil',
        },
        children,
        count,
        h('span', null, 'Message original écrit par un membre'),
      )
    }
    const App = () => {
      language.value
      return h(Child, { children: 'Accueil' })
    }
    render(h(App, null), root)
    assertEquals(root.textContent, 'Home0Message original écrit par un membre')
    assertEquals(received, 'Accueil')
    assertEquals(document.documentElement.lang, 'en')
    setLanguagePreference('fr')
    await flush()
    assertEquals(
      root.textContent,
      'Accueil0Message original écrit par un membre',
    )
    root.querySelector('button')!.click()
    await flush()
    assertEquals(
      root.textContent,
      'Accueil1Message original écrit par un membre',
    )
    setLanguagePreference('en')
    await flush()
    assertEquals(root.textContent, 'Home1Message original écrit par un membre')
    assertEquals(root.querySelector('button')!.getAttribute('title'), 'Home')
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
    const { t, translate } = await import('./language.ts')
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
