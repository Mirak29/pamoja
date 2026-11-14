/*
 * « Pour toi » (§6.2): the feed ranked for the reader, without AI. A post
 * scores by what links it to the reader (people followed, people met,
 * communities, projects, skills), a little by its activity, and loses half
 * its weight every 36 hours: the reader's world first, the news next.
 */

/** What the ranking knows of the reader */
export type Reader = {
  login: string
  follows: string[]
  communities: string[]
  skills: string[]
  /** The projects the reader builds or follows */
  projects: string[]
  /** People the reader worked or talked with, and how much */
  ties: Map<string, number>
}

/** What the ranking reads of a post */
export type Ranked = {
  author: string
  community: string
  title: string
  body: string
  link?: string
  likes: string[]
  /** Likes counted beyond the logins known */
  otherLikes?: number
  replies: number
  reposts: string[]
}

/** Why a post is there, said in one line above it */
export type Reason =
  | { kind: 'follow'; who: string }
  | { kind: 'tie'; who: string }
  | { kind: 'repost'; who: string }
  | { kind: 'community'; slug: string }
  | { kind: 'project'; slug: string }
  | { kind: 'skills'; skills: string[] }

const HALF_LIFE = 36 * 3600 * 1000

/** What is left of a weight `at` gives at `now`: half every 36 hours */
export const decay = (at: number, now: number) =>
  0.5 ** (Math.max(0, now - at) / HALF_LIFE)

// A skill named in the text as a word: « Go » is not in « Google ». Each
// pattern is built once: the feed asks it for every post at every render
const escape = (text: string) => text.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
const patterns = new Map<string, RegExp>()
const mentions = (text: string, skill: string) => {
  let pattern = patterns.get(skill)
  if (!pattern) {
    pattern = new RegExp(
      `(^|[^\\p{L}\\p{N}])${escape(skill)}($|[^\\p{L}\\p{N}])`,
      'iu',
    )
    patterns.set(skill, pattern)
  }
  return pattern.test(text)
}

/**
 * The score of a post for a reader, and the strongest reason it is shown.
 * `at` is when it reached the feed: its publication, or a repost.
 */
export const scoreOf = (
  post: Ranked,
  reader: Reader,
  at: number,
  now: number,
  repostBy?: string,
) => {
  const reasons: [number, Reason | undefined][] = []
  if (post.author === reader.login) reasons.push([3, undefined])
  if (reader.follows.includes(post.author)) {
    reasons.push([3, { kind: 'follow', who: post.author }])
  }
  if (repostBy && repostBy !== reader.login) {
    reasons.push([2.5, { kind: 'repost', who: repostBy }])
  }
  const tie = reader.ties.get(post.author) ?? 0
  if (tie) {
    reasons.push([
      Math.min(3, Math.log2(1 + tie)),
      { kind: 'tie', who: post.author },
    ])
  }
  if (reader.communities.includes(post.community)) {
    reasons.push([2, { kind: 'community', slug: post.community }])
  }
  if (post.link && reader.projects.includes(post.link)) {
    reasons.push([2, { kind: 'project', slug: post.link }])
  }
  const text = `${post.title} ${post.body}`
  const skills = reader.skills.filter((skill) => mentions(text, skill))
  if (skills.length) {
    reasons.push([Math.min(2, skills.length), { kind: 'skills', skills }])
  }
  // Activity counts, but never as much as the reader's own world
  const activity = post.likes.length + (post.otherLikes ?? 0) +
    2 * post.replies +
    2 * post.reposts.length
  const relevance = reasons.reduce((sum, [weight]) => sum + weight, 0) +
    Math.min(1.5, Math.log2(1 + activity) / 2)
  const score = (1 + relevance) * decay(at, now)
  const [, reason] = reasons.reduce<[number, Reason | undefined]>(
    (best, next) => next[0] > best[0] ? next : best,
    [0, undefined],
  )
  return { score, reason }
}

/** Interactions with each person: replies, likes and reposts, both ways */
export const tiesOf = (
  login: string,
  posts: {
    id: string
    author: string
    parent?: string
    likes: string[]
    reposts: string[]
  }[],
  work: { login: string; count: number }[],
) => {
  const ties = new Map<string, number>()
  const add = (other: string, weight: number) => {
    if (other === login) return
    ties.set(other, (ties.get(other) ?? 0) + weight)
  }
  // Working together weighs most (§9.3)
  for (const link of work) add(link.login, 2 * link.count)
  const authors = new Map(posts.map((post) => [post.id, post.author]))
  for (const post of posts) {
    const parent = post.parent && authors.get(post.parent)
    if (parent && post.author === login) add(parent, 1)
    if (parent === login) add(post.author, 1)
    if (post.author === login) {
      for (const other of [...post.likes, ...post.reposts]) add(other, 0.5)
    } else {
      if (post.likes.includes(login)) add(post.author, 0.5)
      if (post.reposts.includes(login)) add(post.author, 1)
    }
  }
  return ties
}
