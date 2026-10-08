import { hoursAgo } from '/web/fixtures/clock.ts'
import type { Login } from '/web/fixtures/people.ts'
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
