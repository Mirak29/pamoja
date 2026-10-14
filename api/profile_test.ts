import { assertEquals } from 'jsr:@std/assert@^1.0.13'
import { makeRestorePoint } from '@01edu/db'
import server from '/api/server.ts'
import { parseLocation } from '/api/vocabulary.ts'

// The test env logs in the simulated GitHub account: « Dakar, Senegal »,
// public repos in Go and TypeScript (§5.3)
const restore = makeRestorePoint()

const call = async (
  path: string,
  { body, cookie }: { body?: unknown; cookie?: string } = {},
) => {
  const res = await server.fetch(
    new Request(`http://localhost${path}`, {
      method: body === undefined ? 'GET' : 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(cookie && { Cookie: `session=${cookie}` }),
      },
      body: body === undefined ? undefined : JSON.stringify(body),
    }),
  )
  return { status: res.status, json: await res.json().catch(() => null), res }
}

const login = async () => {
  const { json } = await call('/api/auth/github')
  const params = new URL(json.url, 'http://localhost/').searchParams
  const { res } = await call('/api/auth/github/callback', {
    body: { code: params.get('code'), state: params.get('state') },
  })
  return res.headers.get('Set-Cookie')?.match(/session=([^;]*)/)?.[1] ?? ''
}

const profile = {
  displayName: 'Abdou Sow',
  headline: 'Je construis OpenPay Africa',
  bio: '',
  country: 'SN',
  city: 'Dakar',
  website: 'abdousow.dev',
  matchingMode: 'digest',
}

Deno.test('profile: a GitHub location gives the city and the country', () => {
  assertEquals(parseLocation('Dakar, Senegal'), {
    city: 'Dakar',
    country: 'SN',
  })
  assertEquals(parseLocation("Abidjan, Côte d'Ivoire"), {
    city: 'Abidjan',
    country: 'CI',
  })
  assertEquals(parseLocation('Sénégal'), { city: null, country: 'SN' })
  assertEquals(parseLocation('Lagos'), { city: 'Lagos', country: null })
  assertEquals(parseLocation('Paris, France'), {
    city: 'Paris',
    country: 'France',
  })
  assertEquals(parseLocation(null), { city: null, country: null })
})

Deno.test('profile: the first login prefills it from GitHub', async () => {
  restore()
  const { json } = await call('/api/user/me', { cookie: await login() })
  assertEquals(json.displayName, 'Abdou Sow')
  assertEquals(json.bio, 'Ingénieur backend à Dakar.')
  assertEquals([json.city, json.country], ['Dakar', 'SN'])
  assertEquals(json.skills, [
    { name: 'Go', sources: ['github'] },
    { name: 'TypeScript', sources: ['github'] },
  ])
  assertEquals(json.matchingMode, 'instant')
})

Deno.test('profile: saved fields, emptied ones included', async () => {
  restore()
  const cookie = await login()
  const { status, json } = await call('/api/user/profile/update', {
    body: profile,
    cookie,
  })
  assertEquals(status, 200)
  assertEquals(json.headline, profile.headline)
  assertEquals(json.bio, '')
  assertEquals(json.matchingMode, 'digest')
})

Deno.test('profile: skills come from the vocabulary only', async () => {
  restore()
  const cookie = await login()
  const refused = await call('/api/user/skills/update', {
    body: { skills: ['Go', 'Cobol++'], domains: [] },
    cookie,
  })
  assertEquals(refused.status, 400)

  const { json } = await call('/api/user/skills/update', {
    body: { skills: ['Go', 'SQLite'], domains: ['Backend'] },
    cookie,
  })
  assertEquals(json.skills, [
    { name: 'Go', sources: ['github', 'declared'] },
    { name: 'TypeScript', sources: ['github'] },
    { name: 'SQLite', sources: ['declared'] },
  ])
  assertEquals(json.domains, ['Backend'])
})

Deno.test('profile: intents replace the previous ones', async () => {
  restore()
  const cookie = await login()
  await call('/api/user/intents/update', {
    body: { intents: ['Faire des reviews', 'Mentorer'] },
    cookie,
  })
  const { json } = await call('/api/user/intents/update', {
    body: { intents: ['Trouver des projets'] },
    cookie,
  })
  assertEquals(json.intents, ['Trouver des projets'])
  assertEquals(
    (await call('/api/user/intents/update', {
      body: { intents: ['Inventée'] },
      cookie,
    })).status,
    400,
  )
})

Deno.test('profile: a later login never overwrites an edit', async () => {
  restore()
  const cookie = await login()
  await call('/api/user/profile/update', {
    body: { ...profile, city: 'Thiès', bio: '' },
    cookie,
  })
  const { json } = await call('/api/user/me', { cookie: await login() })
  assertEquals(json.city, 'Thiès')
  // Emptied on purpose: GitHub does not fill it again
  assertEquals(json.bio, '')
})

Deno.test('profile: writing needs a session', async () => {
  restore()
  assertEquals(
    (await call('/api/user/profile/update', { body: profile })).status,
    401,
  )
})
