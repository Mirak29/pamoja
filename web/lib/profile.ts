import { signal } from '@preact/signals'
import { useEffect } from 'preact/hooks'
import { adoptHelpRequests } from '/web/fixtures/help.ts'
import { adoptProfile } from '/web/fixtures/people.ts'
import { adoptProfileProjects } from '/web/fixtures/projects.ts'
import { roleNames } from '/web/fixtures/repos.ts'
import { api } from '/web/lib/api.ts'
import { loadReputation } from '/web/lib/reputation.ts'

// The profile at /@login, read from GET/api/user (§9.1), with its
// reputation. A login the server does not know is a demo person of the
// pages, or nobody.

export type ProfileStatus = 'loading' | 'found' | 'missing' | 'failed'

const statuses = signal<Record<string, ProfileStatus>>({})

// The login as GitHub writes it, for an address typed in another case
const canonical = signal<Record<string, string>>({})

const set = (login: string, status: ProfileStatus) =>
  statuses.value = { ...statuses.peek(), [login]: status }

export const loadProfile = (login: string) => {
  statuses.peek()[login] === 'found' || set(login, 'loading')
  return api['GET/api/user'].fetch({ username: login }).then((profile) => {
    adoptProfile(profile)
    adoptProfileProjects(
      profile.login,
      profile.projects.map((project) => ({
        slug: project.slug,
        name: project.name,
        description: project.description,
        stack: project.stack,
        role: roleNames[project.role] ?? 'Contributeur',
      })),
    )
    profile.activity.length && adoptHelpRequests(profile.activity)
    canonical.value = { ...canonical.peek(), [login]: profile.login }
    set(login, 'found')
    return loadReputation(profile.login)
  }, (err: Error) => {
    // Unknown to the server; any other error is a network one, to retry
    set(login, err.message === 'No such developer' ? 'missing' : 'failed')
    return loadReputation(login)
  })
}

/**
 * Reads the profile of the address, again when it changes. Returns where
 * it stands, and the login as GitHub writes it once known.
 */
export const useProfile = (login: string) => {
  useEffect(() => {
    login && loadProfile(login)
  }, [login])
  return {
    status: statuses.value[login] ?? 'loading',
    login: canonical.value[login] ?? login,
  }
}
