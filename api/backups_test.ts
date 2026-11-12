import { assert, assertEquals } from 'jsr:@std/assert@^1.0.13'
import { Database } from 'jsr:@cd/sqlite@^0.13.1'
import { db } from '@01edu/db'
import { backUp, BACKUP_KEPT_MS } from '/api/backups.ts'
import '/api/schema.ts'

Deno.test('backups: a whole copy each hour, kept 7 days (§17.5)', async () => {
  const dir = await Deno.makeTempDir({ prefix: 'pamoja-backups-' })
  try {
    const at = new Date('2026-11-12T14:20:00Z')
    // Older than 7 days, just within, and a file that is not a copy
    const old = new Date(at.getTime() - BACKUP_KEPT_MS - 3600_000)
    const recent = new Date(at.getTime() - BACKUP_KEPT_MS + 3600_000)
    const name = (d: Date) => `pamoja-${d.toISOString().slice(0, 13)}.db`
    for (const file of [name(old), name(recent), 'notes.txt']) {
      await Deno.writeTextFile(`${dir}/${file}`, '')
    }

    const { path, dropped } = await backUp(dir, at)
    assertEquals(path, `${dir}/pamoja-2026-11-12T14.db`)
    assertEquals(dropped, [name(old)])
    const left = [...Deno.readDirSync(dir)].map((e) => e.name).sort()
    assertEquals(left, ['notes.txt', name(recent), 'pamoja-2026-11-12T14.db'])

    // The copy opens on its own and holds the tables of the database
    const tables = (database: { prepare: Database['prepare'] }) =>
      database.prepare(
        "SELECT count(*) AS n FROM sqlite_master WHERE type = 'table'",
      ).get<{ n: number }>()!.n
    const copy = new Database(path, { readonly: true })
    try {
      assert(tables(copy) > 0)
      assertEquals(tables(copy), tables(db))
    } finally {
      copy.close()
    }

    // A second run within the hour writes the same copy again
    const again = await backUp(dir, new Date('2026-11-12T14:50:00Z'))
    assertEquals(again.path, path)
  } finally {
    await Deno.remove(dir, { recursive: true })
  }
})
