import { signal } from '@preact/signals'
import { hoursAgo } from '/web/fixtures/clock.ts'
import { communities } from '/web/fixtures/communities.ts'
import { pushNotification } from '/web/fixtures/notifications.ts'
import { type Login, people, type Person } from '/web/fixtures/people.ts'
import { proofs } from '/web/fixtures/reputation.ts'
import type { ProjectSlug } from '/web/fixtures/projects.ts'

export type PostType =
  | 'Discussion'
  | 'Question'
  | 'Mise à jour de projet'
  | 'Vitrine'
  | 'Ressource'
  | 'Opportunité'
  | 'Release'
  | 'Réponse'

/** A reply is a post attached to another one (cahier des charges §10.1) */
export type Post = {
  id: string
  community: string
  author: Login
  type: PostType
  title: string
  body: string
  at: number
  reactions: { like?: Login[]; useful?: Login[]; thanks?: Login[] }
  reposts: { by: Login; at: number }[]
  parent?: string
  root?: string
  acceptedReply?: string
  link?: ProjectSlug
  images?: number
  /** Embedded by link only: YouTube, Loom or Vimeo (§17.3) */
  video?: string
  bookmarks?: Login[]
  /** Hidden by moderation: only its author still sees it */
  hidden?: boolean
  demo: boolean
}

const BT = '`'
const FENCE = BT.repeat(3)

type Draft = Omit<Post, 'at' | 'reposts' | 'demo'> & { hoursAgo: number }
const post = ({ hoursAgo: hours, ...draft }: Draft): Post => ({
  ...draft,
  at: hoursAgo(hours),
  reposts: [],
  demo: true,
})

// Replies are listed in order, each one hour after the previous
const replies = (
  root: Pick<Post, 'id' | 'community'>,
  hours: number,
  list: [Login, string, Post['reactions']?][],
): Post[] =>
  list.map(([author, body, reactions], k) =>
    post({
      id: `${root.id}c${k}`,
      community: root.community,
      author,
      type: 'Réponse',
      title: '',
      body,
      hoursAgo: hours - 1 - k,
      reactions: reactions ?? {},
      parent: root.id,
      root: root.id,
    })
  )

