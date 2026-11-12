import { effect } from '@preact/signals'
import { url } from '@01edu/signal-router'

// Where the page scrolls when one moves about (§12.2), as on a social
// network:
//
// - A main page (the feed, Explore, the help, the notifications…) keeps its
//   place: left for another page and come back to, by the menu or by the
//   back button, it is where one left it.
// - A page opened from another (a profile, a project, a post) starts at its
//   top, and back and forward bring one where one was on it.
// - The tabs of a same page (a project, Explore, a community) leave the
//   scroll alone: one stays at the tabs.
// - The menu item of the page one is on, tapped again, goes back to its
//   top and reads its content again (refresh.ts).

// The browser would restore a position of its own, before the page is drawn
history.scrollRestoration = 'manual'

/** The main pages: reached from the menu, they keep their place */
const MAIN = new Set([
  '/',
  '/explore',
  '/explore/projects',
  '/explore/work',
  '/projects',
  '/help',
  '/communities',
  '/notifications',
  '/messages',
  '/saved',
])

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

/** Forgets where a page was left: it opens at its top next time */
export const forgetScroll = (path = location.pathname) => {
  for (const key of left.keys()) key.startsWith(path) && left.delete(key)
}

let current = address()
let page = pageOf(url.peek().pathname)
effect(() => {
  const path = url.value.pathname
  const next = pageOf(path)
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
    if (!changed) return
    const top = left.get(to)
    if (top !== undefined && (wasBack || MAIN.has(path))) restore(top)
    else scrollTo({ top: 0, behavior: 'instant' })
  }, 0)
})
