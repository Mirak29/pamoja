import { assertEquals, assertThrows } from 'jsr:@std/assert@^1.0.13'
import { makeRestorePoint } from '@01edu/db'
import { seed } from '/api/seed.ts'
import { userIdOfLogin } from '/api/user.ts'
import { updateProjectInfo } from '/api/project-gallery.ts'
import { listMyProjects } from '/api/projects.ts'

const restore = makeRestorePoint()

// The open needs of a project the developer is a member of, by its slug
const needsOf = (userId: number, slug: string) =>
  listMyProjects(userId).find((project) => project.slug === slug)!.needs

const info = (over: Partial<Parameters<typeof updateProjectInfo>[2]> = {}) => ({
  name: 'OpenPay Africa',
  description: 'Paiement à la livraison',
  vision: 'Le paiement pour toute l’Afrique de l’Ouest',
  needs: ['Tests'],
  ...over,
})

Deno.test('project update: an owner saves the information and the needs (PAM-402)', () => {
  restore()
  seed()
  const abdou = userIdOfLogin('abdou')!
  const slug = 'openpay-africa'

  // A need kept by its title stays, one left out goes, a new one is added
  const saved = updateProjectInfo(
    abdou,
    slug,
    info({ needs: ['Tests', 'DevOps'] }),
  )
  assertEquals(saved.needs, ['Tests', 'DevOps'])
  assertEquals(needsOf(abdou, slug), ['Tests', 'DevOps'])

  // The needs are trimmed, deduplicated and emptied titles dropped
  const again = updateProjectInfo(
    abdou,
    slug,
    info({ needs: ['  Go  ', 'Go', ''] }),
  )
  assertEquals(again.needs, ['Go'])
  assertEquals(needsOf(abdou, slug), ['Go'])
})

Deno.test('project update: only the owner and the maintainers may (PAM-402)', () => {
  restore()
  seed()
  const moussa = userIdOfLogin('moussa')!
  // Moussa is not a member of OpenPay: forbidden
  assertThrows(() => updateProjectInfo(moussa, 'openpay-africa', info()))
  // An unknown project is a 404
  assertThrows(() => updateProjectInfo(moussa, 'nope', info()))
})

Deno.test('project update: a name is required, a need is bounded (PAM-402)', () => {
  restore()
  seed()
  const abdou = userIdOfLogin('abdou')!
  assertThrows(() =>
    updateProjectInfo(abdou, 'openpay-africa', info({ name: '  ' }))
  )
  assertThrows(() =>
    updateProjectInfo(
      abdou,
      'openpay-africa',
      info({ needs: ['x'.repeat(200)] }),
    )
  )
  assertThrows(() =>
    updateProjectInfo(
      abdou,
      'openpay-africa',
      info({ needs: Array.from({ length: 20 }, (_, i) => `need-${i}`) }),
    )
  )
})
