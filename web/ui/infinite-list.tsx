import { type ComponentChildren, type JSX, toChildArray } from 'preact'
import { useEffect, useRef, useState } from 'preact/hooks'
import { Button } from '/web/ui/button.tsx'

// Long lists (§12.7): read by batches as one scrolls, never all at once,
// never cut without saying so

/** The size of a batch */
export const BATCH = 20

// The next batch loads this far before the end comes into view
const AHEAD = '800px'

/**
 * A list that loads its next batch a little before its end comes into view.
 * « Charger plus » does the same from the keyboard or a screen reader, and
 * stays when the browser cannot watch the scroll; the end of the list is
 * said. The rows go inside the container (`class`, a grid as well).
 *
 * @example
 * <InfiniteList more={!!next} onMore={loadOlder} end='C’est tout.'>
 *   {rows.map((row) => <Row key={row.id} row={row} />)}
 * </InfiniteList>
 */
export const InfiniteList = (
  { more, onMore, end, class: className, children }: {
    /** More rows to load */
    more: boolean
    /** Loads the next batch; the list waits for its promise */
    onMore: () => unknown
    /** Said at the end, once everything is shown */
    end?: ComponentChildren
    class?: string
    children: ComponentChildren
  },
) => {
  const [loading, setLoading] = useState(false)
  const sentinel = useRef<HTMLDivElement>(null)
  const count = toChildArray(children).length
  const load = async () => {
    if (loading || !more) return
    setLoading(true)
    try {
      await onMore()
    } finally {
      setLoading(false)
    }
  }
  // Watched again after each batch: a batch that does not fill the screen
  // calls the next one
  useEffect(() => {
    const target = sentinel.current
    if (!target || !more || loading) return
    if (typeof IntersectionObserver === 'undefined') return
    const observer = new IntersectionObserver(
      (entries) => entries.some((entry) => entry.isIntersecting) && load(),
      { rootMargin: `0px 0px ${AHEAD} 0px` },
    )
    observer.observe(target)
    return () => observer.disconnect()
  }, [more, loading, count])
  return (
    <>
      <div class={className}>{children}</div>
      <div ref={sentinel} class='flex flex-col items-center py-3'>
        {more
          ? (
            <Button
              variant='secondary'
              size={36}
              disabled={loading}
              onClick={load}
            >
              {loading ? 'Chargement…' : 'Charger plus'}
            </Button>
          )
          : count > 0 && end
          ? <p class='text-[13px] text-ink-muted'>{end}</p>
          : null}
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
  const [state, setState] = useState({ reset, count: size })
  const count = state.reset === reset ? state.count : size
  return {
    shown: items.slice(0, count),
    more: count < items.length,
    next: () => setState({ reset, count: count + size }),
  }
}

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
    <InfiniteList more={more} onMore={next} end={end} class={className}>
      {shown.map(row)}
    </InfiniteList>
  )
}
