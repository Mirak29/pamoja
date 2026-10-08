export type CommunityType = 'Technologie' | 'Pays' | 'Domaine'

export type Community = {
  slug: string
  name: string
  type: CommunityType
  members: number
  description: string
}

export const communities: Community[] = [
  {
    slug: 'go',
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
    name: 'Senegal Developers',
    type: 'Pays',
    members: 640,
    description: 'Les développeurs du Sénégal : meetups, projets, entraide.',
  },
  {
    slug: 'cote-divoire-developers',
    name: 'Côte d’Ivoire Developers',
    type: 'Pays',
    members: 455,
    description:
      'Les développeurs de Côte d’Ivoire : Abidjan, Yamoussoukro, Bouaké et au-delà.',
  },
  {
    slug: 'cameroon-developers',
    name: 'Cameroon Developers',
    type: 'Pays',
    members: 310,
    description: 'Les développeurs du Cameroun, de Douala à Yaoundé.',
  },
]
