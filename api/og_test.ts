import {
  assert,
  assertEquals,
  assertStringIncludes,
} from 'jsr:@std/assert@^1.0.13'
import { db, makeRestorePoint } from '@01edu/db'
import { seed } from '/api/seed.ts'
import {
  escapeHtml,
  forgetPreviews,
  pageWithPreview,
  previewOf,
  sitemap,
} from '/api/og.ts'
import { request } from '/api/testing.ts'
import server from '/api/server.ts'

const restore = makeRestorePoint()
const origin = 'https://pamoja.test'
const page = '<html><head><title>Pamoja</title></head><body></body></html>'

Deno.test('og: a profile and a project shared show their preview (PAM-305)', () => {
  restore()
  seed()
  const profile = previewOf('/@moussa', origin)
  assertStringIncludes(profile.title, 'Moussa Diallo')
  assertEquals(profile.image, `${origin}/api/user/card?login=moussa`)
  assertStringIncludes(profile.description, 'preuves sur Pamoja')

  const project = previewOf('/project/openpay-africa', origin)
  assertStringIncludes(project.title, 'OpenPay Africa')
  assertEquals(project.image, `${origin}/api/project/card?slug=openpay-africa`)

  // Anything else, or someone unknown, gets the default preview
  for (const path of ['/', '/explore', '/@nobody-here', '/project/nope']) {
    const other = previewOf(path, origin)
    assertEquals(other.title, 'Pamoja')
    assertEquals(other.image, undefined)
  }
})

Deno.test('og: what a member wrote is escaped in the page', () => {
  restore()
  seed()
  db.prepare(
    "UPDATE profile SET displayName = ? WHERE userId = (SELECT userId FROM user WHERE githubUsername = 'moussa')",
  ).run('<script>alert(1)</script> "Moussa"')
  forgetPreviews()
  const html = pageWithPreview(page, new Request(`${origin}/@moussa`))
  assert(!html.includes('<script>'))
  assertStringIncludes(html, '&lt;script&gt;alert(1)&lt;/script&gt;')
  assertStringIncludes(html, 'og:image')
  assertEquals(escapeHtml(`a&b"'<>`), 'a&amp;b&quot;&#39;&lt;&gt;')
})

Deno.test('og: the sitemap lists the public profiles and projects', async () => {
  restore()
  seed()
  db.prepare("UPDATE project SET visibility = 'private' WHERE slug = ?")
    .run('openpay-africa')
  const xml = await sitemap(new Request(`${origin}/sitemap.xml`)).text()
  assertStringIncludes(xml, `<loc>${origin}/@moussa</loc>`)
  assert(!xml.includes('/project/openpay-africa'))
  assert(xml.includes('/project/'))
})

Deno.test('card: a PNG for anyone, kept and revalidated by its ETag', async () => {
  restore()
  seed()
  const res = await request('/api/user/card?login=moussa')
  assertEquals(res.status, 200)
  assertEquals(res.headers.get('content-type'), 'image/png')
  const png = new Uint8Array(await res.arrayBuffer())
  // The signature of a PNG
  assertEquals([...png.slice(1, 4)], [80, 78, 71])
  const etag = res.headers.get('etag')!
  const again = await server.fetch(
    new Request('http://localhost/api/user/card?login=moussa', {
      headers: { 'If-None-Match': etag },
    }),
  )
  assertEquals(again.status, 304)
  await again.body?.cancel()

  const unknown = await request('/api/user/card?login=nobody-here')
  assertEquals(unknown.status, 404)
  await unknown.body?.cancel()
  const project = await request('/api/project/card?slug=openpay-africa')
  assertEquals(project.status, 200)
  await project.body?.cancel()
})
