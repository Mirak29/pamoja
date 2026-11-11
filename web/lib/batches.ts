import { signal } from '@preact/signals'

/*
 * Lists read from the server by batches, from a cursor (§12.7). Each list
 * (a tab, the issues of a project) has its own cursor: missing before its
 * first batch, empty once everything is read. One batch of a list is read at
 * a time.
 *
 * The rows of every list of a kind share one array (the notifications, the
 * issues): a list shows the rows down to the last one its batches reached
 * (`shows`), never those another list read further down, below a gap.
 */

/** What a batch says of itself: its cursor, and where its rows sort */
type Read = { next: string; orders?: number[] }

// Where a batch ends: nowhere once everything is read
const lowestOf = ({ next, orders = [] }: Read) =>
  next === '' || !orders.length ? -Infinity : Math.min(...orders)

/**
 * The cursors of the lists of a kind, and how far each reached. `read`
 * fetches a batch and puts its rows in the pages.
 *
 * @example
 * const lists = batchedLists((tab, before) => fetchTab(tab, before))
 * lists.load('mine') // the first batch, then the next ones
 */
export const batchedLists = <K extends string>(
  read: (key: K, before: string) => Promise<Read>,
) => {
  const cursors = signal<Partial<Record<K, string>>>({})
  const reached = signal<Partial<Record<K, number>>>({})
  // Lists whose older batches were read: a new first batch keeps them
  const olderRead = new Set<K>()
  const reading = new Map<K, Promise<void>>()

  const reach = (key: K, batch: Read, fromTop: boolean) => {
    const lowest = lowestOf(batch)
    const known = reached.peek()[key]
    reached.value = {
      ...reached.peek(),
      [key]: fromTop || known === undefined ? lowest : Math.min(known, lowest),
    }
  }
  const setCursor = (key: K, next: string) => {
    cursors.value = { ...cursors.peek(), [key]: next }
  }

  return {
    cursors,
    /** More to read: the first batch too, before it is read */
    more: (key: K) => cursors.value[key] !== '',
    /** Whether a row is within what the list read */
    shows: (key: K, order: number) => order >= (reached.value[key] ?? Infinity),
    /**
     * The next batch of a list, its first one if none was read; nothing when
     * one is on its way. A failed batch leaves the cursor: tried again.
     */
    load: (key: K) => {
      const current = reading.get(key)
      if (current) return current
      const before = cursors.peek()[key]
      if (before === '') return Promise.resolve()
      const done = read(key, before ?? '')
        .then((batch) => {
          before && olderRead.add(key)
          reach(key, batch, !before)
          setCursor(key, batch.next)
        })
        .catch(() => {})
        .finally(() => reading.delete(key))
      reading.set(key, done)
      return done
    },
    /**
     * The first batch read again, after a change: the older batches already
     * read keep their cursor
     */
    first: (key: K, batch: Read) => {
      const older = olderRead.has(key)
      reach(key, batch, !older)
      older || setCursor(key, batch.next)
    },
    /** Forgets every list: another developer signed in */
    reset: () => {
      cursors.value = {}
      reached.value = {}
      olderRead.clear()
    },
  }
}

/** Puts a batch in a list: new rows join, known ones are updated */
export const upsert = <T>(
  list: T[],
  fresh: T[],
  idOf: (item: T) => string | number,
) => {
  const at = new Map(list.map((item, i) => [idOf(item), i]))
  const next = [...list]
  for (const item of fresh) {
    const i = at.get(idOf(item))
    i === undefined ? next.push(item) : next[i] = item
  }
  return next
}

/**
 * A first batch read again: a row of its range it no longer holds is gone
 * on the server (a declined request, a removed notification), it leaves the
 * list. `among` the rows of that list, the others are not its own.
 */
export const replaceTop = <T>(
  list: T[],
  fresh: T[],
  { idOf, order, next, among = () => true }: {
    idOf: (item: T) => string | number
    order: (item: T) => number
    next: string
    among?: (item: T) => boolean
  },
) => {
  const ids = new Set(fresh.map(idOf))
  const lowest = lowestOf({ next, orders: fresh.map(order) })
  return upsert(
    list.filter((item) =>
      !among(item) || ids.has(idOf(item)) || order(item) < lowest
    ),
    fresh,
    idOf,
  )
}

/** Gives an array shared by the fixtures its new rows, in place */
export const assign = <T>(list: T[], rows: T[]) => {
  list.splice(0, list.length, ...rows)
}
