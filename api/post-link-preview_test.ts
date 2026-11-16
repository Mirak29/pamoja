import { assertEquals } from 'jsr:@std/assert@^1.0.13'
import { db, makeRestorePoint } from '@01edu/db'
import { seed } from '/api/seed.ts'
const BASE_URL = 'http://localhost'
import { request } from '/api/testing.ts'

const restore = makeRestorePoint()
const preview = (url: string) =>
  request('/api/post/link-preview?url=' + encodeURIComponent(url))

Deno.test('post preview: public project metadata, never unlisted metadata', async () => {
  restore()
  seed()
  const url = new URL('/project/openpay-africa', BASE_URL).href
  const response = await preview(url)
  assertEquals(response.status, 200)
  const data = await response.json()
  assertEquals(data.site, 'Pamoja')
  const row = db.prepare('SELECT name, description FROM project WHERE slug = ?')
    .get('openpay-africa') as { name: string; description: string }
  assertEquals(data.title, row.name)
  assertEquals(data.description, row.description)
  db.prepare("UPDATE project SET visibility = 'unlisted' WHERE slug = ?").run(
    'openpay-africa',
  )
  const hidden = await (await preview(url)).json()
  assertEquals(hidden.title, new URL(BASE_URL).hostname)
  assertEquals(hidden.description, '')
  restore()
})

Deno.test('post preview: invalid URLs rejected and private network fetch skipped', async () => {
  for (
    const url of [
      'javascript:alert(1)',
      'https://',
      'https://user:secret@example.com',
      'https://example.com/' + 'a'.repeat(2048),
    ]
  ) {
    const response = await preview(url)
    assertEquals(response.status, 400)
    await response.body?.cancel()
  }
  const privateUrl = 'http://192.168.20.1/private'
  const response = await preview(privateUrl)
  assertEquals(response.status, 200)
  assertEquals(await response.json(), {
    url: privateUrl,
    title: '192.168.20.1',
    site: '192.168.20.1',
    description: '',
  })
})
