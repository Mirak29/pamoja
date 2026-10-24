import { errorMessage, log } from '/api/lib/log.ts'

// Work the server does on its own, outside any request: an error is logged,
// never thrown. Deno stops the whole process on an uncaught error, and a
// failed refresh or reminder must not take the site down with it.

const report = (name: string) => (err: unknown) =>
  log.error(name, { message: errorMessage(err) })

/** After the current work, outside its transaction */
export const later = (name: string, task: () => unknown) =>
  setTimeout(() => Promise.resolve().then(task).catch(report(name)), 0)

/**
 * After `first` ms, then every `ms`; one run at a time, however long a run
 * takes
 */
export const every = (
  name: string,
  ms: number,
  task: () => unknown,
  first = 0,
) => {
  let running = false
  const run = async () => {
    if (running) return
    running = true
    try {
      await task()
    } catch (err) {
      report(name)(err)
    } finally {
      running = false
    }
  }
  setTimeout(run, first)
  return setInterval(run, ms)
}
