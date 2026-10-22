import { assertEquals } from 'jsr:@std/assert@^1.0.13'
import { db } from '@01edu/db'
import { request } from '/api/testing.ts'

// The dev tools of @01edu/api are not served, even outside production (§16)
Deno.test('dev tools: no SQL and no metrics, without or with a body', async () => {
  const users = () =>
    (db.prepare('SELECT count(*) AS n FROM user').get() as { n: number }).n
  const before = users()
  const sql = await request('/api/sql/execute', {
    body: { query: 'DELETE FROM user' },
  })
  assertEquals(sql.status, 404)
  await sql.body?.cancel()
  assertEquals(users(), before)
  for (const path of ['/api/sql/metrics', '/api/router/metrics']) {
    const res = await request(path)
    assertEquals(res.status, 404, path)
    await res.body?.cancel()
  }
})
