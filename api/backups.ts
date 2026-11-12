import { db } from '@01edu/db'
import { every } from '/api/lib/background.ts'
import { log } from '/api/lib/log.ts'

// The reputation is the most precious data of the product (§17.5): a copy
// of the database every hour, kept 7 days. `VACUUM INTO` writes a whole,
// consistent copy while the server keeps running; the WAL needs no pause.
// The copy off the VM, once a day, takes the newest file of the folder.

const HOUR = 3600_000
export const BACKUP_EVERY = HOUR
export const BACKUP_KEPT_MS = 7 * 24 * HOUR

const PREFIX = 'pamoja-'
const SUFFIX = '.db'

// pamoja-2026-11-12T14.db: sorted by name, sorted by time. One per hour: a
// restart within the hour writes the same file again.
const nameAt = (at: Date) =>
  `${PREFIX}${at.toISOString().slice(0, 13)}${SUFFIX}`

const timeOf = (name: string) =>
  Date.parse(`${name.slice(PREFIX.length, -SUFFIX.length)}:00:00Z`)

/** Writes the copy of this hour, then drops those older than 7 days */
export const backUp = async (dir: string, at = new Date()) => {
  await Deno.mkdir(dir, { recursive: true })
  const path = `${dir}/${nameAt(at)}`
  // VACUUM INTO refuses a file that exists: the copy of the hour is redone
  await Deno.remove(path).catch((error) => {
    if (!(error instanceof Deno.errors.NotFound)) throw error
  })
  db.exec('VACUUM INTO ?', path)
  const dropped: string[] = []
  for await (const { name, isFile } of Deno.readDir(dir)) {
    if (!isFile || !name.startsWith(PREFIX) || !name.endsWith(SUFFIX)) continue
    const time = timeOf(name)
    if (Number.isNaN(time) || at.getTime() - time <= BACKUP_KEPT_MS) continue
    await Deno.remove(`${dir}/${name}`)
    dropped.push(name)
  }
  log.info('backup', { path, dropped: dropped.length })
  return { path, dropped }
}

/** Every hour, from the start of the server, into `dir` (a volume) */
export const startBackups = (dir: string) =>
  every('backup-error', BACKUP_EVERY, () => backUp(dir))
