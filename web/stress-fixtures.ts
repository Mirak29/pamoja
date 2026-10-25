// Thousands of fixtures for the screens that do not read the API yet: 3 000
// developers, 300 communities, 2 000 posts and a thread of 500 replies, with
// long names and texts on purpose. Dev build only (web/debug-app.ts), and only
// when asked: open a page with ?stress, the tab keeps it until ?stress=0. With
// the data of the API at volume: deno task stress.
import { communities } from '/web/fixtures/communities.ts'
import { me, people, type Person } from '/web/fixtures/people.ts'
import { posts } from '/web/fixtures/posts.ts'

const KEY = 'pamoja-stress'

const asked = () => {
  try {
    const flag = new URLSearchParams(location.search).get('stress')
    if (flag === '0') sessionStorage.removeItem(KEY)
    else if (flag !== null) sessionStorage.setItem(KEY, '1')
    return sessionStorage.getItem(KEY) === '1'
  } catch {
    // No storage: never on
    return false
  }
}

if (asked()) {
  const N = 3000
  const base = Object.values(people) as Person[]
  const all = people as Record<string, Person>
  const long =
    'Ingénieure full-stack passionnée par les systèmes distribués, le paiement mobile et la formation des développeurs juniors en Afrique de l’Ouest'
  const slugs = communities.map((c) => c.slug)

  for (let i = 0; i < N; i++) {
    const model = base[i % base.length]
    const login = `dev${String(i).padStart(5, '0')}`
    all[login] = {
      ...model,
      login,
      name: i % 7 === 0
        ? `${model.name} Wonderful-Extraordinarily-Long Name ${i}`
        : `${model.name} ${i}`,
      headline: i % 7 === 0 ? long : model.headline,
      communities: slugs.slice(0, 4),
      follows: [],
      avatarUrl: undefined,
      githubId: -(100000 + i),
      moderator: false,
    }
  }
  me.follows = Object.keys(all).filter((login) => login.startsWith('dev'))
    .filter((_, i) => i % 3 === 0)

  for (const community of communities) community.members += N
  for (let c = 0; c < 300; c++) {
    communities.push({
      slug: `stress-${c}`,
      name: `Communauté de test numéro ${c} au nom assez long`,
      type: (['Technologie', 'Pays', 'Domaine'] as const)[c % 3],
      members: 1000 + c,
      description: long,
    })
  }

  const model = posts.find((p) => !p.parent)!
  const at = Date.now()
  for (let i = 0; i < 2000; i++) {
    posts.push({
      ...model,
      id: `stress${i}`,
      community: slugs[i % 4],
      author: `dev${
        String(i % N).padStart(5, '0')
      }` as Person['login'] as never,
      title: i % 9 ? `Publication ${i}` : long,
      body: `${long}\n\n${long}`,
      at: at - i * 600_000,
      reactions: {},
      reposts: [],
      parent: undefined,
      root: undefined,
      acceptedReply: undefined,
      bookmarks: i % 4 ? [] : [me.login],
    })
  }
  // One thread of 500 replies
  for (let k = 0; k < 500; k++) {
    posts.push({
      ...model,
      id: `stress0r${k}`,
      community: slugs[0],
      author: `dev${String(k).padStart(5, '0')}` as never,
      type: 'Réponse',
      title: '',
      body: k % 10 ? `Réponse ${k}` : long,
      at: at - 1000 + k,
      reactions: {},
      reposts: [],
      parent: 'stress0',
      root: 'stress0',
    })
  }
  console.info('stress fixtures', Object.keys(all).length, posts.length)
}
