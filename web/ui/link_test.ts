import { assertEquals } from 'jsr:@std/assert@^1.0.13'
import { parseHTML } from 'npm:linkedom@0.18.12'
import { h, render } from 'preact'

// A finger that lands on a link to scroll the page does not open it: only
// a tap does (the click). A mouse still goes at its press.

Deno.test('link: a mouse goes at its press, a finger at its tap, never on a scroll', async () => {
  const { document, Event: PageEvent } = parseHTML(
    '<html><head><base href="http://localhost/"></head><body><main></main></body></html>',
  )
  // The history of the page: the router pushes, then reads the address
  let address = new URL('http://localhost/')
  const pushed: string[] = []
  const history = {
    state: null as unknown,
    pushState(state: unknown, _: string, to: string) {
      this.state = state
      address = new URL(to, address)
      pushed.push(address.pathname)
    },
    replaceState(state: unknown, _: string, to?: string) {
      this.state = state
      if (to) address = new URL(to, address)
    },
  }
  const location = {
    get href() {
      return address.href
    },
    get pathname() {
      return address.pathname
    },
    get origin() {
      return address.origin
    },
  }
  const replacements = { document, location, history }
  const originals = Object.getOwnPropertyDescriptors(globalThis)
  for (const [key, value] of Object.entries(replacements)) {
    Object.defineProperty(globalThis, key, { value, configurable: true })
  }
  const root = document.querySelector('main')!
  try {
    const { A } = await import('./link.tsx')

    // An event as the browser sends it: the press reaches the window first
    const press = (link: Element, pointerType: string) => {
      const event = new PageEvent('pointerdown', {
        bubbles: true,
        cancelable: true,
      })
      Object.assign(event, { pointerType, button: 0 })
      globalThis.dispatchEvent(
        Object.assign(new Event('pointerdown'), { pointerType }),
      )
      link.dispatchEvent(event)
      return event
    }
    const click = (link: Element, { detail = 1, x = 12 } = {}) => {
      const event = new PageEvent('click', { bubbles: true, cancelable: true })
      Object.assign(event, { button: 0, detail, clientX: x, clientY: x })
      link.dispatchEvent(event)
      return event
    }
    let asked = 0
    let stay = false
    const show = (href: string) => {
      render(null, root)
      render(
        h(A, {
          href,
          onNavigate: () => {
            asked++
            return stay ? false : undefined
          },
        }, 'lien'),
        root,
      )
      pushed.length = 0
      asked = 0
      return root.querySelector('a')!
    }

    // A finger lands and scrolls: no click comes, nothing opens
    let link = show('projects')
    press(link, 'touch')
    assertEquals([pushed, asked], [[], 0])
    // A tap: the click opens the page, once
    press(link, 'touch')
    click(link)
    assertEquals([pushed, asked], [['/projects'], 1])

    // A pen as a finger
    link = show('help')
    press(link, 'pen')
    assertEquals(pushed, [])
    click(link)
    assertEquals(pushed, ['/help'])

    // A mouse at its press, and its click does not go a second time
    link = show('explore')
    press(link, 'mouse')
    assertEquals(pushed, ['/explore'])
    click(link)
    assertEquals([pushed, asked], [['/explore'], 1])

    // The keyboard (Entrée): a click without a pointer
    link = show('communities')
    click(link, { detail: 0, x: 0 })
    assertEquals(pushed, ['/communities'])

    // The link may keep the page where it is (a menu item on its page)
    stay = true
    link = show('projects')
    press(link, 'mouse')
    press(link, 'touch')
    click(link)
    assertEquals([pushed, asked], [[], 2])
    stay = false

    // Another site: the browser's own link, untouched
    link = show('https://github.com/Mirak29/pamoja')
    press(link, 'touch')
    const toGitHub = click(link)
    assertEquals([pushed, asked, toGitHub.defaultPrevented], [[], 0, false])
  } finally {
    render(null, root)
    for (const key of Object.keys(replacements)) {
      if (originals[key]) Object.defineProperty(globalThis, key, originals[key])
      else Reflect.deleteProperty(globalThis, key)
    }
  }
})
