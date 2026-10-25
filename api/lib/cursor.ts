import { respond } from '@01edu/api/response'

// Lists read in batches (§12.7). The next batch is asked by the position of
// the last item received, never by a page number: an item that arrives
// meanwhile neither shifts nor repeats what follows. The position is the
// value the list is sorted by (a date, a score) and the id, for the ties.

export type Position = { value: number; id: number }

// Before every item: the first batch. Not Number.MAX_VALUE: an integer for
// JavaScript, the driver binds it as a 64-bit integer, which overflows. A
// date in seconds or a score stays far below this one.
const START: Position = {
  value: Number.MAX_SAFE_INTEGER,
  id: Number.MAX_SAFE_INTEGER,
}

/** The position a cursor stands for; the start for an empty one */
export const readCursor = (cursor: string): Position => {
  if (!cursor) return START
  const [value, id, extra] = cursor.split('_').map(Number)
  if (
    !Number.isFinite(value) || !Number.isSafeInteger(id) || extra !== undefined
  ) {
    throw new respond.BadRequestError({ message: 'Unknown cursor' })
  }
  return { value, id }
}

/**
 * A batch and the cursor of the next one, empty at the end. The query reads
 * one item more than the batch: it tells whether more follow.
 *
 * @example
 * batch(rows, 20, (row) => ({ value: row.createdAt, id: row.notificationId }))
 */
export const batch = <T>(
  rows: T[],
  size: number,
  positionOf: (row: T) => Position,
) => {
  const items = rows.slice(0, size)
  const last = items.at(-1)
  if (rows.length <= size || !last) return { items, next: '' }
  const { value, id } = positionOf(last)
  return { items, next: `${value}_${id}` }
}
