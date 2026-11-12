import { effect } from '@preact/signals'
import { url } from '@01edu/signal-router'
import { tabMemory } from '/web/lib/tab-memory.ts'

// Where the page scrolls when one moves about (§12.2), as on a social
// network:
//
// - Back, forward and a reload bring one where one was, as a browser does:
//   each entry of the history has its own position.
// - The menu brings one back where one left its page (`fromMenu`).
// - The tabs of a page leave the scroll alone (`keepScroll`), and so does
//   anything that only changes the parameters of the address: a dialog, a
//   filter, the tab of the feed.
// - Any other link opens its page at the top.
//
// The link says what it wants, as the pointer goes down: the router moves
// to its page right after (or, from the keyboard, at the click). The page
// itself needs no list of paths.
//
// The browser would restore a position of its own before the page is drawn,
// when it is still short: the app does it instead, once the page can reach
// it.
history.scrollRestoration = 'manual'

type Intent = 'menu' | 'keep'
let intent: Intent | undefined

/** The next navigation comes from the menu: back where its page was left */
export const fromMenu = () => intent = 'menu'

/** The next navigation is a tab of the same page: the scroll stays */
export const keepScroll = () => intent = 'keep'

/**
 * A press the router follows: the main button, no key held. A middle click
 * or a Ctrl click opens a new tab, and this page does not move.
 */
export const plainPress = (event: MouseEvent) =>
  event.button === 0 && !event.metaKey && !event.ctrlKey &&
  !event.shiftKey && !event.altKey

/** What a link gives the router so that it says its intent in time */
export const scrollIntent = (say: () => unknown) => ({
  onPointerDown: (event: MouseEvent) => plainPress(event) && say(),
  // From the keyboard there is no pointer: the router acts at the click
  onClick: (event: MouseEvent) =>
    event.detail === 0 && plainPress(event) && say(),
})

/** The address of the page, its tab included: what positions are kept by */
export const address = () => `${url.relativePath}${url.value.search}`

// Positions by entry of the history, and by page for the menu
const byEntry = tabMemory<number>('scroll-entry')
const byPage = tabMemory<number>('scroll-page')

// Each entry of the history gets a key of its own, kept in its state: back,
// forward and a reload give it back. The router pushes an empty state, so a
// new entry is one without a key.
type State = { scrollKey?: string } | null
const keyOf = () => (history.state as State)?.scrollKey
const newKey = () => {
  const scrollKey = crypto.randomUUID()
  history.replaceState({ ...history.state, scrollKey }, '')
  return scrollKey
}

let entry = keyOf() ?? newKey()
let at = address()
let path = url.relativePath

/*
 * Restoring: a page fills as its data comes, so the position waits until
 * the page is tall enough. One's own gesture stops it at once.
 */

// Long enough for a slow first load (the session, then the data): waiting
// costs nothing, the page is only tried again when it grows
const RESTORE_FOR_MS = 10_000
const GESTURES = ['wheel', 'touchstart', 'keydown', 'pointerdown'] as const
let stopRestoring: (() => void) | undefined

const restore = (top: number) => {
  stopRestoring?.()
  const page = document.documentElement
  const reach = () => {
    scrollTo({ top, behavior: 'instant' })
    page.scrollHeight - innerHeight >= top && stop()
  }
  // Tried again each time the page grows, not on a timer
  const grows = new ResizeObserver(reach)
  const deadline = setTimeout(() => stop(), RESTORE_FOR_MS)
  const stop = () => {
    grows.disconnect()
    clearTimeout(deadline)
    for (const type of GESTURES) removeEventListener(type, stop, true)
    stopRestoring = undefined
  }
  stopRestoring = stop
  for (const type of GESTURES) {
    addEventListener(type, stop, { capture: true, passive: true })
  }
  grows.observe(document.body)
  reach()
}

// Kept when a page is left, and when the tab is hidden or left: a reload
// or a dropped tab comes back where it was. Not while a position is still
// being reached: the scroll is then the app's, not the reader's.
const keep = () => {
  if (stopRestoring) return
  byEntry.set(entry, scrollY)
  byPage.set(at, scrollY)
}
// The page is going, or may be dropped: written at once, not after a while
const keepNow = () => {
  keep()
  byEntry.flush()
  byPage.flush()
}
addEventListener('pagehide', keepNow)
addEventListener('visibilitychange', () => {
  document.visibilityState === 'hidden' && keepNow()
})

// The page as it loads: a reload, or a return from another site, comes back
// where its entry was
const loaded = byEntry.get(entry)
loaded && setTimeout(() => restore(loaded), 0)

let first = true
effect(() => {
  url.value
  // Its first run is the page as it loads, handled above
  if (first) return void (first = false)
  // The page being left is still drawn: its position is the one to keep
  keep()
  const known = keyOf()
  entry = known ?? newKey()
  at = address()
  const samePage = url.relativePath === path
  path = url.relativePath
  const wanted = intent
  intent = undefined
  if (wanted === 'keep' || samePage) return
  // A step of the browser: an entry it already had
  const top = known
    ? byEntry.get(entry)
    : wanted === 'menu'
    ? byPage.get(at)
    : undefined
  stopRestoring?.()
  // A new page shows at its top at once; a position waits for the page
  if (top) setTimeout(() => restore(top), 0)
  else scrollTo({ top: 0, behavior: 'instant' })
})
