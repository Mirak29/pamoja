import { effect } from '@preact/signals'
import { url } from '@01edu/signal-router'
import { tabMemory } from '/web/lib/tab-memory.ts'

// Where the page scrolls when one moves about (§12.2), as on a social
// network:
//
// - Back, forward and a reload bring one where one was, as a browser does:
//   each entry of the history has its own position.
// - A main page (the feed, Explore, the help…) also keeps its place when
//   one comes back to it from the menu.
// - A page opened from another (a profile, a project, a post) starts at its
//   top; the tabs of a same page leave the scroll alone.
// - The menu item of the page one is on, tapped again, goes to its top and
//   reads it again (refresh.ts).
//
// The browser restores a position of its own before the page is drawn,
// when the page is still short: the app does it instead, once the page can
// reach it.
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

// Positions by entry of the history, and by main page
const byEntry = tabMemory('scroll-entry')
const byPage = tabMemory('scroll-page')

// Each entry of the history gets a key of its own, kept in its state: back
// and forward give it back. The router pushes an empty state.
const entryKey = () => {
  const state = history.state as { scrollKey?: string } | null
  if (state?.scrollKey) return state.scrollKey
  const scrollKey = crypto.randomUUID()
  history.replaceState({ ...state, scrollKey }, '')
  return scrollKey
}

const address = () => `${location.pathname}${location.search}`

/** Where the page is now: kept for its entry, and for it if it is main */
const keep = (entry: string, at: string) => {
  byEntry.set(entry, scrollY)
  MAIN.has(at.split('?')[0]) && byPage.set(at, scrollY)
}

let entry = entryKey()
let at = address()
// While a page is being reached (a new page drawn, a position restored),
// the scroll is the app's, not the reader's: it is not kept
let settling = false
addEventListener('scroll', () => settling || keep(entry, at), {
  passive: true,
})

/*
 * Restoring: a page fills as its data comes, so the position waits until
 * the page is tall enough. One's own scroll stops it at once.
 */

const RESTORE_FOR_MS = 3000
let stopRestoring = () => {}

const restore = (top: number) => {
  stopRestoring()
  settling = true
  const until = performance.now() + RESTORE_FOR_MS
  let timer: ReturnType<typeof setTimeout> | undefined
  const stop = () => {
    clearTimeout(timer)
    settling = false
    for (const type of ['wheel', 'touchstart', 'keydown', 'pointerdown']) {
      removeEventListener(type, stop, true)
    }
  }
  stopRestoring = stop
  for (const type of ['wheel', 'touchstart', 'keydown', 'pointerdown']) {
    addEventListener(type, stop, { capture: true, passive: true })
  }
  const step = () => {
    const reachable = document.documentElement.scrollHeight - innerHeight
    scrollTo({ top: Math.min(top, reachable), behavior: 'instant' })
    if (reachable >= top || performance.now() > until) return stop()
    timer = setTimeout(step, 50)
  }
  step()
}

// The first page drawn: a reload, or a return from another site, comes
// back where this entry was
const first = byEntry.get(entry)
if (first) {
  settling = true
  setTimeout(() => restore(first), 0)
}

// A step of the browser, not a link: the router sends an event of its own
// at each navigation, which is not trusted
let stepped = false
addEventListener('popstate', (event) => {
  if (event.isTrusted) stepped = true
})

let page = pageOf(location.pathname)
// Its first run is the page as it loads, already handled above
let loaded = false
effect(() => {
  const path = url.value.pathname
  if (!loaded) return void (loaded = true)
  // The page being left is still drawn: its position is the one to keep,
  // unless it was still being reached
  settling || keep(entry, at)
  stopRestoring()
  settling = true
  entry = entryKey()
  at = address()
  const next = pageOf(path)
  const moved = next !== page
  page = next
  // Once the new page is drawn and every listener of the navigation ran:
  // whether it was a step of the browser is known by then
  setTimeout(() => {
    const step = stepped
    stepped = false
    const top = step ? byEntry.get(entry) : byPage.get(at)
    if (moved && top) return restore(top)
    moved && scrollTo({ top: 0, behavior: 'instant' })
    settling = false
  }, 0)
})
