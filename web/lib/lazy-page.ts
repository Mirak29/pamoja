import { h, type JSX } from 'preact'
import { useEffect, useReducer } from 'preact/hooks'

// The code of a page is read at its first visit, not with the app (§17.4):
// the first screen comes sooner, and a page never opened is never read.

type Page = () => JSX.Element | null

const RELOADED = 'pamoja-reloaded'

// A page that cannot be read: a new version was deployed since this one
// loaded, and its old files are gone. The new version is loaded, once: a
// second failure (offline) leaves the page as it is.
const reloadOnce = () => {
  try {
    if (sessionStorage.getItem(RELOADED)) return
    sessionStorage.setItem(RELOADED, '1')
  } catch {
    return
  }
  location.reload()
}
// A page read again: the next failure may reload
const readAgain = () => {
  try {
    sessionStorage.removeItem(RELOADED)
  } catch {
    // Nothing kept, nothing to clear
  }
}

/**
 * A page read on demand: nothing shows until its code is in, then the page.
 * `preload` reads it ahead, before anyone asks.
 *
 * @example
 * const HelpPage = lazyPage(() =>
 *   import('/web/pages/help/help-page.tsx').then((page) => page.HelpPage)
 * )
 */
export const lazyPage = (load: () => Promise<Page>) => {
  let page: Page | undefined
  let loading: Promise<void> | undefined
  const preload = () =>
    loading ??= load().then((found) => {
      page = found
      readAgain()
    }, () => {
      loading = undefined
      reloadOnce()
    })
  // No signal is read here: the page under it is rendered again with its
  // parent, as if it were there itself
  const Lazy = () => {
    const [, loaded] = useReducer((count: number) => count + 1, 0)
    const drawn = page
    useEffect(() => {
      // Drawn empty: drawn again once the code is in, even when it came
      // between the drawing and this effect
      drawn || preload().then(() => page && loaded(undefined))
    }, [])
    return drawn ? h(drawn, null) : null
  }
  return Object.assign(Lazy, { preload })
}
