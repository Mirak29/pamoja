import { assert, assertEquals } from 'jsr:@std/assert@^1.0.13'
import { makeRestorePoint } from '@01edu/db'
import { seed } from '/api/seed.ts'
import { photoOf, profileCardData } from '/api/share-card.ts'
import { forgetPreviews, previewOf } from '/api/og.ts'

const restore = makeRestorePoint()

Deno.test('share card: the style of the profile, or one asked for that exists', () => {
  restore()
  seed()
  // The profile's own: minimal and indigo in the seed
  const own = profileCardData('moussa')!
  assertEquals([own.theme, own.accent], ['minimal', 'indigo'])
  const asked = profileCardData('moussa', { theme: 'sombre', accent: 'vert' })!
  assertEquals([asked.theme, asked.accent], ['sombre', 'vert'])
  // Unknown values are never drawn: the profile's instead
  const unknown = profileCardData('moussa', { theme: 'rose', accent: '#f00' })!
  assertEquals([unknown.theme, unknown.accent], ['minimal', 'indigo'])
})

Deno.test('share card: the badges unlocked, the highest level first', () => {
  restore()
  seed()
  const { badges } = profileCardData('moussa')!
  assert(badges.length > 0 && badges.length <= 4)
  assertEquals(badges[0].name, 'Reviewer de confiance')
  const levels = badges.map((b) => b.level)
  assertEquals([...levels].sort((a, b) => b - a), levels)
  assert(levels.every((level) => level > 0))
})

Deno.test('share card: a shared link carries its style to the preview, if known', () => {
  restore()
  seed()
  forgetPreviews()
  const origin = 'https://pamoja.example'
  const styled = previewOf('/@moussa', origin, '?theme=cyber&accent=bad')
  assertEquals(
    styled.image,
    `${origin}/api/user/card?login=moussa&theme=cyber`,
  )
  // An attribute or a script never reaches the page through it
  const evil = previewOf('/@moussa', origin, '?theme="><script>')
  assertEquals(evil.image, `${origin}/api/user/card?login=moussa`)
})

Deno.test('share card: a photo is read from GitHub avatars only', async () => {
  // Elsewhere, nothing is fetched: no request leaves for the address
  assertEquals(await photoOf('https://example.com/me.png'), undefined)
  assertEquals(
    await photoOf('http://avatars.githubusercontent.com/u/1'),
    undefined,
  )
  assertEquals(await photoOf('not a url'), undefined)
})
