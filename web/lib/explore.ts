import { api } from '/web/lib/api.ts'
import { adoptDevelopers } from '/web/fixtures/people.ts'
import { adoptProjects } from '/web/fixtures/repos.ts'

// Explore reads every developer from the server (§10.3), so a real sign-up is
// findable, not only the demo profiles of the fixtures. The page filters them.
export const loadDevelopers = () =>
  api['GET/api/explore/developers'].fetch().then(adoptDevelopers, () => {})

/** Every public project, so one imported by someone else is findable */
export const loadExploreProjects = () =>
  api['GET/api/explore/projects'].fetch().then(adoptProjects, () => {})
