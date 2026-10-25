import { onEvent, onReconnect, whenShown } from '/web/lib/realtime.ts'
import { loadHelpRequests, loadProjects } from '/web/lib/session.ts'
import { reloadOpenedChannels } from '/web/lib/channels.ts'

// The data of the developer follows its entries without a refresh (§13): an
// entry makes the page read it again. A burst of entries, like a merge with
// its CI, is read once.

// An entry of a project reaches every member at once: each one waits a
// random moment more, so that their pages do not all ask the server in the
// same instant (§12.7)
const debounced = (load: () => unknown, spread = 0) => {
  let pending: ReturnType<typeof setTimeout> | undefined
  return () => {
    clearTimeout(pending)
    pending = setTimeout(
      () => whenShown(load),
      300 + Math.random() * spread,
    )
  }
}

// The projects follow GitHub: a PR, an issue, the CI, a release, a push, the
// 15 min sync
const reloadProjects = debounced(loadProjects, 1500)
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

// #suivi and the threads of the projects opened follow GitHub and the
// messages of the others (§6.8)
const reloadChannels = debounced(reloadOpenedChannels)
onEvent([
  'MESSAGE_CREATED',
  'PR_OPENED',
  'PR_REVIEWED',
  'PR_MERGED',
  'PR_CLOSED',
  'PR_REVIEW_STALE',
  'ISSUE_UPDATED',
  'RELEASE_PUBLISHED',
  'CI_FAILED',
  'CI_FIXED',
  'COMMITS_PUSHED',
], reloadChannels)

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
  'HELP_REQUEST_CANCELLED',
  'HELP_REQUEST_DELIVERED',
  'HELP_REQUEST_CLOSED',
], reloadHelp)

// Entries sent while the connection was lost were missed: read them all
onReconnect(() => {
  reloadProjects()
  reloadHelp()
  reloadChannels()
})
