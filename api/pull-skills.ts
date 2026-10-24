import { sql } from '@01edu/db'
import { github } from '/api/github.ts'
import { errorMessage, log } from '/api/lib/log.ts'
import { skillIdOfAlias } from '/api/skills.ts'

// « Demander une review » pre-fills the skills of a PR with the languages of
// its changed files (§7.1). GitHub is never read while a page is shown
// (§5.6): the files of each open PR are read after the sync that brought its
// head commit (import, refresh, webhook), and kept with that commit. A push
// changes the head: they are read again.

// GitHub language names, as SkillAlias knows them, by file extension
const languages: Record<string, string> = {
  go: 'go',
  ts: 'typescript',
  tsx: 'typescript',
  mts: 'typescript',
  cts: 'typescript',
  js: 'javascript',
  jsx: 'javascript',
  mjs: 'javascript',
  cjs: 'javascript',
  py: 'python',
  ipynb: 'python',
  sql: 'sql',
  html: 'html',
  htm: 'html',
  css: 'css',
  scss: 'css',
  sass: 'css',
  less: 'css',
  vue: 'vue',
  svelte: 'svelte',
  java: 'java',
  kt: 'kotlin',
  kts: 'kotlin',
  swift: 'swift',
  dart: 'dart',
  c: 'c',
  h: 'c',
  cpp: 'c++',
  cc: 'c++',
  cxx: 'c++',
  hpp: 'c++',
  cs: 'c#',
  php: 'php',
  rb: 'ruby',
  rs: 'rust',
  ex: 'elixir',
  exs: 'elixir',
  sol: 'solidity',
  sh: 'shell',
  bash: 'shell',
  ps1: 'powershell',
  tf: 'terraform',
  hcl: 'terraform',
}

/** The language of a changed file, by its name or its extension */
export const languageOfFile = (path: string) => {
  const name = path.split('/').at(-1)!.toLowerCase()
  if (name === 'dockerfile' || name.endsWith('.dockerfile')) return 'docker'
  if (/^\.github\/workflows\/.+\.ya?ml$/i.test(path)) return 'ci'
  const extension = name.includes('.') ? name.split('.').at(-1)! : ''
  return languages[extension]
}

/** Skill ids of the changed files, the most changed language first */
export const skillsOfFiles = (
  files: { filename: string; changes: number }[],
) => {
  const weight = new Map<number, number>()
  for (const file of files) {
    const language = languageOfFile(file.filename)
    const skillId = language ? skillIdOfAlias(language) : undefined
    if (skillId === undefined) continue
    weight.set(skillId, (weight.get(skillId) ?? 0) + Math.max(file.changes, 1))
  }
  return [...weight].sort((a, b) => b[1] - a[1]).map(([id]) => id)
}

type Pending = {
  pullRequestId: number
  number: number
  headSha: string
  fullName: string
}

const listPending = sql<Pending, undefined>`
  SELECT pullRequestId, number, headSha, fullName FROM pullRequest
  JOIN repository ON repository.repositoryId = pullRequest.repositoryId
  WHERE state = 'open' AND headSha IS NOT NULL
    AND coalesce(skillsSha, '') != headSha
`.all

const writeSkills = sql<
  undefined,
  { pullRequestId: number; skills: string; headSha: string }
>`
  UPDATE pullRequest SET skills = :skills, skillsSha = :headSha
  WHERE pullRequestId = :pullRequestId
`.run

// The 100 first files say the languages of a PR well enough: one request
const FILES_PER_PR = 100

/**
 * Reads the files of the open PRs whose head changed since their skills were
 * read. A failure of GitHub leaves the PR pending: the next sync tries again;
 * a PR gone from GitHub gets no skills.
 */
export const readPullRequestSkills = async () => {
  for (const pull of listPending()) {
    const path =
      `/repos/${pull.fullName}/pulls/${pull.number}/files?per_page=${FILES_PER_PR}`
    try {
      const answer = await github<{ filename: string; changes: number }[]>(
        path,
      )
      if (answer.status === 304) continue
      writeSkills({
        pullRequestId: pull.pullRequestId,
        skills: JSON.stringify(
          answer.status === 200 ? skillsOfFiles(answer.data) : [],
        ),
        headSha: pull.headSha,
      })
    } catch (err) {
      log.warn('github-pull-files-error', {
        path,
        message: errorMessage(err),
      })
    }
  }
}

// One reading at a time: a burst of pushes reads each PR once
let running: Promise<void> | undefined
let again = false

/** Reads the pending PRs after the current work, outside any transaction */
export const scheduleSkillsRead = () => {
  if (running) {
    again = true
    return
  }
  running = new Promise<void>((resolve) => setTimeout(resolve, 0))
    .then(() => readPullRequestSkills())
    .catch((err) =>
      log.error('github-pull-files-error', { message: errorMessage(err) })
    )
    .finally(() => {
      running = undefined
      if (again) {
        again = false
        scheduleSkillsRead()
      }
    })
}
