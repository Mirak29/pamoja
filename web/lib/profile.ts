import { signal } from '@preact/signals'
import { useEffect } from 'preact/hooks'
import { adoptHelpRequests } from '/web/fixtures/help.ts'
import { adoptProfile } from '/web/fixtures/people.ts'
import { adoptSettings } from '/web/fixtures/profile-settings.ts'
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

type ApiProfile = Awaited<ReturnType<typeof api['GET/api/user']['fetch']>>
type ProfileQuery = Parameters<typeof api['GET/api/user']['fetch']>[0]

// The client writes the query with URLSearchParams, which turns null into
// « null »: only the key given is sent
const queryOf = (key: 'username' | 'githubId', value: string) =>
  ({ [key]: value }) as ProfileQuery

/** What a profile read from the API brings to the pages */
const adopt = (profile: ApiProfile) => {
  adoptProfile(profile)
  // The profile shows its own theme, accent and section order (§9.2)
  adoptSettings(profile.login, {
    theme: profile.theme,
    accent: profile.accent,
    order: profile.sectionOrder,
    featured: profile.featured,
  })
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
}

/**
 * The developer of a GitHub account, for a link to write to them
 * (PAM-125): their login once read, undefined if nobody has it
 */
export const loadProfileOfGithubId = (githubId: number) =>
  api['GET/api/user'].fetch(queryOf('githubId', String(githubId)))
    .then((profile) => {
      adopt(profile)
      return profile.login
    }, () => undefined)

export const loadProfile = (login: string) => {
  statuses.peek()[login] === 'found' || set(login, 'loading')
  return api['GET/api/user'].fetch(queryOf('username', login)).then((
    profile,
  ) => {
    adopt(profile)
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
