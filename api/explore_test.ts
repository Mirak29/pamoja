import { assert, assertEquals } from 'jsr:@std/assert@^1.0.13'
import { makeRestorePoint } from '@01edu/db'
import { seed } from '/api/seed.ts'
import { listDevelopers } from '/api/explore.ts'

const restore = makeRestorePoint()

Deno.test('explore: developers with skills, intents and a country name (PAM-505)', () => {
  restore()
  seed()
  const devs = listDevelopers()
  assert(devs.length >= 9)
  const moussa = devs.find((d) => d.login === 'moussa')!
  assertEquals(moussa.name, 'Moussa Diallo')
  assert(moussa.skills.includes('Go'))
  assert(moussa.intents.length > 0)
  // The country is a readable name, not an ISO code
  assert(moussa.country.length > 2)
  assertEquals(typeof moussa.available, 'boolean')
})
