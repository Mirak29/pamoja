import { assert, assertEquals } from 'jsr:@std/assert@^1.0.13'
import { db, makeRestorePoint } from '@01edu/db'
import { seed } from '/api/seed.ts'
import { listDevelopers } from '/api/explore.ts'
import { listExploreProjects, listMyProjects } from '/api/projects.ts'
import { userIdOfLogin } from '/api/user.ts'

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

Deno.test('explore: every public project, a private one for its members only (PAM-505)', () => {
  restore()
  seed()
  const moussa = userIdOfLogin('moussa')!
  const abdou = userIdOfLogin('abdou')!
  // Moussa is no member of OpenPay Africa: he finds it all the same
  const forMoussa = listExploreProjects(moussa).map((p) => p.slug)
  assert(forMoussa.includes('openpay-africa'))
  assert(forMoussa.length > listMyProjects(moussa).length)

  db.prepare("UPDATE project SET visibility = 'private' WHERE slug = ?")
    .run('openpay-africa')
  assert(!listExploreProjects(moussa).some((p) => p.slug === 'openpay-africa'))
  assert(listExploreProjects(abdou).some((p) => p.slug === 'openpay-africa'))
})
