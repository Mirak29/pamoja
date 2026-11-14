// Writes about one thing (a follow, a membership) leave one after the
// other, and only the last one decides what the page shows. Two quick clicks
// send opposite states: sent together, the server could save them in either
// order, and a late answer could show the state of the first click.

const queues = new Map<string, Promise<unknown>>()
const latest = new Map<string, number>()
const touched = new Set<string>()

/**
 * Sends `write` once the writes already sent about `key` are answered.
 * `current()` is false once a newer write about `key` was asked for: its
 * answer then no longer decides what the page shows.
 *
 * @example
 * const { answer, current } = inOrder(`user:${login}`, () => save(login))
 * answer.then((saved) => current() && show(saved))
 */
export const inOrder = <T>(key: string, write: () => Promise<T>) => {
  const version = (latest.get(key) ?? 0) + 1
  latest.set(key, version)
  touched.add(key)
  const previous = queues.get(key) ?? Promise.resolve()
  const answer = previous.then(write, write)
  queues.set(key, answer.catch(() => {}))
  return { answer, current: () => latest.get(key) === version }
}

/**
 * Starts a reading of the server's state: the keys written after it starts
 * are the page's own, newer than what it will read
 *
 * @example
 * const writtenSince = readingStarts()
 * read().then((state) => keep(state, writtenSince))
 */
export const readingStarts = () => {
  touched.clear()
  return (key: string) => touched.has(key)
}
