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
  const answer = (queues.get(key) ?? Promise.resolve()).then(write, write)
  const settled = answer.catch(() => {}).then(() => {
    // The last write of the key is answered: nothing waits on it any more
    if (latest.get(key) !== version) return
    latest.delete(key)
    queues.delete(key)
  })
  queues.set(key, settled)
  // A key gone is one whose last write was answered: this one
  return { answer, current: () => (latest.get(key) ?? version) === version }
}

/**
 * Turns something on or off as the page shows it at once, then as the
 * server confirms. The writes of `key` leave in order and the last decides;
 * the newest one failing puts the state back and says so. An answer that
 * comes once another developer signed in is not theirs: it is dropped.
 *
 * @example
 * setInOrder(`follow:user:${login}`, true, {
 *   who: () => me.login,
 *   show: (on) => setFollowing(login, on),
 *   send: (on) => save(login, on),
 *   failed,
 * })
 */
export const setInOrder = (
  key: string,
  on: boolean,
  { who, show, send, failed }: {
    who: () => string
    show: (on: boolean) => void
    send: (on: boolean) => Promise<boolean>
    failed: () => void
  },
) => {
  const by = who()
  show(on)
  const { answer, current } = inOrder(key, () => send(on))
  const ours = () => who() === by && current()
  answer.then((saved) => ours() && show(saved), () => {
    if (!ours()) return
    show(!on)
    failed()
  })
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
