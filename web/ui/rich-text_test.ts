import { assertEquals } from 'jsr:@std/assert@^1.0.13'
import { parseHTML } from 'npm:linkedom@0.18.12'
import { h, render } from 'preact'

// What a member writes (QA-20 to QA-24): never HTML, links only http(s),
// line breaks kept, a small Markdown, mentions and hashtags

Deno.test('rich text: Markdown as elements, nothing a member writes can run', async () => {
  const { document, window } = parseHTML(
    '<html><head><base href="http://localhost/"></head><body><main></main></body></html>',
  )
  const replacements = {
    document,
    location: new URL('http://localhost/'),
    history: window.history ?? { pushState() {}, replaceState() {} },
    navigator: { languages: ['fr-FR'], language: 'fr-FR' },
    localStorage: {
      getItem: () => null,
      setItem() {},
      removeItem() {},
    },
  }
  const originals = Object.getOwnPropertyDescriptors(globalThis)
  for (const [key, value] of Object.entries(replacements)) {
    Object.defineProperty(globalThis, key, { value, configurable: true })
  }
  const root = document.querySelector('main')!
  try {
    const { Markdown } = await import('./rich-text.tsx')
    const show = (text: string) => {
      render(h(Markdown, { text }), root)
      return root
    }

    // Injection: the text stays text
    show(
      '<script>alert(1)</script> <img src=x onerror=alert(1)>\n' +
        '[lien](javascript:alert(1)) <a href="javascript:alert(1)">a</a>',
    )
    assertEquals(root.querySelectorAll('script, img, a').length, 0)
    assertEquals(
      root.textContent,
      '<script>alert(1)</script> <img src=x onerror=alert(1)>\n' +
        '[lien](javascript:alert(1)) <a href="javascript:alert(1)">a</a>',
    )

    // Markdown, links, mentions, hashtags
    show(
      '**gras** et *italique*, `code`\n' +
        'Voir [la PR](https://github.com/x/y/pull/1), https://exemple.sn/a. ' +
        'Merci @moussa #golang, pas a@b.sn',
    )
    assertEquals(root.querySelector('strong')!.textContent, 'gras')
    assertEquals(root.querySelector('em')!.textContent, 'italique')
    assertEquals(root.querySelector('code')!.textContent, 'code')
    const links = [...root.querySelectorAll('a')].map((a) => [
      a.textContent,
      a.getAttribute('href'),
    ])
    assertEquals(links, [
      ['la PR', 'https://github.com/x/y/pull/1'],
      // The final dot is not part of the link
      ['https://exemple.sn/a', 'https://exemple.sn/a'],
      ['@moussa', 'http://localhost/@moussa'],
    ])
    // A link of a member: a new tab, no access to the page, no ranking
    assertEquals(
      [...root.querySelectorAll('a[href^="https"]')].map((a) => [
        a.getAttribute('target'),
        a.getAttribute('rel'),
      ]),
      [
        ['_blank', 'noopener noreferrer nofollow ugc'],
        ['_blank', 'noopener noreferrer nofollow ugc'],
      ],
    )
    assertEquals(root.querySelector('button')!.textContent, '#golang')
    // A number is not a hashtag: « PR #8 »
    show('Voir la PR #8 et #go')
    assertEquals(
      [...root.querySelectorAll('button')].map((b) => b.textContent),
      ['#go'],
    )
    // A link that is no web address stays text
    show('[ici](https://) et https://:80 puis [ok](https://Exemple.SN)')
    assertEquals(
      [...root.querySelectorAll('a')].map((a) => a.getAttribute('href')),
      ['https://exemple.sn/'],
    )
    // Line breaks are kept
    assertEquals(
      root.querySelector('p')!.getAttribute('class')!.includes(
        'whitespace-pre-line',
      ),
      true,
    )

    // Blocks: lists, quotes, code
    show(
      '- un\n- deux\n\n1. premier\n\n> cité\n\n```go\nfmt.Println("<b>")\n```',
    )
    assertEquals(root.querySelectorAll('ul li').length, 2)
    assertEquals(root.querySelectorAll('ol li').length, 1)
    assertEquals(root.querySelector('blockquote')!.textContent, 'cité')
    assertEquals(root.querySelector('pre')!.textContent, 'fmt.Println("<b>")')
    assertEquals(root.querySelectorAll('b').length, 0)
    render(null, root)
  } finally {
    for (const key of Object.keys(replacements)) {
      const original = originals[key]
      original
        ? Object.defineProperty(globalThis, key, original)
        : delete (globalThis as Record<string, unknown>)[key]
    }
  }
})
