import { signal } from '@preact/signals'
import type { Login, Person } from '/web/fixtures/people.ts'
import type { ApiOutput } from '/web/lib/api.ts'
export type CommunityType = 'Technologie' | 'Pays' | 'Domaine'

export type Community = {
  slug: string
  name: string
  type: CommunityType
  members: number
  description: string
  /** Rules shown in « À propos », the default ones when absent */
  rules?: string[]
  /** Creator, who moderates it */
  owner?: Login
  moderators?: Login[]
  /** Country of a Pays community, to list its projects */
  country?: string
}

export const communities: Community[] = [
  {
    slug: 'go',
    moderators: ['zeinab'],
    name: 'Go',
    type: 'Technologie',
    members: 412,
    description:
      'Go en production : concurrence, performances, outillage. Modérée par Zeinab.',
  },
  {
    slug: 'react',
    name: 'React',
    type: 'Technologie',
    members: 380,
    description:
      'React, TypeScript et interfaces pensées pour les réseaux lents.',
  },
  {
    slug: 'devops',
    name: 'DevOps',
    type: 'Technologie',
    members: 205,
    description: 'CI, conteneurs, hébergement à petit budget.',
  },
  {
    slug: 'open-source',
    name: 'Open Source',
    type: 'Domaine',
    members: 530,
    description:
      'Lancer, maintenir et financer des projets open source africains.',
  },
  {
    slug: 'code-review',
    name: 'Code Review',
    type: 'Domaine',
    members: 188,
    description:
      'Apprendre à relire et à être relu. Checklists, retours, bonnes pratiques.',
  },
  {
    slug: 'senegal-developers',
    country: 'Sénégal',
    name: 'Senegal Developers',
    type: 'Pays',
    members: 640,
    description: 'Les développeurs du Sénégal : meetups, projets, entraide.',
  },
  {
    slug: 'cote-divoire-developers',
    country: 'Côte d’Ivoire',
    name: 'Côte d’Ivoire Developers',
    type: 'Pays',
    members: 455,
    description:
      'Les développeurs de Côte d’Ivoire : Abidjan, Yamoussoukro, Bouaké et au-delà.',
  },
  {
    slug: 'cameroon-developers',
    country: 'Cameroun',
    name: 'Cameroon Developers',
    type: 'Pays',
    members: 310,
    description: 'Les développeurs du Cameroun, de Douala à Yaoundé.',
  },
]

export const defaultRules = [
  'Sois précis : du code, un contexte, ce que tu as essayé.',
  'Pas d’autopromotion sans contenu utile.',
  'Respecte les autres, signale ce qui pose problème.',
]

// Changes of the communities the pages read: a join, a leave
export const communitiesChanged = signal(0)

// The type stored in English on the server, back to its French label
const typeLabels: Record<string, CommunityType> = {
  technology: 'Technologie',
  country: 'Pays',
  domain: 'Domaine',
}

/**
 * Brings the communities read from GET/api/communities into the pages: one
 * created on the server (or by another developer) joins the list, so it is
 * there after a reload. A seeded community keeps its richer demo data and
 * its page count; only new ones are added (§10.2).
 */
export const adoptCommunities = (list: ApiOutput['GET/api/communities']) => {
  let added = 0
  for (const community of list) {
    if (communities.some((existing) => existing.slug === community.slug)) {
      continue
    }
    communities.push({
      slug: community.slug,
      name: community.name,
      type: typeLabels[community.type] ?? 'Domaine',
      members: community.members,
      description: community.description,
    })
    added++
  }
  added && communitiesChanged.value++
}

/** Sets the membership the page shows (POST/api/community/join saves it) */
export const setMembership = (
  community: Community,
  person: Person,
  join: boolean,
) => {
  const joined = person.communities.includes(community.slug)
  if (joined === join) return
  person.communities = join
    ? [...person.communities, community.slug]
    : person.communities.filter((slug) => slug !== community.slug)
  community.members += join ? 1 : -1
  communitiesChanged.value++
}

const slugify = (name: string) =>
  name.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase()
    .replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '') || 'communaute'

/** The community already called so, accents and case aside */
export const communityNamed = (name: string) =>
  communities.find((c) => slugify(c.name) === slugify(name))

/** POST/api/community/create: its creator joins and moderates it */
export const createCommunity = (
  draft: Pick<Community, 'name' | 'type' | 'description'>,
  person: Person,
  /** The slug the server gave it, when it was saved */
  saved?: { slug: string },
) => {
  let slug = saved?.slug ?? slugify(draft.name)
  if (!saved) {
    const base = slug
    for (let k = 2; communities.some((c) => c.slug === slug); k++) {
      slug = `${base}-${k}`
    }
  }
  const community: Community = {
    ...draft,
    slug,
    members: 1,
    rules: ['Sois précis et bienveillant.'],
    owner: person.login as Login,
  }
  communities.push(community)
  person.communities = [...person.communities, slug]
  communitiesChanged.value++
  return community
}