export const posts: Post[] = [
  post({
    id: 'po1',
    community: 'go',
    author: 'zeinab',
    type: 'Question',
    title: 'Vos patterns pour les transactions SQLite en Go ?',
    body:
      `Sur un service de paiement, j’ai des ${BT}database is locked${BT} dès qu’on dépasse une dizaine de requêtes concurrentes.\n\nJ’ouvre mes transactions comme ça :\n\n${FENCE}go\ntx, err := db.BeginTx(ctx, nil)\n${FENCE}\n\nVous passez par un seul writer, ou par ${BT}BEGIN IMMEDIATE${BT} ?`,
    hoursAgo: 9,
    reactions: { like: ['moussa', 'abdou'], useful: ['fatou'] },
  }),
  ...replies({ id: 'po1', community: 'go' }, 9, [
    [
      'moussa',
      `Un seul writer derrière un channel, et ${BT}_txlock=immediate${BT} dans le DSN. Plus de verrou depuis.`,
      { like: ['abdou'] },
    ],
    [
      'abdou',
      'Même souci sur OpenPay, c’est l’issue #44. Je teste la piste de Moussa.',
    ],
  ]),
  post({
    id: 'po2',
    community: 'senegal-developers',
    author: 'awa',
    type: 'Vitrine',
    title: 'Senegal Maps v1.2 : les points d’eau sont en ligne',
    body:
      'Forages et bornes fontaines de 14 régions, en open data. Les contributions sont ouvertes : il manque encore Kaolack et Kolda.',
    hoursAgo: 50,
    reactions: {
      like: ['abdou', 'fatou', 'moussa'],
      thanks: ['kofi', 'yao'],
    },
    link: 'senegal-maps',
  }),
  ...replies({ id: 'po2', community: 'senegal-developers' }, 50, [
    [
      'fatou',
      'Bravo ! Je regarde si on peut croiser avec les arrêts de Dakar Transit.',
      { like: ['abdou'] },
    ],
  ]),
  post({
    id: 'po3',
    community: 'open-source',
    author: 'abdou',
    type: 'Mise à jour de projet',
    title: 'OpenPay Africa cherche des reviewers Go',
    body:
      'Trois PRs attendent une review, dont la gestion des transactions (PR #81). Si tu connais Go et SQLite, une heure de ton temps change beaucoup pour nous.',
    hoursAgo: 26,
    reactions: { like: ['moussa', 'zeinab'] },
    link: 'openpay-africa',
  }),
  post({
    id: 'po4',
    community: 'devops',
    author: 'amina',
    type: 'Ressource',
    title: 'Un pipeline CI à 0 € pour vos projets Go',
    body:
      'GitHub Actions, cache des modules, tests en parallèle et déploiement sur un petit VPS. Le gabarit complet est dans k8s-starter-africa.',
    hoursAgo: 70,
    reactions: { useful: ['abdou', 'kofi', 'zeinab', 'moussa'] },
  }),
  ...replies({ id: 'po4', community: 'devops' }, 70, [
    [
      'kofi',
      'Testé sur AfriCommerce, le build passe de 6 à 2 minutes.',
      { like: ['abdou'] },
    ],
  ]),
  post({
    id: 'po5',
    community: 'react',
    author: 'awa',
    type: 'Question',
    title: 'Cache de tuiles hors ligne : IndexedDB ou Cache API ?',
    body:
      'Pour le mode hors ligne de Senegal Maps, je stocke les tuiles PNG. IndexedDB ou Cache API, qu’est-ce qui tient le mieux sur des Android d’entrée de gamme ?',
    hoursAgo: 96,
    reactions: { like: ['kofi'] },
    acceptedReply: 'po5c0',
  }),
  ...replies({ id: 'po5', community: 'react' }, 96, [
    [
      'kofi',
      'Cache API : moins de sérialisation, et les quotas sont plus prévisibles sur Chrome Android.',
      { like: ['abdou'] },
    ],
    ['fatou', 'IndexedDB si tu as besoin de métadonnées par tuile.'],
  ]),
  post({
    id: 'po6',
    community: 'cote-divoire-developers',
    author: 'moussa',
    type: 'Opportunité',
    title: 'Meetup Go à Abidjan le 24 octobre',
    body:
      'On parle concurrence et revue de code, à Cocody. Places limitées, inscris-toi en commentaire.',
    hoursAgo: 30,
    reactions: { like: ['yao'] },
  }),
  ...replies({ id: 'po6', community: 'cote-divoire-developers' }, 30, [
    ['yao', 'Je viens ! Première fois pour moi.', { like: ['abdou'] }],
  ]),
  post({
    id: 'po7',
    community: 'code-review',
    author: 'moussa',
    type: 'Discussion',
    title: '',
    body:
      'Astuce de review : commence par lire les tests. Si tu ne comprends pas ce qui est testé, pose la question avant de lire le code.',
    hoursAgo: 4,
    reactions: { like: ['abdou', 'zeinab', 'amina'], useful: ['yao', 'awa'] },
  }),
  ...replies({ id: 'po7', community: 'code-review' }, 4, [
    [
      'yao',
      'Je note. Et quand il n’y a pas de tests ?',
      { like: ['abdou'] },
    ],
    ['moussa', 'Alors la première remarque de la review, c’est ça.'],
  ]).map((reply) =>
    reply.id === 'po7c1' ? { ...reply, parent: 'po7c0' } : reply
  ),
  post({
    id: 'po7c2',
    community: 'code-review',
    author: 'yao',
    type: 'Réponse',
    title: '',
    body: 'Logique. Je l’ajoute à ma checklist de review.',
    hoursAgo: 1,
    reactions: { like: ['moussa'] },
    parent: 'po7c1',
    root: 'po7',
  }),
  post({
    id: 'po7c3',
    community: 'code-review',
    author: 'zeinab',
    type: 'Réponse',
    title: '',
    body:
      'Ajoute aussi : relire les cas d’erreur. C’est souvent là que les tests manquent.',
    hoursAgo: 0.5,
    reactions: { useful: ['yao', 'moussa'] },
    parent: 'po7c2',
    root: 'po7',
  }),
  post({
    id: 'po8',
    community: 'senegal-developers',
    author: 'fatou',
    type: 'Discussion',
    title: '',
    body:
      'Le job de réconciliation du ledger passe enfin en local. Prochaine étape : faire passer la CI sur la PR #84.',
    hoursAgo: 5,
    reactions: { like: ['abdou'] },
    link: 'openpay-africa',
  }),
  post({
    id: 'po9',
    community: 'open-source',
    author: 'kofi',
    type: 'Vitrine',
    title: '',
    body:
      'AfriCommerce accepte maintenant le paiement à la livraison avec confirmation par SMS. Les vendeurs de Makola testent depuis lundi.',
    hoursAgo: 28,
    reactions: { like: ['awa', 'amina', 'abdou', 'fatou'] },
    link: 'africommerce',
    images: 2,
  }),
]

