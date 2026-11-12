// What the page remembers for this tab of the browser, as the browser does
// for its own history: kept in sessionStorage, so that a reload, a return
// from another site, or a phone that drops the tab while another app is
// open, find it again. Another tab has its own; nothing leaves the browser.
//
// A private window may refuse the storage: the memory then lasts as long
// as the page, which is all it can do.

const PREFIX = 'pamoja-memory:'

/** A map of numbers kept for the tab, under `name` */
export const tabMemory = (name: string) => {
  const key = PREFIX + name
  let values: Record<string, number> = {}
  try {
    values = JSON.parse(sessionStorage.getItem(key) ?? '{}')
  } catch {
    values = {}
  }
  let pending: ReturnType<typeof setTimeout> | undefined
  // Written once a burst of changes is over: scrolling sets a value often
  const save = () => {
    clearTimeout(pending)
    pending = setTimeout(flush, 200)
  }
  const flush = () => {
    clearTimeout(pending)
    try {
      sessionStorage.setItem(key, JSON.stringify(values))
    } catch {
      // Not kept beyond the page: see above
    }
  }
  // The page may be left before the burst is over
  addEventListener('pagehide', flush)
  return {
    get: (id: string): number | undefined => values[id],
    set: (id: string, value: number) => {
      if (values[id] === value) return
      values[id] = value
      save()
    },
  }
}
