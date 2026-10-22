import { useEffect } from 'preact/hooks'
import { adoptReputation } from '/web/fixtures/reputation.ts'
import { api } from '/web/lib/api.ts'
import { onEvent, onReconnect } from '/web/lib/realtime.ts'

// The reputation of a profile, read from the server (§8): its proofs by
// dimension and its badges. A developer the server does not know is a demo
// person of the pages, who keeps the fixtures.

// The profiles read, so a new proof refreshes them
const shown = new Set<string>()

export const loadReputation = (login: string) =>
  Promise.all([
    api['GET/api/user/proofs'].fetch({ username: login }),
    api['GET/api/user/badges'].fetch({ username: login }),
  ]).then(([proofs, badges]) => {
    shown.add(login)
    adoptReputation(login, proofs, badges)
  }, () => {})

/** Reads the reputation of the profile shown, again when its login changes */
export const useReputation = (login: string | undefined) =>
  useEffect(() => {
    login && loadReputation(login)
  }, [login])

let pending: ReturnType<typeof setTimeout> | undefined
const reload = () => {
  clearTimeout(pending)
  pending = setTimeout(
    () => shown.forEach((login) => loadReputation(login)),
    300,
  )
}

// A confirmed help, a merge, a release or a new badge: the profiles read
// follow without a refresh (§13)
onEvent([
  'REVIEW_HELP_CONFIRMED',
  'HELP_CONFIRMED',
  'PR_MERGED',
  'RELEASE_PUBLISHED',
  'BADGE_UNLOCKED',
], reload)
onReconnect(reload)
