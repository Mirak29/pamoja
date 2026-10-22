import { onEvent, onReconnect } from '/web/lib/realtime.ts'
import { loadHelpRequests, loadProjects } from '/web/lib/session.ts'

// The data of the developer follows its entries without a refresh (§13): an
// entry makes the page read it again. A burst of entries, like a merge with
// its CI, is read once.

const debounced = (load: () => unknown) => {
  let pending: ReturnType<typeof setTimeout> | undefined
  return () => {
    clearTimeout(pending)
    pending = setTimeout(load, 300)
  }
}

// The projects follow GitHub: a PR, an issue, the CI, a release, a push, the
// 15 min sync
const reloadProjects = debounced(loadProjects)
onEvent([
  'PROJECT_UPDATED',
  'PROJECT_MEMBER_JOINED',
  'PR_OPENED',
  'PR_UPDATED',
  'PR_REVIEWED',
  'PR_MERGED',
  'PR_CLOSED',
  'PR_REVIEW_STALE',
  'ISSUE_UPDATED',
  'RELEASE_PUBLISHED',
  'CI_FAILED',
  'CI_FIXED',
  'COMMITS_PUSHED',
], reloadProjects)

// The help requests follow their lifecycle (§7.2)
const reloadHelp = debounced(loadHelpRequests)
onEvent([
  'HELP_REQUEST_MATCHED',
  'HELP_REQUEST_ACCEPTED',
  'REVIEW_SUBMITTED',
  'REVIEW_HELP_CONFIRMED',
  'HELP_CONFIRMED',
  'HELP_REQUEST_WITHDRAWN',
  'HELP_REQUEST_RELEASED',
  'HELP_REQUEST_REOPENED',
  'HELP_REQUEST_EXPIRED',
], reloadHelp)

// Entries sent while the connection was lost were missed: read them all
onReconnect(() => {
  reloadProjects()
  reloadHelp()
})
