import { debounced, onEvent, onReconnect } from '/web/lib/realtime.ts'
import { reloadHelpRequests } from '/web/lib/help.ts'
import { loadProjects, signedIn } from '/web/lib/session.ts'
import { reloadOpenedChannels } from '/web/lib/channels.ts'
import { loadNewPosts } from '/web/lib/posts.ts'
import { reloadPulses } from '/web/lib/pulse.ts'
import { reloadOpenedRoadmaps } from '/web/lib/roadmap.ts'
import { reloadOpenedBoards } from '/web/lib/board.ts'

// The data of the developer follows its entries without a refresh (§13): an
// entry makes the page read it again. A burst of entries, like a merge with
// its CI, is read once.

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
const reloadHelp = debounced(reloadHelpRequests)
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

// A card moved or attached by someone else: the boards open follow, and the
// roadmaps whose progress counts the cards (§6.7). A milestone planned: the
// roadmaps only
const reloadPlanning = debounced(() => {
  reloadOpenedBoards()
  reloadOpenedRoadmaps()
})
onEvent('TASK_UPDATED', reloadPlanning)
const reloadRoadmaps = debounced(reloadOpenedRoadmaps)
onEvent('MILESTONE_UPDATED', reloadRoadmaps)

// A new AI summary of a Pulse already read (PAM-307)
const readPulses = debounced(reloadPulses)
onEvent('PULSE_READY', readPulses)

// Entries sent while the connection was lost were missed: read them all
onReconnect(() => {
  reloadPlanning()
  reloadProjects()
  reloadHelp()
  reloadChannels()
})

// A post, a repost or a reply of someone the developer follows, of their
// community, or theirs from another tab: the feed is read again, what is new
// held behind « nouveaux posts » (posts.ts)
const readNewPosts = debounced(loadNewPosts, 1500)
onEvent(['POST_CREATED', 'POST_REPOSTED', 'POST_REPLIED'], readNewPosts)
onReconnect(readNewPosts)

// Back on the tab, or on the app of the phone: likes and replies given
// meanwhile elsewhere show without a reload, after half a minute away
let hiddenAt = 0
addEventListener('visibilitychange', () => {
  if (document.visibilityState === 'hidden') hiddenAt = Date.now()
  else if (signedIn.peek() && Date.now() - hiddenAt > 30_000) readNewPosts()
})
