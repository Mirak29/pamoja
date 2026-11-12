import { type ComponentChildren, type JSX, toChildArray } from 'preact'
import { useEffect, useId, useRef, useState } from 'preact/hooks'
import { Button } from '/web/ui/button.tsx'
import { tabMemory } from '/web/lib/tab-memory.ts'
import { address } from '/web/lib/scroll-position.ts'

// Long lists (§12.7): read by batches as one scrolls, never all at once,
// never cut without saying so

/** The size of a batch */
export const BATCH = 20

// The next batch loads this far before the end comes into view
const AHEAD_PX = 800
const AHEAD = `${AHEAD_PX}px`

// What the list scrolls in: a ScrollFrame, or the page. The margin ahead
// applies to it only: within a frame, the page's would be cut by the frame
const scrollerOf = (element: HTMLElement) =>
  element.parentElement?.closest('[data-scroller]') ?? null

/**
 * A list that loads its next batch a little before its end comes into view,
 * with « Chargement… » meanwhile; the end of a list longer than a batch is
 * said. The rows go inside the container (`class`, a grid as well). Another
 * list (a tab, a filter) is another InfiniteList: give it a `key`, it starts
 * afresh.
 *
 * « Charger plus » stays for the keyboard and screen readers, out of sight
 * until it has the focus. It shows when the list cannot load by itself: a
 * browser that does not watch the scroll, or a batch that added no row (a
 * list filtered by the page), so that it never reads batch after batch to
 * fill the screen (§12.7). A batch that failed leaves it too, to try again.
 *
 * @example
 * <InfiniteList key={tab} more={!!next} onMore={loadOlder} end='C’est tout.'>
 *   {rows.map((row) => <Row key={row.id} row={row} />)}
 * </InfiniteList>
 */
export const InfiniteList = (
  { more, onMore, end, class: className, children }: {
    /** More rows to load */
    more: boolean
    /** Loads the next batch; the list waits for its promise */
    onMore: () => unknown
    /** Said at the end, once everything is shown, past the first batch */
    end?: ComponentChildren
    class?: string
    children: ComponentChildren
  },
) => {
  const [loading, setLoading] = useState(false)
  // The rows before the last batch: the same after it, the list stops
  // loading by itself
  const [stalledAt, setStalledAt] = useState<number | null>(null)
  const busy = useRef(false)
  const sentinel = useRef<HTMLDivElement>(null)
  const count = toChildArray(children).length
  const watching = typeof IntersectionObserver !== 'undefined'
  const stalled = stalledAt === count
  const load = async (byHand = false) => {
    if (busy.current || !more || (stalled && !byHand)) return
    busy.current = true
    setLoading(true)
    const before = count
    try {
      await onMore()
    } finally {
      busy.current = false
      setLoading(false)
      setStalledAt(before)
    }
  }
  // Watched again after each batch: a batch that does not fill the screen
  // calls the next one, unless it added no row
  useEffect(() => {
    const target = sentinel.current
    if (!target || !more || loading || stalled || !watching) return
    const root = scrollerOf(target)
    const observer = new IntersectionObserver(
      (entries) => entries.some((entry) => entry.isIntersecting) && load(),
      { root, rootMargin: `0px 0px ${AHEAD} 0px` },
    )
    observer.observe(target)
    // Checked once by hand too, after the layout: the list does not hang on
    // the first report of the observer
    const frame = requestAnimationFrame(() => {
      const bottom = root?.getBoundingClientRect().bottom ?? innerHeight
      target.getBoundingClientRect().top < bottom + AHEAD_PX && load()
    })
    return () => {
      observer.disconnect()
      cancelAnimationFrame(frame)
    }
  }, [more, loading, count, stalled])
  const visible = !watching || stalled
  return (
    <>
      <div class={className}>{children}</div>
      <div ref={sentinel} class='flex flex-col items-center py-3'>
        {more && (
          <Button
            variant='secondary'
            size={36}
            disabled={loading}
            onClick={() => load(true)}
            class={visible ? '' : 'sr-only focus:not-sr-only'}
          >
            Charger plus
          </Button>
        )}
        {loading && (
          <p class='text-[13px] text-ink-muted' aria-hidden='true'>
            Chargement…
          </p>
        )}
        {!more && count > BATCH && end && (
          <p class='text-[13px] text-ink-muted'>{end}</p>
        )}
        <span role='status' class='sr-only'>
          {loading ? 'Chargement…' : ''}
        </span>
      </div>
    </>
  )
}

/**
 * A list already in memory, shown by batches: what `InfiniteList` needs. A
 * new `reset` (a tab, filters) starts again from the first batch.
 *
 * @example
 * const { shown, more, next } = useBatches(people, JSON.stringify(filters))
 */
export const useBatches = <T,>(items: T[], reset = '', size = BATCH) => {
  // Kept by page, by list and by reset: the rows read are still there when
  // one comes back or reloads, and the page can scroll among them (§12.2)
  const at = `${address()} ${useId()} ${reset}`
  const count = readSoFar.get(at) ?? size
  const [, drawAgain] = useState(0)
  return {
    shown: items.slice(0, count),
    more: count < items.length,
    next: () => {
      readSoFar.set(at, count + size)
      drawAgain((n) => n + 1)
    },
  }
}

// How many rows each list in memory showed, kept for the tab
const readSoFar = tabMemory<number>('rows')

/**
 * A list already in memory, in an `InfiniteList`, by batches
 *
 * @example
 * <Batched items={people} reset={filters} class='grid gap-6'
 *   row={(person) => <DeveloperCard key={person.login} person={person} />} />
 */
export const Batched = <T,>(
  { items, row, reset = '', end, class: className }: {
    items: T[]
    row: (item: T) => JSX.Element
    reset?: string
    end?: ComponentChildren
    class?: string
  },
) => {
  const { shown, more, next } = useBatches(items, reset)
  return (
    <InfiniteList
      key={reset}
      more={more}
      onMore={next}
      end={end}
      class={className}
    >
      {shown.map(row)}
    </InfiniteList>
  )
}
