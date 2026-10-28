import { assertEquals } from 'jsr:@std/assert@^1.0.13'
import { makeRestorePoint } from '@01edu/db'
import { now } from '@01edu/time'
import { Profile, Project, ProjectMember, User } from '/api/schema.ts'
import { createSession } from '/api/session.ts'
import { videoOf } from '/api/video-links.ts'
import { previewVideo, thumbnailOf } from '/api/video.ts'
import { request } from '/api/testing.ts'

// Videos embedded by their link (PAM-410, §17.3)
const restore = makeRestorePoint()

Deno.test('video: YouTube, Loom and Vimeo links, nothing else', () => {
  const ids = (link: string) => {
    const video = videoOf(link)
    return video && [video.provider, video.id, video.embedUrl]
  }
  const yt = [
    'YouTube',
    'dQw4w9WgXcQ',
    'https://www.youtube-nocookie.com/embed/dQw4w9WgXcQ',
  ]
  assertEquals(ids('https://www.youtube.com/watch?v=dQw4w9WgXcQ&t=12'), yt)
  assertEquals(ids('https://youtu.be/dQw4w9WgXcQ'), yt)
  assertEquals(ids('https://m.youtube.com/shorts/dQw4w9WgXcQ'), yt)
  assertEquals(
    ids('https://www.loom.com/share/0123456789abcdef0123456789abcdef'),
    [
      'Loom',
      '0123456789abcdef0123456789abcdef',
      'https://www.loom.com/embed/0123456789abcdef0123456789abcdef',
    ],
  )
  assertEquals(ids('https://vimeo.com/76979871'), [
    'Vimeo',
    '76979871',
    'https://player.vimeo.com/video/76979871',
  ])
  // The player is never built from the link itself
  for (
    const link of [
      'https://evil.example/watch?v=dQw4w9WgXcQ',
      'https://www.youtube.com/watch?v=short',
      'javascript:alert(1)',
      'https://vimeo.com/channels/staffpicks',
      'pas un lien',
    ]
  ) assertEquals(videoOf(link), undefined)
})

Deno.test('video: title and thumbnail from oEmbed, YouTube without it', async () => {
  const realFetch = globalThis.fetch
  const asked: string[] = []
  globalThis.fetch = (input: string | URL | Request) => {
    const url = String(input instanceof Request ? input.url : input)
    asked.push(url)
    return Promise.resolve(
      url.includes('vimeo.com')
        ? Response.json({
          title: 'Démo de Senegal Maps',
          thumbnail_url: 'https://i.vimeocdn.com/video/1.jpg',
        })
        : new Response('down', { status: 503 }),
    )
  }
  try {
    const vimeo = await previewVideo('https://vimeo.com/123456789')
    assertEquals(vimeo.title, 'Démo de Senegal Maps')
    assertEquals(vimeo.thumbnailUrl, 'https://i.vimeocdn.com/video/1.jpg')
    // Kept in memory: asked once
    await previewVideo('https://vimeo.com/123456789')
    assertEquals(asked.filter((u) => u.includes('vimeo')).length, 1)
    const youtube = await previewVideo('https://youtu.be/dQw4w9WgXcQ')
    assertEquals(youtube.title, '')
    assertEquals(
      youtube.thumbnailUrl,
      'https://i.ytimg.com/vi/dQw4w9WgXcQ/hqdefault.jpg',
    )
  } finally {
    globalThis.fetch = realFetch
  }
})

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
  return { userId, call }
}

Deno.test('video: the demo video of a project, set by its owner (§6.3)', async () => {
  restore()
  const owner = await dev('abdou')
  const stranger = await dev('yao')
  const projectId = Project.insert({
    ownerId: owner.userId,
    name: 'OpenPay Africa',
    slug: 'openpay-africa',
    description: '',
    visibility: 'public',
    status: 'beta',
    source: 'demo',
    createdAt: now(),
    updatedAt: now(),
  })
  ProjectMember.insert({
    projectId,
    userId: owner.userId,
    role: 'owner',
    joinedAt: now(),
  })
  const set = (who: typeof owner, url: string) =>
    who.call('/api/project/video', { project: 'openpay-africa', url })
  const link = 'https://youtu.be/dQw4w9WgXcQ'
  assertEquals((await set(owner, link)).status, 200)
  const listed = (await owner.call('/api/projects')).json
  assertEquals(listed[0].demoVideoUrl, link)
  assertEquals((await set(owner, 'https://example.com/video')).status, 400)
  assertEquals((await set(stranger, link)).status, 403)
  assertEquals((await set(owner, '')).status, 200)
  assertEquals((await owner.call('/api/projects')).json[0].demoVideoUrl, '')
})

Deno.test('video: the thumbnail served by Pamoja, read once (§17.3)', async () => {
  const realFetch = globalThis.fetch
  const asked: string[] = []
  globalThis.fetch = (input: string | URL | Request) => {
    const url = String(input instanceof Request ? input.url : input)
    asked.push(url)
    if (url.includes('i.ytimg.com/vi/aaaaaaaaaaa')) {
      return Promise.resolve(
        new Response(new Uint8Array([0xff, 0xd8, 0xff]), {
          headers: { 'Content-Type': 'image/jpeg' },
        }),
      )
    }
    if (url.includes('i.ytimg.com')) {
      return Promise.resolve(
        new Response('<html>', {
          headers: { 'Content-Type': 'text/html' },
        }),
      )
    }
    return Promise.resolve(new Response('down', { status: 503 }))
  }
  try {
    const first = await thumbnailOf('https://youtu.be/aaaaaaaaaaa')
    assertEquals(first.headers.get('Content-Type'), 'image/jpeg')
    assertEquals((await first.arrayBuffer()).byteLength, 3)
    await (await thumbnailOf('https://youtu.be/aaaaaaaaaaa')).body?.cancel()
    assertEquals(asked.filter((u) => u.includes('ytimg')).length, 1)
    // Not an image: nothing served
    const refused = await thumbnailOf('https://youtu.be/bbbbbbbbbbb')
      .catch((err) => err)
    assertEquals(refused instanceof Error, true)
  } finally {
    globalThis.fetch = realFetch
  }
})
