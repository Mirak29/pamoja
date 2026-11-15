import { signal } from '@preact/signals'
import { api, type ApiOutput } from '/web/lib/api.ts'
import { notifyFailure } from '/web/lib/failure.ts'
import { debounced, onEvent } from '/web/lib/realtime.ts'
import type { ModerationDecision } from '/api/vocabulary.ts'

// The moderation queue of the server (PAM-508, §10.5): the reported content
// of what the developer moderates, every report of each, and the decisions
// taken. A new report or decision redraws it.

export type Queue = ApiOutput['GET/api/moderation/queue']
export type QueueItem = Queue['queue'][number]

/** The queue read, undefined until the server answered */
export const moderation = signal<Queue | undefined>(undefined)

/** Reads the queue and the history */
export const loadQueue = () =>
  api['GET/api/moderation/queue'].fetch().then(
    (queue) => moderation.value = queue,
    () => {},
  )

export type Decision = ModerationDecision

/** Decides on a content; true once saved, the queue read again */
export const decideOn = (
  item: QueueItem,
  action: Decision,
  reason: string,
  days = 0,
  proofId = 0,
) =>
  api['POST/api/moderation/decide'].fetch({
    targetType: item.targetType,
    targetId: item.targetId,
    action,
    reason,
    days,
    proofId,
  }).then(
    () => (loadQueue(), true),
    (error) => (notifyFailure('Décision non enregistrée', error), false),
  )

// A report or a decision of another moderator: the queue follows, while
// the page is open
let open = false
export const openQueue = () => {
  open = true
  loadQueue()
  return () => {
    open = false
  }
}
const reload = debounced(() => open && loadQueue())
onEvent(['CONTENT_REPORTED', 'MODERATION_ACTION'], reload)

/** The proofs of the author of a content, to withdraw one (§10.5) */
export const proofsOfAuthor = (login: string) =>
  api['GET/api/user/proofs'].fetch({ username: login }).catch(() => [])
