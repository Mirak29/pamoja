import { assert, assertEquals } from 'jsr:@std/assert@^1.0.13'
import { type Ranked, type Reader, scoreOf, tiesOf } from './for-you.ts'

const HOUR = 3600_000
const now = Date.UTC(2026, 10, 14, 12)

const reader: Reader = {
  login: 'abdou',
  follows: ['moussa'],
  communities: ['go'],
  skills: ['Go', 'Deno'],
  projects: ['openpay'],
  ties: new Map([['fatou', 3]]),
}

const post = (fields: Partial<Ranked>): Ranked => ({
  author: 'kofi',
  community: '',
  title: '',
  body: 'Un post sans lien avec le lecteur',
  likes: [],
  replies: 0,
  reposts: [],
  ...fields,
})

const score = (fields: Partial<Ranked>, hours = 0, repostBy?: string) =>
  scoreOf(post(fields), reader, now - hours * HOUR, now, repostBy)

Deno.test('pour toi: the reader’s world comes before the news', () => {
  const stranger = score({})
  // Someone followed, someone met, a community, a project, a skill: each
  // brings a post up, with its reason
  for (
    const [fields, kind] of [
      [{ author: 'moussa' }, 'follow'],
      [{ author: 'fatou' }, 'tie'],
      [{ community: 'go' }, 'community'],
      [{ link: 'openpay' }, 'project'],
      [{ body: 'Un worker en Go et Deno' }, 'skills'],
    ] as const
  ) {
    const ranked = score(fields)
    assert(ranked.score > stranger.score, kind)
    assertEquals(ranked.reason?.kind, kind)
  }
  assertEquals(stranger.reason, undefined)
  // A skill is a word: « Go » is not in « Google »
  assertEquals(score({ body: 'Google Maps' }).reason, undefined)
  // A repost by someone followed says who
  assertEquals(score({}, 0, 'moussa').reason, { kind: 'repost', who: 'moussa' })
})

Deno.test('pour toi: activity helps, never as much as the reader’s world', () => {
  const busy = score({ likes: ['a', 'b', 'c', 'd', 'e'], replies: 20 })
  assert(busy.score > score({}).score)
  assert(score({ author: 'moussa' }).score > busy.score)
})

Deno.test('pour toi: a post loses half its weight every 36 hours', () => {
  const fresh = score({ author: 'moussa' })
  const old = score({ author: 'moussa' }, 36)
  assertEquals(Math.round(old.score / fresh.score * 100), 50)
  // A post of someone followed two days old still comes before a stranger's
  // fresh one; a week old, it has passed
  assert(score({ author: 'moussa' }, 48).score > score({}).score)
  assert(score({ author: 'moussa' }, 168).score < score({}).score)
})

Deno.test('pour toi: ties come from work, replies, likes and reposts', () => {
  const ties = tiesOf(
    'abdou',
    [
      { id: 'p1', author: 'awa', likes: ['abdou'], reposts: [] },
      { id: 'p2', author: 'abdou', likes: ['yao'], reposts: [] },
      { id: 'r1', author: 'kofi', parent: 'p2', likes: [], reposts: [] },
      { id: 'r2', author: 'abdou', parent: 'p1', likes: [], reposts: [] },
    ],
    [{ login: 'moussa', count: 2 }],
  )
  assertEquals(Object.fromEntries(ties), {
    moussa: 4,
    awa: 1.5,
    yao: 0.5,
    kofi: 1,
  })
})
