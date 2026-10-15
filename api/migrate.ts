import { db, sql } from '@01edu/db'
import { toFileUrl } from 'jsr:@std/path@^1.0.8'

// The runMigrations of @01edu/db, with one fix: it imports `file://` + the
// path, which breaks on Windows (C:\…), so any migration of an existing
// database crashed the dev server there. Same rules otherwise (§12.5):
// `PRAGMA user_version` holds the version; on a fresh database nothing runs
// and the last number is recorded, the tables being created by createTable;
// each migration runs in BEGIN IMMEDIATE, and a failure stops the server.

const versionOf = (name: string) => {
  const match = name.match(/^([0-9]+)-/)
  if (!match) {
    throw Error(`Invalid migration filename "${name}": it must start "001-"`)
  }
  return Number(match[1])
}

export const migrate = async (directory: string) => {
  const current = Number(
    (db.prepare('PRAGMA user_version').get() as { user_version: number })
      .user_version,
  )
  const pending = [...Deno.readDirSync(directory)]
    .filter((entry) => entry.isFile && /\.(js|ts)$/.test(entry.name))
    .map((entry) => ({ name: entry.name, version: versionOf(entry.name) }))
    .sort((a, b) => a.version - b.version)
    .filter((migration) => migration.version > current)
  if (!pending.length) return

  if (!current) {
    db.exec(`PRAGMA user_version = ${pending.at(-1)!.version}`)
    return
  }

  for (const { name, version } of pending) {
    const url = toFileUrl(`${directory}/${name}`).href
    const { run } = await import(url)
    if (typeof run !== 'function') {
      throw Error(`Migration ${name} does not export a run function`)
    }
    try {
      db.exec('BEGIN IMMEDIATE')
      await run(sql)
      db.exec('COMMIT')
    } catch (err) {
      db.exec('ROLLBACK')
      console.error(`Migration ${name} failed:`, err)
      Deno.exit(1)
    }
    db.exec(`PRAGMA user_version = ${version}`)
    console.log(`Migration ${name} applied`)
  }
}
