import { sql } from '@01edu/db'
import { stringsOf } from '/api/lib/json.ts'
import { notRevoked } from '/api/revoked.ts'
import { now } from '@01edu/time'
import { respond } from '@01edu/api/response'
// The entry tables exist before the queries below are prepared
import '/api/entries.ts'
import { entries } from '/api/entry-types.ts'
import { getProjectId } from '/api/board.ts'

// Project DNA, Health and Story (§6.5), computed from what the project's
// repo and the journal hold, never declared. Health shows readable
// indicators, each with its rule; no opaque global score.

const DAY = 24 * 3600

type Tone = 'ok' | 'warning' | 'danger' | 'unknown'

type Indicator = {
  label: string
  value: string
  state: string
  rule: string
  tone: Tone
}

const badRequest = (m: string) => new respond.BadRequestError({ message: m })

const getRepo = sql<
  {
    repositoryId: number
    readme: string | null
    stats: string | null
    projectCreatedAt: number
    owner: string
  },
  number
>`
  SELECT repository.repositoryId, repository.readme, repository.stats,
    project.createdAt AS projectCreatedAt, owner.githubUsername AS owner
  FROM project
  JOIN user AS owner ON owner.userId = project.ownerId
  LEFT JOIN repository ON repository.projectId = project.projectId
  WHERE project.projectId = ?
`.get

const pullsSince = sql<
  { n: number },
  { repositoryId: number; since: number }
>`
  SELECT count(*) AS n FROM pullRequest
  WHERE repositoryId = :repositoryId AND createdAt > :since
`.get

const pushesSince = sql<{ n: number }, { projectId: number; since: number }>`
  SELECT count(*) AS n FROM entry
  WHERE projectId = :projectId AND type = ${entries.COMMITS_PUSHED}
    AND createdAt > :since
`.get

const mergeDelays = sql<
  { delay: number },
  { repositoryId: number; since: number }
>`
  SELECT mergedAt - createdAt AS delay FROM pullRequest
  WHERE repositoryId = :repositoryId AND state = 'merged'
    AND mergedAt > :since AND mergedAt >= createdAt
  ORDER BY delay
`.all

const waitingReview = sql<{ n: number }, number>`
  SELECT count(*) AS n FROM pullRequest
  WHERE repositoryId = ? AND state = 'open' AND NOT EXISTS (
    SELECT 1 FROM review
    WHERE review.pullRequestId = pullRequest.pullRequestId
      AND review.state != 'dismissed')
`.get

const issueCount = (where: string) =>
  sql<{ n: number }, number>`
    SELECT count(*) AS n FROM issue
    WHERE repositoryId = ? AND state = 'open' AND ${where}
  `.get
const blockers = issueCount(`labels LIKE '%"blocked"%'`)
const beginners = issueCount(`labels LIKE '%good first issue%'`)

const authors = sql<
  { n: number },
  { repositoryId: number; from: number; to: number }
>`
  SELECT count(DISTINCT authorGithubId) AS n FROM pullRequest
  WHERE repositoryId = :repositoryId AND createdAt > :from
    AND createdAt <= :to
`.get

const ciRuns = sql<
  { total: number; passed: number },
  { repositoryId: number; since: number }
>`
  SELECT count(*) AS total,
    coalesce(sum(conclusion = 'success'), 0) AS passed
  FROM ciRun
  WHERE repositoryId = :repositoryId AND conclusion IS NOT NULL
    AND completedAt > :since
`.get

const labelsOf = sql<{ labels: string }, number>`
  SELECT labels FROM issue WHERE repositoryId = ? LIMIT 500
`.all

const duration = (seconds: number) =>
  seconds < 3600
    ? `${Math.max(1, Math.round(seconds / 60))} min`
    : seconds < 2 * DAY
    ? `${Math.round(seconds / 3600)} h`
    : `${Math.round(seconds / DAY)} j`

const median = (values: number[]) =>
  values.length ? values[Math.floor((values.length - 1) / 2)] : undefined

const plural = (n: number, one: string, many: string) =>
  `${n} ${n > 1 ? many : one}`

