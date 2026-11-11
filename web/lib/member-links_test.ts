import { assertEquals } from 'jsr:@std/assert@^1.0.13'
import { webHref } from '/web/lib/member-links.ts'

// Only a web address a member wrote becomes a link (§16)
Deno.test('member links: http and https only, normalized', () => {
  const cases: [string, string | undefined][] = [
    ['https://exemple.sn/a?b=1', 'https://exemple.sn/a?b=1'],
    ['HTTP://Exemple.SN', 'http://exemple.sn/'],
    ['javascript:alert(1)', undefined],
    ['JaVaScRiPt:alert(1)', undefined],
    ['data:text/html,<script>alert(1)</script>', undefined],
    ['vbscript:msgbox(1)', undefined],
    ['//exemple.sn', undefined],
    ['exemple.sn', undefined],
    ['https://', undefined],
  ]
  for (const [link, href] of cases) assertEquals(webHref(link), href, link)
})
