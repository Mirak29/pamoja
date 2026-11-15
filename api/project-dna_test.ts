import { assert, assertEquals } from 'jsr:@std/assert@^1.0.13'
import { db, makeRestorePoint } from '@01edu/db'
import { seed } from '/api/seed.ts'
import { userIdOfLogin } from '/api/user.ts'
import { CiRun, Issue, PullRequest, Repository } from '/api/schema.ts'
import { projectDna } from '/api/project-dna.ts'

const restore = makeRestorePoint()
const DAY = 24 * 3600

// OpenPay Africa with its repo: 3 PRs merged in 1, 2 and 3 days, 2 open
// without review, a blocked issue, a good first issue, 4 CI runs of which 1
// failed, a long README, Go and TypeScript
const withRepo = () => {
  const projectId = (db.prepare(
    "SELECT projectId FROM project WHERE slug = 'openpay-africa'",
  ).get() as { projectId: number }).projectId
  const at = Date.now() / 1000
  const repositoryId = Repository.insert({
    projectId,
    githubId: 777,
    owner: 'abdou',
    name: 'openpay-africa',
    fullName: 'abdou/openpay-africa',
    defaultBranch: 'main',
    syncMode: 'live',
    source: 'github',
    readme: 'x'.repeat(2000),
    stats: JSON.stringify({ languages: [['Go', 70], ['TypeScript', 28]] }),
  })
  const pull = (number: number, state: string, days: number, author: number) =>
    PullRequest.insert({
      repositoryId,
      githubId: 9000 + number,
      number,
      title: `PR ${number}`,
      state,
      authorGithubId: author,
      additions: 1,
      deletions: 1,
      source: 'github',
      createdAt: at - 10 * DAY,
      updatedAt: at,
      mergedAt: state === 'merged' ? at - 10 * DAY + days * DAY : null,
    })
  pull(1, 'merged', 1, 1)
  pull(2, 'merged', 2, 2)
  pull(3, 'merged', 3, 3)
  pull(4, 'open', 0, 1)
  pull(5, 'open', 0, 4)
  const issue = (number: number, labels: string[]) =>
    Issue.insert({
      repositoryId,
      githubId: 9100 + number,
      number,
      title: `Issue ${number}`,
      state: 'open',
      labels,
      authorGithubId: 1,
      source: 'github',
      createdAt: at,
      updatedAt: at,
    })
  issue(1, ['blocked', 'backend'])
  issue(2, ['good first issue', 'documentation'])
  for (
    const [i, conclusion] of ['success', 'success', 'failure', 'success']
      .entries()
  ) {
    CiRun.insert({
      repositoryId,
      githubId: 9200 + i,
      source: 'actions',
      name: 'test',
      headSha: `sha${i}`,
      branch: 'main',
      conclusion,
      url: 'https://github.com',
      completedAt: at - DAY,
    })
  }
}

Deno.test('dna: health measured on the repo, each with its rule (PAM-308)', () => {
  restore()
  seed()
  withRepo()
  const abdou = userIdOfLogin('abdou')!
  const dna = projectDna(abdou, 'openpay-africa')
  assert(dna.hasRepository)
  const value = (label: string) => dna.health.find((h) => h.label === label)!
  assertEquals(value('Délai avant merge').value, '2 j')
  assertEquals(value('PRs en attente de review').value, '2')
  assertEquals(value('Bloqueurs ouverts').tone, 'danger')
  assertEquals(value('CI sur 7 jours').value, '75 %')
  assertEquals(value('Documentation').state, 'Complète')
  assertEquals(value('Accueil des nouveaux').state, 'À préparer')
  assertEquals(value('Contributeurs sur 30 jours').value, '4 (+4)')
  assert(dna.health.every((h) => h.rule.length > 10))

  // Domains from the languages and the labels
  assertEquals(dna.domains, ['Backend', 'Frontend', 'Documentation'])
  // The story starts with its creation
  assertEquals(dna.story[0].text, 'Création du projet')
})

Deno.test('dna: a project without a repo measures nothing of GitHub', () => {
  restore()
  seed()
  const dna = projectDna(userIdOfLogin('abdou')!, 'openpay-africa')
  assertEquals([dna.hasRepository, dna.health, dna.domains], [false, [], []])
  assert(dna.story.length >= 1)
})