/** The indicators of Health, each with the rule it applies (§6.5) */
const healthOf = (projectId: number, repositoryId: number, readme: string) => {
  const at = now()
  const activity = (pullsSince({ repositoryId, since: at - 14 * DAY })?.n ??
    0) + (pushesSince({ projectId, since: at - 14 * DAY })?.n ?? 0)
  const delays = mergeDelays({ repositoryId, since: at - 90 * DAY })
    .map((r) => r.delay)
  const delay = median(delays)
  const waiting = waitingReview(repositoryId)?.n ?? 0
  const blocked = blockers(repositoryId)?.n ?? 0
  const recent = authors({ repositoryId, from: at - 30 * DAY, to: at })?.n ?? 0
  const before = authors({
    repositoryId,
    from: at - 60 * DAY,
    to: at - 30 * DAY,
  })?.n ?? 0
  const ci = ciRuns({ repositoryId, since: at - 7 * DAY })
  const welcome = beginners(repositoryId)?.n ?? 0
  const readmeSize = readme.trim().length
  const indicators: Indicator[] = [
    {
      label: 'Activité sur 14 jours',
      value: plural(activity, 'événement', 'événements'),
      state: activity >= 5 ? 'Actif' : activity ? 'Calme' : 'À l’arrêt',
      rule:
        'PRs ouvertes et pushes des 14 derniers jours. Actif à partir de 5.',
      tone: activity >= 5 ? 'ok' : activity ? 'warning' : 'danger',
    },
    delay === undefined
      ? {
        label: 'Délai avant merge',
        value: '—',
        state: 'Aucune PR mergée',
        rule:
          'Délai médian entre l’ouverture et le merge des PRs, sur 90 jours. Attention au-delà de 7 jours.',
        tone: 'unknown',
      }
      : {
        label: 'Délai avant merge',
        value: duration(delay),
        state: delay > 7 * DAY ? 'Attention' : 'Bon',
        rule:
          'Délai médian entre l’ouverture et le merge des PRs, sur 90 jours. Attention au-delà de 7 jours.',
        tone: delay > 7 * DAY ? 'warning' : 'ok',
      },
    {
      label: 'PRs en attente de review',
      value: String(waiting),
      state: waiting > 3 ? 'À traiter' : waiting ? 'Quelques-unes' : 'Aucune',
      rule: 'PRs ouvertes sans review sur GitHub. Attention au-delà de 3.',
      tone: waiting > 3 ? 'warning' : 'ok',
    },
    {
      label: 'Bloqueurs ouverts',
      value: String(blocked),
      state: blocked ? 'À traiter' : 'Aucun',
      rule: 'Issues ouvertes avec le label blocked.',
      tone: blocked ? 'danger' : 'ok',
    },
    {
      label: 'Contributeurs sur 30 jours',
      value: `${recent} (${recent - before >= 0 ? '+' : ''}${recent - before})`,
      state: recent > before
        ? 'En hausse'
        : recent < before
        ? 'En baisse'
        : 'Stable',
      rule:
        'Auteurs distincts de PRs sur 30 jours, comparés aux 30 jours d’avant.',
      tone: recent < before ? 'warning' : 'ok',
    },
    ci && ci.total
      ? {
        label: 'CI sur 7 jours',
        value: `${Math.round(ci.passed / ci.total * 100)} %`,
        state: ci.passed / ci.total >= 0.9 ? 'Bon' : 'Attention',
        rule: 'Part des runs CI réussis sur 7 jours. Bon au-dessus de 90 %.',
        tone: ci.passed / ci.total >= 0.9 ? 'ok' : 'warning',
      }
      : {
        label: 'CI sur 7 jours',
        value: '—',
        state: 'Aucun run',
        rule: 'Part des runs CI réussis sur 7 jours. Bon au-dessus de 90 %.',
        tone: 'unknown',
      },
    {
      label: 'Documentation',
      value: readmeSize ? `${readmeSize.toLocaleString('fr-FR')} car.` : '—',
      state: readmeSize >= 1500
        ? 'Complète'
        : readmeSize
        ? 'Courte'
        : 'Pas de README',
      rule:
        'Présence et taille du README. Complète à partir de 1 500 caractères.',
      tone: readmeSize >= 1500 ? 'ok' : readmeSize ? 'warning' : 'danger',
    },
    {
      label: 'Accueil des nouveaux',
      value: plural(welcome, 'good first issue', 'good first issues'),
      state: welcome >= 2 ? 'Bon' : 'À préparer',
      rule: 'Bon si au moins 2 issues good first issue sont ouvertes.',
      tone: welcome >= 2 ? 'ok' : 'warning',
    },
  ]
  return indicators
}

// The domains of a project, from its languages and the labels of its
// issues (§6.5): what someone could help with
const DOMAIN_LANGUAGES: Record<string, string[]> = {
  Backend: [
    'Go',
    'Rust',
    'Java',
    'Kotlin',
    'Python',
    'Ruby',
    'PHP',
    'C#',
    'Elixir',
    'Scala',
    'C',
    'C++',
  ],
  Frontend: [
    'TypeScript',
    'JavaScript',
    'CSS',
    'HTML',
    'SCSS',
    'Vue',
    'Svelte',
    'Dart',
  ],
  DevOps: ['Dockerfile', 'Shell', 'HCL', 'Nix', 'PowerShell', 'Makefile'],
  Documentation: ['Markdown', 'MDX', 'TeX', 'reStructuredText'],
}
const DOMAIN_LABELS: Record<string, RegExp> = {
  Backend: /\b(backend|api|server|database|db)\b/i,
  Frontend: /\b(frontend|ui|ux|css|design)\b/i,
  Testing: /\b(test|tests|testing|qa|e2e)\b/i,
  DevOps: /\b(devops|ci|cd|docker|deploy|infra)\b/i,
  Documentation: /\b(doc|docs|documentation)\b/i,
}

