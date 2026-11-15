import { assertEquals } from 'jsr:@std/assert@^1.0.13'
import { makeRestorePoint } from '@01edu/db'
import { seed } from '/api/seed.ts'
import {
  type GithubContributor,
  keptContributors,
  shownContributors,
} from '/api/contributors.ts'

const restore = makeRestorePoint()

const contributor = (
  id: number,
  login: string,
  type = 'User',
): GithubContributor => ({
  id,
  login,
  type,
  avatar_url: `https://avatars.githubusercontent.com/u/${id}`,
  contributions: 1,
})

Deno.test('contributors: people only, never the bots', () => {
  const kept = keptContributors([
    contributor(1, 'moussa-dev'),
    contributor(2, 'dependabot[bot]', 'Bot'),
    contributor(3, 'renovate[bot]'),
    contributor(4, 'awa-frontend'),
  ])
  assertEquals(kept.map((c) => c.login), ['moussa-dev', 'awa-frontend'])
})

Deno.test('contributors: on Pamoja by their GitHub id, the team aside', () => {
  restore()
  // Moussa's account is GitHub 4242, whatever his GitHub login is now
  seed(new Map([['moussa', 4242], ['fatou', 5151]]))
  const shown = shownContributors(
    keptContributors([
      contributor(4242, 'moussa-renamed'),
      contributor(5151, 'fatou'),
      contributor(9999, 'stranger'),
    ]),
    ['abdou', 'fatou'],
  )
  assertEquals(shown, [
    {
      github: 'moussa-renamed',
      avatarUrl: 'https://avatars.githubusercontent.com/u/4242',
      login: 'moussa',
    },
    {
      github: 'stranger',
      avatarUrl: 'https://avatars.githubusercontent.com/u/9999',
      login: '',
    },
  ])
})
