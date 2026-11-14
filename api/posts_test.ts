import { assertEquals } from 'jsr:@std/assert@^1.0.13'
import { makeRestorePoint } from '@01edu/db'
import { now } from '@01edu/time'
import { Community, Profile, User } from '/api/schema.ts'
import { createSession } from '/api/session.ts'
import server from '/api/server.ts'
import { request } from '/api/testing.ts'

// Posts saved with their images and their video (PAM-427, §10.1, §17.3)
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
  const upload = async () => {
    const bytes = new Uint8Array(33)
    bytes.set([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0, 0, 0, 13])
    bytes.set([0x49, 0x48, 0x44, 0x52], 12)
    new DataView(bytes.buffer).setUint32(16, 1200)
    new DataView(bytes.buffer).setUint32(20, 800)
    const body = new FormData()
    body.append('file', new File([bytes], 'capture.png'))
    const res = await server.fetch(
      new Request('http://localhost/api/media/upload', {
        method: 'POST',
        body,
        headers: { Cookie: cookie },
      }),
    )
    return (await res.json()).id as number
  }
  return { userId, call, upload }
}

const post = {
  community: '',
  type: 'Vitrine',
  title: '',
  body: 'AfriCommerce accepte le paiement à la livraison.',
}

Deno.test('posts: published with images and a video, read by the feed', async () => {
  restore()
  Community.insert({
    name: 'Go',
    slug: 'go',
    description: '',
    type: 'technology',
    source: 'demo',
    createdAt: now(),
  })
  const kofi = await dev('kofi')
  const awa = await dev('awa')
  const shots = [await kofi.upload(), await kofi.upload()]
  const video = 'https://youtu.be/dQw4w9WgXcQ'
  const created = await kofi.call('/api/post/create', {
    ...post,
    community: 'go',
    media: shots,
    videoUrl: video,
  })
  assertEquals(created.status, 200)
  assertEquals(created.json.media.map((m: { id: number }) => m.id), shots)
  const [seen] = (await awa.call('/api/posts')).json
  assertEquals(
    [seen.author, seen.community, seen.type, seen.videoUrl, seen.media.length],
    ['kofi', 'go', 'Vitrine', video, 2],
  )
})

Deno.test('posts: checked before anything is saved', async () => {
  restore()
  const kofi = await dev('kofi')
  const awa = await dev('awa')
  const theirs = await awa.upload()
  const refused = [
    { ...post, type: 'Inconnu' },
    { ...post, body: '   ' },
    { ...post, community: 'nope' },
    { ...post, videoUrl: 'https://example.com/v' },
    { ...post, media: [theirs] },
    {
      ...post,
      media: [
        await kofi.upload(),
        await kofi.upload(),
        await kofi.upload(),
        await kofi.upload(),
        await kofi.upload(),
      ],
    },
  ]
  for (const input of refused) {
    assertEquals((await kofi.call('/api/post/create', input)).status, 400)
  }
  assertEquals((await kofi.call('/api/posts')).json, [])
})

// The activity of a profile reads the posts of its developer (§9.1)
Deno.test('posts: those of one developer, for their profile', async () => {
  restore()
  const kofi = await dev('kofi')
  const awa = await dev('awa')
  await kofi.call('/api/post/create', post)
  await awa.call('/api/post/create', { ...post, body: 'Le post d’Awa' })
  const { status, json } = await awa.call('/api/posts?author=kofi')
  assertEquals(status, 200)
  assertEquals(json.map((p: { author: string }) => p.author), ['kofi'])
  // Without an author, the whole feed
  assertEquals((await awa.call('/api/posts')).json.length, 2)
})
