// What the page remembers for this tab of the browser, as the browser does
// for its own history: kept in sessionStorage, so that a reload, a return
// from another site, or a phone that drops the tab while another app is
// open, find it again. Another tab has its own; nothing leaves the browser.
//
// A private window may refuse the storage: the memory then lasts as long
// as the page, which is all it can do.

const PREFIX = 'pamoja-memory:'
// Kept for the newest keys only: a session of the tab never fills the storage
const KEPT = 100
// Written once a burst of changes is over (a scroll, typing)
const SAVE_AFTER_MS = 300

/**
 * Values kept for the tab under `name`, the most recently set first to stay
 *
 * @example
 * const drafts = tabMemory<string>('draft')
 * drafts.set('post', text)
 */
export const tabMemory = <T>(name: string) => {
  const key = PREFIX + name
  // In the order they were set: the oldest leave first
  let values = new Map<string, T>()
  try {
    values = new Map(Object.entries(
      JSON.parse(sessionStorage.getItem(key) ?? '{}') as Record<string, T>,
    ))
  } catch {
    // Unreadable or refused: an empty memory
  }
  let pending: ReturnType<typeof setTimeout> | undefined
  const flush = () => {
    clearTimeout(pending)
    pending = undefined
    try {
      sessionStorage.setItem(key, JSON.stringify(Object.fromEntries(values)))
    } catch {
      // Not kept beyond the page: see above
    }
  }
  const save = () => {
    clearTimeout(pending)
    pending = setTimeout(flush, SAVE_AFTER_MS)
  }
  // The page may be left, or the phone may drop it, before a save is due
  addEventListener('pagehide', () => pending && flush())
  addEventListener('visibilitychange', () => {
    document.visibilityState === 'hidden' && pending && flush()
  })
  return {
    get: (id: string): T | undefined => values.get(id),
    set: (id: string, value: T) => {
      values.delete(id)
      values.set(id, value)
      for (const old of values.keys()) {
        if (values.size <= KEPT) break
        values.delete(old)
      }
      save()
    },
    remove: (id: string) => {
      values.delete(id) && save()
    },
  }
}
