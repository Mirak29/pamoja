import { effect } from '@preact/signals'
import { url } from '@01edu/signal-router'

// Where the page scrolls when one moves about (§12.2). The app is a single
// page: without this, a new page opened at the scroll of the one before, a
// profile at the middle of the list it was picked from.
//
// - A new page starts at its top.
// - Back and forward bring one where one was on that page.
// - The tabs of a same page (a project, Explore, a community) leave the
//   scroll alone: one stays at the tabs.

// The browser would restore a position of its own, before the page is drawn
history.scrollRestoration = 'manual'

/** What counts as one page: its tabs share its scroll */
const pageOf = (path: string) => {
  const [section = '', item = ''] = path.replace(/^\/+/, '').split('/')
  return ['project', 'community'].includes(section)
    ? `${section}/${item}`
    : section === 'explore'
    ? section
    : path
}

// Where each page was left, by its address
const left = new Map<string, number>()
const address = () => `${location.pathname}${location.search}`

let back = false
// Only the steps of the browser: the router sends an event of its own at
// each navigation, which is not a step back
addEventListener('popstate', (event) => {
  if (event.isTrusted) back = true
})

// A page fills as its data comes: tried until it is tall enough, a second
// at most
const restore = (top: number, tries = 20) => {
  scrollTo({ top, behavior: 'instant' })
  if (tries && Math.abs(scrollY - top) > 2) {
    setTimeout(() => restore(top, tries - 1), 50)
  }
}

let current = address()
let page = pageOf(url.peek().pathname)
effect(() => {
  const next = pageOf(url.value.pathname)
  const changed = next !== page
  page = next
  // The page being left is still drawn: its scroll is the one to keep
  left.set(current, scrollY)
  current = address()
  const to = current
  // Once the new page is drawn and every listener of the navigation ran:
  // whether it was a step back is known by then, whatever their order. A
  // timer, not a frame: a tab in the background draws no frame
  setTimeout(() => {
    const wasBack = back
    back = false
    if (wasBack) {
      const top = left.get(to)
      top !== undefined && restore(top)
    } else if (changed) {
      scrollTo({ top: 0, behavior: 'instant' })
    }
  }, 0)
})
