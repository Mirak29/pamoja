import { assertEquals } from 'jsr:@std/assert@^1.0.13'
import { parseHTML } from 'npm:linkedom@0.18.12'
import { h, render } from 'preact'
import { signal } from '@preact/signals'

Deno.test('lazy page: drawn once its code is in, however early it came', async () => {
  const { document } = parseHTML('<html><body><main></main></body></html>')
  const originals = Object.getOwnPropertyDescriptors(globalThis)
  const replacements = {
    document,
    sessionStorage: {
      getItem: () => null,
      setItem: () => {},
      removeItem: () => {},
    },
  }
  for (const [key, value] of Object.entries(replacements)) {
    Object.defineProperty(globalThis, key, { value, configurable: true })
  }
  const root = document.querySelector('main')!
  const wait = (ms: number) => new Promise((done) => setTimeout(done, ms))
  try {
    const { lazyPage } = await import('./lazy-page.ts')
    const page = (text: string) => () => h('p', null, text)

    // Read on demand: nothing, then the page
    const Slow = lazyPage(() => wait(50).then(() => page('lente')))
    render(h(Slow, null), root)
    assertEquals(root.innerHTML, '')
    await wait(200)
    assertEquals(root.innerHTML, '<p>lente</p>')

    // Preloaded as the app starts: its code comes after the page is drawn
    // empty, before the effect runs. As app.tsx, under a parent that reads
    // a signal (the session).
    render(null, root)
    const Early = lazyPage(() => Promise.resolve(page('tôt')))
    const session = signal(true)
    const Pages = () => session.value ? h(Early, null) : null
    render(h(Pages, null), root)
    Early.preload()
    await wait(200)
    assertEquals(root.innerHTML, '<p>tôt</p>')
  } finally {
    render(null, root)
    for (const key of Object.keys(replacements)) {
      if (originals[key]) Object.defineProperty(globalThis, key, originals[key])
      else Reflect.deleteProperty(globalThis, key)
    }
  }
})
