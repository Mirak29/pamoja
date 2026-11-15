import { assertEquals } from 'jsr:@std/assert@^1.0.13'
import { imageOf, linkOf, parseReadme, slugOf } from '/web/lib/readme.ts'

const repo = { owner: 'zone01', name: 'bomberman', branch: 'main' }

const README = `# 💣 BOMBERMAN GAME

|Launch Page|Game Page|
|:-:|:-:|
|![Bomberman Game Screenshot](img/screenshot.1.jpeg)|![Bomberman Game Screenshot](img/screenshot.2.jpeg)|

A simple Bomberman game implemented in HTML, CSS, and Vanilla JavaScript.

## TABLE OF CONTENTS

- [💣 BOMBERMAN GAME](#-bomberman-game)
- [FEATURES](#features)

## FEATURES

- Classic Bomberman gameplay.
- Pause menu with options to continue or restart.

\`\`\`bash
npm start
\`\`\`
`

Deno.test('readme: tables, headings, lists and code become blocks', () => {
  const blocks = parseReadme(README)
  assertEquals(blocks.map((b) => b.kind), [
    'heading',
    'table',
    'paragraph',
    'heading',
    'list',
    'heading',
    'list',
    'code',
  ])
  const table = blocks[1]
  if (table.kind !== 'table') throw new Error('a table')
  assertEquals(table.head, ['Launch Page', 'Game Page'])
  assertEquals(table.align, ['center', 'center'])
  assertEquals(table.rows.length, 1)
  const code = blocks[7]
  assertEquals(code.kind === 'code' && code.text, 'npm start')
})

Deno.test("readme: headings take GitHub's ids, so a table of contents finds them", () => {
  const ids = parseReadme(README).flatMap((b) =>
    b.kind === 'heading' ? [b.id] : []
  )
  assertEquals(ids, ['-bomberman-game', 'table-of-contents', 'features'])
  assertEquals(slugOf('Getting Started!'), 'getting-started')
  // An anchor scrolls the README, never a search for a hashtag
  assertEquals(linkOf('#-bomberman-game', repo), { anchor: '-bomberman-game' })
})

Deno.test('readme: relative links and images lead to the repository', () => {
  assertEquals(linkOf('docs/setup.md', repo), {
    href: 'https://github.com/zone01/bomberman/blob/main/docs/setup.md',
  })
  assertEquals(
    imageOf('img/screenshot.1.jpeg', repo),
    'https://raw.githubusercontent.com/zone01/bomberman/main/img/screenshot.1.jpeg',
  )
  assertEquals(linkOf('https://example.com/a', repo), {
    href: 'https://example.com/a',
  })
})

Deno.test('readme: a line break is a space, as on GitHub, unless forced', () => {
  assertEquals(parseReadme('*Une phrase\nsur deux lignes.*'), [
    { kind: 'paragraph', text: '*Une phrase sur deux lignes.*' },
  ])
  assertEquals(parseReadme('Ligne un  \nligne deux<br>trois'), [
    { kind: 'paragraph', text: 'Ligne un\nligne deux\ntrois' },
  ])
})

Deno.test('readme: nothing runs, images only from GitHub', () => {
  assertEquals(linkOf('javascript:alert(1)', repo), undefined)
  assertEquals(linkOf('data:text/html,x', repo), undefined)
  assertEquals(imageOf('https://tracker.example/pixel.gif', repo), undefined)
  assertEquals(
    imageOf('http://raw.githubusercontent.com/a/b/c.png', repo),
    undefined,
  )
  assertEquals(
    imageOf('https://github.com/user-attachments/assets/x', repo),
    'https://github.com/user-attachments/assets/x',
  )
  // Its HTML says Markdown, then is dropped: no tag survives
  const blocks = parseReadme(
    '<p align="center"><img src="logo.png" alt="Logo"><script>alert(1)</script></p>',
  )
  assertEquals(blocks, [{
    kind: 'paragraph',
    text: '![Logo](logo.png)',
  }])
})
