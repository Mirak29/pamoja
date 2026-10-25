import { adoptReputation } from '/web/fixtures/reputation.ts'
import { api } from '/web/lib/api.ts'
import { url } from '@01edu/signal-router'
import { onEvent, onReconnect, whenShown } from '/web/lib/realtime.ts'

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

// Only the profile on screen: another one reads its reputation again when
// it opens. The entry reaches many pages at once: each waits a random moment
// more (§12.7)
const onScreen = () => {
  const login = url.relativePath.slice(1).match(/^@([^/]+)/)?.[1]
    ?.toLowerCase()
  return [...shown].find((known) => known.toLowerCase() === login)
}

let pending: ReturnType<typeof setTimeout> | undefined
const reload = () => {
  clearTimeout(pending)
  pending = setTimeout(
    () =>
      whenShown(() => {
        const login = onScreen()
        login && loadReputation(login)
      }),
    300 + Math.random() * 1500,
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
