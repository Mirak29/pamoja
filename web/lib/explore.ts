import { api } from '/web/lib/api.ts'
import { adoptDevelopers } from '/web/fixtures/people.ts'
import { adoptProjects } from '/web/fixtures/repos.ts'

// Explore reads every developer from the server (§10.3), so a real sign-up is
// findable, not only the demo profiles of the fixtures. The page filters them.
export const loadDevelopers = () =>
  api['GET/api/explore/developers'].fetch().then(adoptDevelopers, () => {})

/** Every public project, so one imported by someone else is findable */
export const loadExploreProjects = () =>
  api['GET/api/explore/projects'].fetch().then(
    (list) => adoptProjects(list, true),
    () => {},
  )

// When the people and the projects were last read for the Home rail
let readAt = 0

/**
 * The developers and the projects of the server for the rail of the Home
 * (§6.2): « avec qui construire » and the projects looking for help list
 * real members, not only the demo ones. Read again after five minutes
 */
export const loadForRail = () => {
  if (Date.now() - readAt < 5 * 60_000) return
  readAt = Date.now()
  loadDevelopers()
  loadExploreProjects()
}