const domainsOf = (repositoryId: number, languages: [string, number][]) => {
  const found = new Set<string>()
  for (const [language, share] of languages) {
    // Shares are percents: a language under 5 % says little
    if (share < 5) continue
    for (const [domain, list] of Object.entries(DOMAIN_LANGUAGES)) {
      if (list.includes(language)) found.add(domain)
    }
  }
  for (const { labels } of labelsOf(repositoryId)) {
    for (const label of stringsOf(labels)) {
      for (const [domain, pattern] of Object.entries(DOMAIN_LABELS)) {
        if (pattern.test(label)) found.add(domain)
      }
    }
  }
  const order = ['Backend', 'Frontend', 'Testing', 'DevOps', 'Documentation']
  return order.filter((d) => found.has(d))
}

// The marking moments of the journal (§6.5)
const firstOf = sql<
  { at: number; login: string | null },
  { projectId: number; type: number }
>`
  SELECT entry.createdAt AS at, user.githubUsername AS login FROM entry
  LEFT JOIN user ON user.userId = entry.userId
  WHERE entry.projectId = :projectId AND entry.type = :type
  ORDER BY entry.createdAt ASC LIMIT 1
`.get

const joins = sql<{ at: number; login: string | null }, number>`
  SELECT entry.createdAt AS at, user.githubUsername AS login FROM entry
  LEFT JOIN user ON user.userId = entry.userId
  WHERE entry.projectId = ? AND entry.type = ${entries.PROJECT_MEMBER_JOINED}
  ORDER BY entry.createdAt ASC
`.all

const releases = sql<{ at: number; tag: string | null }, number>`
  SELECT entry.createdAt AS at, tag.tag FROM entry
  LEFT JOIN entryTag AS tag ON tag.entryId = entry.id
  WHERE entry.projectId = ? AND entry.type = ${entries.RELEASE_PUBLISHED}
  ORDER BY entry.createdAt ASC
  LIMIT 20
`.all

// A confirmed help between two developers of different countries
const crossBorder = sql<
  { at: number; helper: string; helperCountry: string; askerCountry: string },
  number
>`
  SELECT entry.createdAt AS at, helper.githubUsername AS helper,
    helperProfile.country AS helperCountry,
    askerProfile.country AS askerCountry
  FROM entry
  JOIN entryRequesterId AS requester ON requester.entryId = entry.id
  JOIN user AS helper ON helper.userId = entry.userId
  JOIN profile AS helperProfile ON helperProfile.userId = entry.userId
  JOIN profile AS askerProfile ON askerProfile.userId = requester.requesterId
  WHERE entry.projectId = ?
    AND entry.type IN (${entries.REVIEW_HELP_CONFIRMED}, ${entries.HELP_CONFIRMED})
    AND helperProfile.country IS NOT NULL AND askerProfile.country IS NOT NULL
    AND helperProfile.country != askerProfile.country
    AND ${notRevoked()}
  ORDER BY entry.createdAt ASC LIMIT 1
`.get

const MILESTONES = [5, 10, 25, 50, 100]

const storyOf = (projectId: number, createdAt: number, owner: string) => {
  const moments: { at: number; text: string }[] = []
  const created = firstOf({ projectId, type: entries.PROJECT_CREATED })
  moments.push({ at: created?.at ?? createdAt, text: 'Création du projet' })
  // The first one to join who is not its owner
  const members = joins(projectId)
  const first = members.find((m) => m.login !== owner)
  if (first) {
    moments.push({
      at: first.at,
      text: `Premier contributeur : @${first.login ?? '—'}`,
    })
  }
  const border = crossBorder(projectId)
  if (border) {
    moments.push({
      at: border.at,
      text: `Première collaboration entre pays (@${border.helper})`,
    })
  }
  for (const release of releases(projectId).slice(-5)) {
    moments.push({
      at: release.at,
      text: `Release ${release.tag ?? ''}`.trim(),
    })
  }
  for (const n of MILESTONES) {
    const reached = members[n - 1]
    if (reached) moments.push({ at: reached.at, text: `${n} membres` })
  }
  // Its creation opens the story, even before a backdated moment
  const [creation, ...rest] = moments
  return [creation, ...rest.sort((a, b) => a.at - b.at)]
}

const month = (seconds: number) =>
  new Date(seconds * 1000).toLocaleDateString('fr-FR', {
    month: 'short',
    year: 'numeric',
  })

/** DNA, Health and Story of a project, from its repo and its journal */
export const projectDna = (me: number, slug: string) => {
  const project = getProjectId({ slug, me })
  if (!project) throw badRequest('Unknown project')
  const repo = getRepo(project.projectId)!
  let languages: [string, number][] = []
  try {
    const stats = JSON.parse(repo.stats ?? '{}') as {
      languages?: [string, number][]
    }
    languages = stats.languages ?? []
  } catch {
    // No statistics read from GitHub yet
  }
  return {
    // Without a repo, nothing of GitHub is measured yet
    hasRepository: !!repo.repositoryId,
    health: repo.repositoryId
      ? healthOf(project.projectId, repo.repositoryId, repo.readme ?? '')
      : [],
    domains: repo.repositoryId ? domainsOf(repo.repositoryId, languages) : [],
    story: storyOf(project.projectId, repo.projectCreatedAt, repo.owner).map((
      m,
    ) => ({
      when: month(m.at),
      text: m.text,
    })),
  }
}
