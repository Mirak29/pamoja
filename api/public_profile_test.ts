import { assertEquals } from 'jsr:@std/assert@^1.0.13'
import { db, makeRestorePoint } from '@01edu/db'
import { now } from '@01edu/time'
import { HelpRequest, Profile, Project, User } from '/api/schema.ts'
import { createSession } from '/api/session.ts'
import { setDeclaredSkills, skillIdsOf } from '/api/skills.ts'
import { request } from '/api/testing.ts'

const restore = makeRestorePoint()

let githubId = 0
const dev = (login: string) => {
  const at = now()
  const userId = User.insert({
    githubId: ++githubId,
    githubUsername: login,
    avatarUrl: `https://avatars.example/${login}`,
    email: `${login}@example.com`,
    source: 'github',
    createdAt: at,
    updatedAt: at,
  })
  Profile.insert({
    userId,
    displayName: `${login} Name`,
    headline: 'Go et SQLite',
    country: 'SN',
    city: 'Dakar',
    theme: 'minimal',
    accent: 'indigo',
    availability: 'available',
    matchingMode: 'instant',
    matchingFilters: JSON.stringify({ minScore: 70, helpTypes: ['debugging'] }),
    createdAt: at,
    updatedAt: at,
  })
  return userId
}

const project = (
  ownerId: number,
  slug: string,
  visibility: string,
  members: [number, string][],
) => {
  const projectId = Project.insert({
    ownerId,
    name: `Projet ${slug}`,
    slug,
    description: 'Paiements',
    visibility,
    status: 'beta',
    skills: skillIdsOf(['Go']),
    source: 'platform',
    createdAt: now(),
    updatedAt: now(),
  })
  for (const [userId, role] of members) {
    db.exec(`INSERT INTO projectMember (projectId, userId, role, joinedAt)
      VALUES (${projectId}, ${userId}, '${role}', 0)`)
  }
}

const help = (authorId: number, acceptedBy: number | null) =>
  HelpRequest.insert({
    authorId,
    category: 'debugging',
    title: 'Le verrou SQLite',
    description: '',
    skills: skillIdsOf(['Go']),
    status: acceptedBy ? 'accepted' : 'open',
    acceptedBy,
    acceptedAt: acceptedBy ? now() : null,
    expiresAt: now() + 86_400,
    source: 'platform',
    createdAt: now(),
    updatedAt: now(),
  })

const read = async (username: string, cookie?: string) => {
  const res = await request(`/api/user?username=${username}`, {
    cookie: cookie && `session=${cookie}`,
  })
  return { status: res.status, json: await res.json().catch(() => null) }
}

Deno.test('public profile: what anyone sees at /@login (§9.1)', async () => {
  restore()
  const kadi = dev('Kadi')
  const sena = dev('sena')
  setDeclaredSkills(kadi, { skills: ['Go'], domains: [] })
  project(sena, 'kora', 'public', [[sena, 'owner'], [kadi, 'contributor']])
  // Unlisted, or only followed: not on the profile
  project(sena, 'secret', 'unlisted', [[sena, 'owner'], [kadi, 'maintainer']])
  project(sena, 'watched', 'public', [[sena, 'owner'], [kadi, 'observer']])
  help(sena, kadi)
  help(kadi, null)

  // The login as GitHub writes it, whatever the case of the address
  const { status, json } = await read('kadi')
  assertEquals(status, 200)
  assertEquals(
    [json.login, json.displayName, json.country, json.city, json.available],
    ['Kadi', 'Kadi Name', 'SN', 'Dakar', true],
  )
  assertEquals(json.skills.map((s: { name: string }) => s.name), ['Go'])
  assertEquals(json.helpTypes, ['debugging'])
  assertEquals(
    json.projects.map((
      p: Record<string, unknown>,
    ) => [p.slug, p.role, p.owner]),
    [['kora', 'contributor', 'sena']],
  )
  assertEquals(json.projects[0].stack, ['Go'])
  // Never the email nor the matching threshold
  assertEquals('email' in json || 'minScore' in json, false)
  assertEquals(JSON.stringify(json).includes('@example.com'), false)
  // The help activity is for a signed-in visitor only
  assertEquals(json.activity, [])
  const signedIn = await read('Kadi', await createSession(sena, 'demo'))
  assertEquals(signedIn.json.activity.length, 2)

  assertEquals((await read('nobody')).status, 404)
})
