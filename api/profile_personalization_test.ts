import { assertEquals } from 'jsr:@std/assert@^1.0.13'
import { makeRestorePoint } from '@01edu/db'
import { seed } from '/api/seed.ts'
import { getCurrentUser, updateProfile, userIdOfLogin } from '/api/user.ts'
import { getPublicProfile } from '/api/profile.ts'

const restore = makeRestorePoint()

Deno.test('profile: theme, accent and section order persist (PAM-302)', () => {
  restore()
  seed()
  const abdou = userIdOfLogin('abdou')!
  const current = getCurrentUser(abdou)!

  updateProfile(abdou, {
    ...current,
    theme: 'terminal',
    accent: 'corail',
    sectionOrder: ['badges', 'reputation', 'building'],
    featured: ['openpay-africa'],
  })
  const after = getCurrentUser(abdou)!
  assertEquals(after.theme, 'terminal')
  assertEquals(after.accent, 'corail')
  assertEquals(after.sectionOrder, ['badges', 'reputation', 'building'])
  assertEquals(after.featured, ['openpay-africa'])

  // The public profile shows the same appearance (§9.2)
  const shared = getPublicProfile('abdou', false)!
  assertEquals(shared.theme, 'terminal')
  assertEquals(shared.accent, 'corail')
  assertEquals(shared.sectionOrder, ['badges', 'reputation', 'building'])
})

Deno.test('profile: an unknown theme or accent is ignored (PAM-302)', () => {
  restore()
  seed()
  const abdou = userIdOfLogin('abdou')!
  const current = getCurrentUser(abdou)!
  updateProfile(abdou, { ...current, theme: 'terminal', accent: 'vert' })
  // Unknown ids keep the saved appearance, never break it
  updateProfile(abdou, { ...current, theme: 'bogus', accent: 'bogus' })
  const kept = getCurrentUser(abdou)!
  assertEquals(kept.theme, 'terminal')
  assertEquals(kept.accent, 'vert')
})