const reposts: Record<string, Post['reposts']> = {
  po3: [
    { by: 'moussa', at: hoursAgo(20) },
    { by: 'zeinab', at: hoursAgo(22) },
  ],
  po2: [{ by: 'abdou', at: hoursAgo(40) }],
  po7: [{ by: 'awa', at: hoursAgo(3) }],
}
for (const p of posts) p.reposts = reposts[p.id] ?? []

// Session changes until the post routes exist (PAM-501)
export const postsChanged = signal(0)

const changed = () => postsChanged.value++

const firstName = (login: Login) => people[login].name.split(' ')[0]

/** Direct replies: the accepted answer first, then oldest first */
export const childrenOf = (id: string) => {
  const parent = posts.find((p) => p.id === id)
  const root = posts.find((p) => p.id === (parent?.root ?? id))
  return posts
    .filter((p) => p.parent === id)
    .sort((a, b) =>
      Number(b.id === root?.acceptedReply) -
        Number(a.id === root?.acceptedReply) || a.at - b.at
    )
}

export const descendantCount = (id: string): number =>
  childrenOf(id).reduce((sum, child) => sum + 1 + descendantCount(child.id), 0)

export type Reaction = 'like' | 'useful' | 'thanks'

/** POST/api/reaction/toggle */
export const toggleReaction = (post: Post, kind: Reaction, login: Login) => {
  const list = post.reactions[kind] ?? []
  post.reactions[kind] = list.includes(login)
    ? list.filter((l) => l !== login)
    : [...list, login]
  changed()
}

/** POST/api/post/repost: the post shows in the feed of followers */
export const toggleRepost = (post: Post, login: Login) => {
  const on = !post.reposts.some((r) => r.by === login)
  post.reposts = on
    ? [...post.reposts, { by: login, at: Date.now() }]
    : post.reposts.filter((r) => r.by !== login)
  if (on && post.author !== login) {
    pushNotification({
      to: post.author,
      category: 'social',
      kind: 'repost',
      title: `${firstName(login)} a republié ton post`,
      body: post.title || post.body.slice(0, 90),
      href: `post/${post.id}`,
    })
  }
  changed()
  return on
}

/** POST/api/bookmark/toggle */
export const toggleBookmark = (post: Post, login: Login) => {
  const list = post.bookmarks ?? []
  post.bookmarks = list.includes(login)
    ? list.filter((l) => l !== login)
    : [...list, login]
  changed()
}

let created = 0
const nextId = () => `session-${++created}`

/** POST/api/post/reply: a reply is a post, its author is notified */
export const replyTo = (parent: Post, login: Login, body: string) => {
  const reply: Post = {
    id: nextId(),
    community: parent.community,
    author: login,
    type: 'Réponse',
    title: '',
    body,
    at: Date.now(),
    reactions: {},
    reposts: [],
    parent: parent.id,
    root: parent.root ?? parent.id,
    demo: false,
  }
  posts.push(reply)
  if (parent.author !== login) {
    pushNotification({
      to: parent.author,
      category: 'communities',
      kind: 'reply',
      title: `${firstName(login)} a répondu à ${
        parent.parent ? 'ton commentaire' : 'ton post'
      }`,
      body: body.slice(0, 90),
      href: `post/${reply.id}`,
    })
  }
  changed()
  return reply
}

export type PostDraft = Pick<
  Post,
  'community' | 'type' | 'title' | 'body' | 'images' | 'video'
>

/** POST/api/post/create: publishing in a community joins it */
export const publishPost = (draft: PostDraft, author: Person) => {
  const post: Post = {
    ...draft,
    id: nextId(),
    author: author.login as Login,
    at: Date.now(),
    reactions: {},
    reposts: [],
    demo: false,
  }
  posts.unshift(post)
  if (!author.communities.includes(draft.community)) {
    author.communities.push(draft.community)
    const community = communities.find((c) => c.slug === draft.community)
    if (community) community.members++
  }
  changed()
  return post
}

/**
 * POST/api/post/accept-answer: the answer counts as a help for its author,
 * who gains a proof in Entraide (§8, §10.1)
 */
export const acceptAnswer = (question: Post, answer: Post) => {
  question.acceptedReply = answer.id
  const title = question.title || question.body.slice(0, 60)
  proofs.push({
    id: `p${proofs.length + 1}`,
    who: answer.author,
    dimension: 'help',
    title: `Réponse acceptée : ${title}`,
    by: question.author,
    at: Date.now(),
    verified: false,
    post: question.id,
    demo: false,
  })
  const count =
    proofs.filter((p) => p.who === answer.author && p.dimension === 'help')
      .length
  pushNotification({
    to: answer.author,
    category: 'communities',
    kind: 'reply',
    title: 'Ta réponse a été acceptée',
    body: `« ${title} ». Entraide : ${count} preuves.`,
    href: `post/${question.id}`,
  })
  changed()
}
