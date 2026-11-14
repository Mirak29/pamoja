import { assertEquals } from 'jsr:@std/assert@^1.0.13'
import { makeRestorePoint } from '@01edu/db'
import { seed } from '/api/seed.ts'
import { getCurrentUser, updateProfile, userIdOfLogin } from '/api/user.ts'
import { getPublicProfile } from '/api/profile.ts'
import { createSession } from '/api/session.ts'
import { request } from '/api/testing.ts'

// The sections a profile can show (§9.2)
const ALL_SECTIONS = 8

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
  // Its order first, then every section it did not name
  assertEquals(after.sectionOrder.slice(0, 3), [
    'badges',
    'reputation',
    'building',
  ])
  assertEquals(after.sectionOrder.length, ALL_SECTIONS)
  assertEquals(after.featured, ['openpay-africa'])

  // The public profile shows the same appearance (§9.2)
  const shared = getPublicProfile('abdou', false)!
  assertEquals(shared.theme, 'terminal')
  assertEquals(shared.accent, 'corail')
  assertEquals(shared.sectionOrder, after.sectionOrder)
})

Deno.test('profile: a profile never ordered shows every section (PAM-302)', () => {
  restore()
  seed()
  // The seed saves no order: the server gives the full default one
  const moussa = getPublicProfile('moussa', true)!
  assertEquals(moussa.sectionOrder.length, ALL_SECTIONS)
  assertEquals(moussa.sectionOrder[0], 'building')
})

Deno.test('profile: the projects highlighted are slugs (PAM-302, §16)', async () => {
  restore()
  seed()
  const abdou = userIdOfLogin('abdou')!
  const cookie = `session=${await createSession(abdou, 'demo')}`
  const current = getCurrentUser(abdou)!
  const save = (featured: string[]) =>
    request('/api/user/profile/update', {
      body: {
        displayName: current.displayName,
        headline: current.headline,
        bio: current.bio,
        country: current.country,
        city: current.city,
        website: current.website,
        matchingMode: current.matchingMode,
        featured,
      },
      cookie,
    })
  assertEquals((await save(['openpay-africa'])).status, 200)
  assertEquals((await save(['<script>'])).status, 400)
  assertEquals((await save(Array(31).fill('a'))).status, 400)
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
