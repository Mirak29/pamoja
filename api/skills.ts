import { db, sql } from '@01edu/db'
import { now } from '@01edu/time'
import { Skill, SkillAlias } from '/api/schema.ts'
import { vocabulary } from '/api/vocabulary.ts'

// The vocabulary is reference data, not demo data: loaded at startup, a new
// entry of api/vocabulary.ts is added, an existing one is kept (§6.1)
const getSkillId = Skill.sql<'skillId', string>`
  SELECT skillId FROM skill WHERE slug = ?
`.get
const hasAlias = SkillAlias.sql<'skillAliasId', string>`
  SELECT skillAliasId FROM skillAlias WHERE alias = ?
`.get

db.transaction(() => {
  for (const { slug, name, category, aliases } of vocabulary) {
    const skillId = getSkillId(slug)?.skillId ??
      Skill.insert({ slug, name, category })
    for (const alias of new Set(aliases)) {
      hasAlias(alias) || SkillAlias.insert({ alias, skillId })
    }
  }
})()

const getSkillIdByAlias = SkillAlias.sql<'skillId', string>`
  SELECT skillId FROM skillAlias WHERE alias = ?
`.get
const getSkillIdByName = Skill.sql<'skillId', { name: string }>`
  SELECT skillId FROM skill
  WHERE name = :name
  ORDER BY category = 'technology' DESC
  LIMIT 1
`.get
const getDomainId = Skill.sql<'skillId', { name: string }>`
  SELECT skillId FROM skill WHERE name = :name AND category = 'domain'
`.get

/** Skill of a GitHub language or another spelling: `postgres` → PostgreSQL */
export const skillIdOfAlias = (alias: string) =>
  getSkillIdByAlias(alias.toLowerCase().trim())?.skillId

const insertSkill = sql<undefined, Record<string, string | number | null>>`
  INSERT OR IGNORE INTO userSkill (userId, skillId, source, createdAt)
  VALUES (:userId, :skillId, :source, :createdAt)
`.run
const deleteDeclared = sql<undefined, number>`
  DELETE FROM userSkill WHERE userId = ? AND source = 'declared'
`.run

/** Languages of the public repos: kept, never removed by a later login */
export const addGithubSkills = (userId: number, languages: string[]) => {
  const createdAt = now()
  for (const language of languages) {
    const skillId = skillIdOfAlias(language)
    skillId && insertSkill({ userId, skillId, source: 'github', createdAt })
  }
}

/**
 * The skills the developer declares, technologies and domains: they replace
 * the previous declared ones; those from GitHub and from the platform stay.
 */
export const setDeclaredSkills = db.transaction(
  (userId: number, names: { skills: string[]; domains: string[] }) => {
    deleteDeclared(userId)
    const createdAt = now()
    const ids = [
      ...names.skills.map((name) => getSkillIdByName({ name })?.skillId),
      ...names.domains.map((name) => getDomainId({ name })?.skillId),
    ]
    for (const skillId of ids) {
      skillId && insertSkill({ userId, skillId, source: 'declared', createdAt })
    }
  },
)

const listSkills = sql<
  { name: string; category: string; source: string },
  number
>`
  SELECT skill.name, skill.category, userSkill.source
  FROM userSkill
  JOIN skill ON skill.skillId = userSkill.skillId
  WHERE userSkill.userId = ?
  ORDER BY userSkill.userSkillId
`.all

/** Technologies and domains, each once, with every source that backs it */
export const skillsOf = (userId: number) => {
  const technologies = new Map<string, string[]>()
  const domains: string[] = []
  for (const { name, category, source } of listSkills(userId)) {
    if (category === 'domain') {
      domains.includes(name) || domains.push(name)
      continue
    }
    technologies.set(name, [...technologies.get(name) ?? [], source])
  }
  return {
    skills: [...technologies].map(([name, sources]) => ({ name, sources })),
    domains,
  }
}
