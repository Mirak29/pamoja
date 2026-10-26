import { assert, assertEquals } from 'jsr:@std/assert@^1.0.13'
import { makeRestorePoint } from '@01edu/db'
import { now } from '@01edu/time'
import { cleanMedia, MEDIA_DIR } from '/api/media.ts'
import { Profile, Project, ProjectMember, User } from '/api/schema.ts'
import { createSession } from '/api/session.ts'
import server from '/api/server.ts'
import { request } from '/api/testing.ts'

// The gallery of a project page (PAM-425, §6.3, §17.3)
const restore = makeRestorePoint()

let lastGithubId = 0
const dev = async (login: string) => {
  const at = now()
  const userId = User.insert({
    githubId: ++lastGithubId,
    githubUsername: login,
    avatarUrl: '',
    source: 'github',
    createdAt: at,
    updatedAt: at,
  })
  Profile.insert({
    userId,
    displayName: login,
    theme: 'minimal',
    accent: 'indigo',
    availability: 'available',
    matchingMode: 'instant',
    createdAt: at,
    updatedAt: at,
  })
  const cookie = `session=${await createSession(userId, 'demo')}`
  const call = async (path: string, body?: unknown) => {
    const res = await request(path, { body, cookie })
    return { status: res.status, json: await res.json().catch(() => null) }
  }
  return { userId, cookie, call }
}

type Dev = Awaited<ReturnType<typeof dev>>

const project = (ownerId: number, members: [number, string][] = []) => {
  const projectId = Project.insert({
    ownerId,
    name: 'OpenPay Africa',
    slug: 'openpay-africa',
    description: '',
    visibility: 'public',
    status: 'beta',
    source: 'demo',
    createdAt: now(),
    updatedAt: now(),
  })
  for (const [userId, role] of [[ownerId, 'owner'], ...members] as const) {
    ProjectMember.insert({ projectId, userId, role, joinedAt: now() })
  }
  return projectId
}

// A PNG header is all the server reads: the type, then the size
const png = () => {
  const bytes = new Uint8Array(33)
  bytes.set([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0, 0, 0, 13])
  bytes.set([0x49, 0x48, 0x44, 0x52], 12)
  const view = new DataView(bytes.buffer)
  view.setUint32(16, 1280)
  view.setUint32(20, 800)
  return bytes
}

const upload = async (who: Dev) => {
  const form = new FormData()
  form.append('file', new File([png()], 'capture.png'))
  const res = await server.fetch(
    new Request('http://localhost/api/media/upload', {
      method: 'POST',
      body: form,
      headers: { Cookie: who.cookie },
    }),
  )
  return (await res.json()) as { id: number; key: string }
}

const setGallery = (who: Dev, media: number[], slug = 'openpay-africa') =>
  who.call('/api/project/gallery', { project: slug, media })

const galleryOf = async (who: Dev) => {
  const list = (await who.call('/api/projects')).json as {
    slug: string
    gallery: { id: number }[]
  }[]
  return list.find((p) => p.slug === 'openpay-africa')!.gallery
    .map((m) => m.id)
}

const exists = (key: string) => {
  try {
    Deno.statSync(`${MEDIA_DIR}/${key}`)
    return true
  } catch {
    return false
  }
}

Deno.test('gallery: set, reordered, a screenshot left out is deleted', async () => {
  restore()
  const owner = await dev('abdou')
  project(owner.userId)
  const [a, b, c] = [
    await upload(owner),
    await upload(owner),
    await upload(owner),
  ]
  const set = await setGallery(owner, [a.id, b.id, c.id])
  assertEquals(set.status, 200)
  assertEquals(set.json.map((m: { id: number }) => m.id), [a.id, b.id, c.id])
  assertEquals(await galleryOf(owner), [a.id, b.id, c.id])
  // A new order, b left out: its row and its file are gone
  await setGallery(owner, [c.id, a.id])
  assertEquals(await galleryOf(owner), [c.id, a.id])
  assert(!exists(b.key))
  assert(exists(a.key) && exists(c.key))
  // Attached, the screenshots outlive the cleaning of lost uploads
  cleanMedia(now() + 25 * 3600)
  assertEquals(await galleryOf(owner), [c.id, a.id])
})

Deno.test('gallery: the owner and the maintainers only', async () => {
  restore()
  const owner = await dev('abdou')
  const maintainer = await dev('awa')
  const contributor = await dev('kofi')
  const stranger = await dev('yao')
  project(owner.userId, [
    [maintainer.userId, 'maintainer'],
    [contributor.userId, 'contributor'],
  ])
  const shot = await upload(maintainer)
  assertEquals((await setGallery(maintainer, [shot.id])).status, 200)
  for (const who of [contributor, stranger]) {
    const mine = await upload(who)
    assertEquals((await setGallery(who, [mine.id])).status, 403)
  }
  assertEquals((await setGallery(owner, [], 'nope')).status, 404)
  // Seen by any developer once it is in the gallery
  const res = await request(`/api/media?key=${shot.key}`, {
    cookie: stranger.cookie,
  })
  assertEquals(res.status, 200)
  await res.body?.cancel()
})

Deno.test('gallery: 8 at most, own uploads only, nothing changed when refused', async () => {
  restore()
  const owner = await dev('abdou')
  const other = await dev('awa')
  project(owner.userId)
  const first = await upload(owner)
  await setGallery(owner, [first.id])
  const nine = []
  for (let i = 0; i < 9; i++) nine.push((await upload(owner)).id)
  assertEquals((await setGallery(owner, nine)).status, 400)
  const theirs = await upload(other)
  assertEquals((await setGallery(owner, [first.id, theirs.id])).status, 400)
  assertEquals((await setGallery(owner, [first.id, first.id])).status, 400)
  assertEquals(await galleryOf(owner), [first.id])
  assert(exists(first.key))
})
