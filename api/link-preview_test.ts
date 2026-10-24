import { assertEquals } from 'jsr:@std/assert@^1.0.13'
import {
  type Fetch,
  fetchPreview,
  firstLink,
  isPublicAddress,
  readPreview,
} from '/api/link-preview.ts'

// Link previews (§10.6): read by the server, so never toward its network

Deno.test('link preview: the first link of a message', () => {
  assertEquals(
    firstLink('Regarde https://kora.dev/docs, puis dis-moi.'),
    'https://kora.dev/docs',
  )
  assertEquals(
    firstLink('[la doc](https://kora.dev/a?b=1)'),
    'https://kora.dev/a?b=1',
  )
  assertEquals(firstLink('ftp://kora.dev et javascript:alert(1)'), undefined)
})

Deno.test('link preview: public addresses only', () => {
  for (
    const address of [
      '127.0.0.1',
      '10.1.2.3',
      '172.16.0.1',
      '192.168.1.1',
      '169.254.169.254',
      '100.64.0.1',
      '0.0.0.0',
      '224.0.0.1',
      '::1',
      '::',
      'fd00::1',
      'fe80::1',
      '::ffff:127.0.0.1',
      '2001:db8::1',
      '2002:c0a8:101::1',
      '2001:0:4136:e378::1',
      'ff02::1',
    ]
  ) {
    assertEquals([address, isPublicAddress(address)], [address, false])
  }
  for (
    const address of ['93.184.216.34', '2606:4700::6810:84e5', '::ffff:8.8.8.8']
  ) {
    assertEquals([address, isPublicAddress(address)], [address, true])
  }
})

Deno.test('link preview: title, description and site of the head, as text', () => {
  const html = `<!doctype html><html><head>
    <title>Ignored when og:title is there</title>
    <meta property="og:title" content="Kora &amp; Pamoja <b>v2</b>">
    <meta name='description' content='Un ledger
      pour les tontines'>
    <meta property="og:site_name" content="Kora">
    </head><body><meta property="og:title" content="Not in the head"></body></html>`
  assertEquals(readPreview(html, 'https://kora.dev/x'), {
    url: 'https://kora.dev/x',
    title: 'Kora & Pamoja v2',
    description: 'Un ledger pour les tontines',
    site: 'Kora',
  })
  // The title tag, the host as site; no title, no preview
  assertEquals(
    readPreview('<title>Accueil</title>', 'https://www.example.org/'),
    {
      url: 'https://www.example.org/',
      title: 'Accueil',
      description: '',
      site: 'example.org',
    },
  )
  assertEquals(readPreview('<p>rien</p>', 'https://example.org/'), undefined)
})

const page = (html: string, type = 'text/html; charset=utf-8') =>
  new Response(html, { headers: { 'Content-Type': type } })

Deno.test('link preview: the network of the server is never reached', async () => {
  const fetched: string[] = []
  const fetch: Fetch = (url) => {
    fetched.push(url.href)
    if (url.hostname === 'jump.example') {
      return Promise.resolve(
        new Response(null, {
          status: 302,
          headers: { Location: 'http://169.254.169.254/latest/meta-data' },
        }),
      )
    }
    if (url.pathname === '/file.zip') {
      return Promise.resolve(page('PK', 'application/zip'))
    }
    return Promise.resolve(page('<title>Kora</title>'))
  }
  const resolve = (host: string) =>
    Promise.resolve(
      host === 'inside.example' ? ['10.0.0.5'] : ['93.184.216.34'],
    )
  const read = (link: string) => fetchPreview(link, { fetch, resolve })
  // A name that points inside, an address inside, a port, a password
  assertEquals(await read('http://inside.example/'), undefined)
  assertEquals(await read('http://127.0.0.1/'), undefined)
  assertEquals(await read('http://[::1]/'), undefined)
  assertEquals(await read('http://localhost/'), undefined)
  assertEquals(await read('https://kora.dev:8080/'), undefined)
  assertEquals(await read('https://me:secret@kora.dev/'), undefined)
  assertEquals(fetched, [])
  // A redirect toward inside is refused before it is followed
  assertEquals(await read('https://jump.example/'), undefined)
  assertEquals(fetched, ['https://jump.example/'])
  // Not a page: nothing
  assertEquals(await read('https://kora.dev/file.zip'), undefined)
  assertEquals((await read('https://kora.dev/'))?.title, 'Kora')
})
