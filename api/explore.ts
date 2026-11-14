import { sql } from '@01edu/db'
import { now } from '@01edu/time'
// The tables exist before the query below is prepared
import '/api/schema.ts'
import { countryName } from '/api/vocabulary.ts'
import { stringsOf } from '/api/lib/json.ts'

// Developers for Explore (§10.3): every one the page can list and filter by
// country, skill, intention and availability — not only the demo profiles of
// the fixtures, so a real sign-up is findable.

type Row = {
  login: string
  name: string
  headline: string
  city: string
  country: string
  available: number
  skills: string
  intents: string
}

const rows = sql<Row, number>`
  SELECT user.githubUsername AS login, profile.displayName AS name,
    coalesce(profile.headline, '') AS headline,
    coalesce(profile.city, '') AS city,
    coalesce(profile.country, '') AS country,
    profile.availability = 'available' AS available,
    (SELECT json_group_array(DISTINCT skill.name) FROM userSkill
      JOIN skill ON skill.skillId = userSkill.skillId
      WHERE userSkill.userId = user.userId) AS skills,
    (SELECT json_group_array(intent) FROM userIntent
      WHERE userIntent.userId = user.userId) AS intents
  FROM user JOIN profile ON profile.userId = user.userId
  WHERE user.suspendedUntil IS NULL OR user.suspendedUntil < ?
  ORDER BY profile.displayName
`.all

/** Every developer for Explore, with what its filters need (§10.3) */
export const listDevelopers = () =>
  rows(now()).map((row) => ({
    login: row.login,
    name: row.name,
    headline: row.headline,
    city: row.city,
    country: row.country ? countryName(row.country) : '',
    available: !!row.available,
    skills: stringsOf(row.skills),
    intents: stringsOf(row.intents),
  }))
