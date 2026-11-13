import { assertEquals } from 'jsr:@std/assert@^1.0.13'
import { makeRestorePoint } from '@01edu/db'
import { now } from '@01edu/time'
import {
  Community,
  HelpRequest,
  Post,
  Profile,
  Project,
  User,
  UserSkill,
} from '/api/schema.ts'
import { createSession } from '/api/session.ts'
import { skillIdsOf } from '/api/skills.ts'
import { documentsOf } from '/api/search.ts'
import { request } from '/api/testing.ts'

// The search (§10.4): without Meilisearch, as in the tests, the same
// search runs in SQL. What is not public is never found, in either.
const restore = makeRestorePoint()

Deno.test('search: public content only, from SQL when Meilisearch is not set', async () => {
  try {
    const at = now()
    const [go] = skillIdsOf(['Go'])
    let githubId = 900_000
    const dev = (login: string, name: string) => {
      const userId = User.insert({
        githubId: ++githubId,
        githubUsername: login,
        avatarUrl: '',
        source: 'github',
        createdAt: at,
        updatedAt: at,
      })
      Profile.insert({
        userId,
        displayName: name,
        city: 'Dakar',
        country: 'Sénégal',
        theme: 'minimal',
        accent: 'indigo',
        availability: 'available',
        matchingMode: 'instant',
        createdAt: at,
        updatedAt: at,
      })
      return userId
    }
    const fatou = dev('fatou-dev', 'Fatou Ndiaye')
    UserSkill.insert({
      userId: fatou,
      skillId: go,
      source: 'self',
      createdAt: at,
    })
    const banned = dev('spammeur', 'Fatou Spam')
    User.update({ userId: banned, suspendedUntil: at + 86_400 })

    const project = (slug: string, visibility: string) =>
      Project.insert({
        ownerId: fatou,
        name: `Tontine ${slug}`,
        slug,
        description: 'Épargne collective en Go',
        visibility,
        status: 'active',
        source: 'platform',
        createdAt: at,
        updatedAt: at,
        skills: [go],
      })
    const tontine = project('tontine-public', 'public')
    project('tontine-cachee', 'unlisted')

    const communityId = Community.insert({
      slug: 'tontines',
      name: 'Tontines numériques',
      type: 'domain',
      description: 'Finance solidaire',
      source: 'platform',
      createdAt: at,
    })
    const post = (title: string, extra = {}) =>
      Post.insert({
        authorId: fatou,
        communityId,
        type: 'Question',
        title,
        body: 'Comment gérer les tours de tontine ?',
        source: 'platform',
        createdAt: at,
        updatedAt: at,
        ...extra,
      })
    const shown = post('Tontine et Go')
    post('Tontine masquée', { hiddenAt: at })
    post('Réponse sur la tontine', { parentId: shown, rootId: shown })

    const help = (title: string, targetUserId?: number) =>
      HelpRequest.insert({
        authorId: fatou,
        targetUserId,
        projectId: tontine,
        category: 'code_review',
        title,
        description: 'Relire le calcul des tours',
        skills: [go],
        status: 'open',
        expiresAt: at + 7 * 86_400,
        source: 'platform',
        createdAt: at,
        updatedAt: at,
      })
    help('Review de la tontine')
    help('Tontine, demande privée', banned)

    // Signed in only
    assertEquals((await request('/api/search?q=tontine')).status, 401)
    const cookie = `session=${await createSession(fatou, 'demo')}`
    const find = async (q: string) =>
      (await request(`/api/search?q=${encodeURIComponent(q)}`, { cookie }))
        .json()

    const found = await find('tontine')
    assertEquals(found.engine, 'sql')
    assertEquals(found.projects.map((p: { slug: string }) => p.slug), [
      'tontine-public',
    ])
    assertEquals(found.projects[0].skills, ['Go'])
    assertEquals(found.communities.map((c: { slug: string }) => c.slug), [
      'tontines',
    ])
    assertEquals(found.posts.map((p: { title: string }) => p.title), [
      'Tontine et Go',
    ])
    assertEquals(
      found.help_requests.map((h: { title: string }) => h.title),
      ['Review de la tontine'],
    )
    assertEquals(found.help_requests[0].project, 'Tontine tontine-public')

    // A developer by name, login, city or skill; never a suspended one
    for (const q of ['Fatou', 'fatou-dev', 'Dakar']) {
      assertEquals(
        (await find(q)).developers.map((d: { login: string }) => d.login),
        ['fatou-dev'],
        q,
      )
    }
    const bySkill = await find('Go')
    assertEquals(
      bySkill.developers.some((d: { login: string }) =>
        d.login === 'fatou-dev'
      ),
      true,
    )
    assertEquals(bySkill.developers[0].available, true)
    // Each skill once, though declared and also read on GitHub
    UserSkill.insert({
      userId: fatou,
      skillId: go,
      source: 'github',
      createdAt: at,
    })
    assertEquals(
      (await find('fatou-dev')).developers[0].skills,
      ['Go'],
    )

    // What is typed is text, never a pattern
    assertEquals((await find('%')).developers, [])

    // One document again, or gone: what the sync sends to Meilisearch
    assertEquals(documentsOf('posts', { ids: [shown] }).length, 1)
    Post.update({ postId: shown, hiddenAt: at })
    assertEquals(documentsOf('posts', { ids: [shown] }), [])
  } finally {
    restore()
  }
})
