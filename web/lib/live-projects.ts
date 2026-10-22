import { onEvent, onReconnect } from '/web/lib/realtime.ts'
import { loadProjects } from '/web/lib/session.ts'

// The projects of the developer follow GitHub without a refresh (§13): an
// entry of one of them (a PR, an issue, the CI, a release, a push, the
// 15 min sync) makes the page read them again. A burst of entries, like a
// merge with its CI, is read once.

let pending: ReturnType<typeof setTimeout> | undefined
const reload = () => {
  clearTimeout(pending)
  pending = setTimeout(loadProjects, 300)
}

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
], reload)

// Entries sent while the connection was lost were missed: read them all
onReconnect(reload)
