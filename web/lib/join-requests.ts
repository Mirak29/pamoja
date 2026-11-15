import { signal } from '@preact/signals'
import { Check } from '/web/assets/icons.tsx'
import { api, type ApiOutput } from '/web/lib/api.ts'
import { notifyFailure } from '/web/lib/failure.ts'
import { debounced, onEvent } from '/web/lib/realtime.ts'
import { t } from '/web/lib/language.ts'
import { notify } from '/web/ui/toast.tsx'

// The candidatures of a real project, for its owner and maintainers (§6.6):
// read from the server, accepted or refused from the project page. The
// demo projects keep theirs in web/fixtures/applications.ts.

export type JoinRequest = ApiOutput['GET/api/project/join-requests'][number]

/** The candidatures read, by project */
export const joinRequests = signal<Partial<Record<string, JoinRequest[]>>>({})

const opened = new Set<string>()

/** Reads the candidatures of a project; quiet for a non-manager */
export const loadJoinRequests = (slug: string) => {
  opened.add(slug)
  return api['GET/api/project/join-requests'].fetch({ slug }).then(
    (list) => joinRequests.value = { ...joinRequests.peek(), [slug]: list },
    () => {},
  )
}

/** Forgets a project left: its candidatures are no longer followed */
export const leaveJoinRequests = (slug: string) => opened.delete(slug)

// A candidature reaches the managers as a notification: the projects
// opened read theirs again
onEvent(
  'NOTIFICATION_CREATED',
  debounced(() => opened.forEach(loadJoinRequests), 800),
)

const setStatus = (slug: string, id: number, status: string) => {
  joinRequests.value = {
    ...joinRequests.peek(),
    [slug]: joinRequests.peek()[slug]?.map((r) =>
      r.id === id ? { ...r, status } : r
    ),
  }
}

/**
 * Accepts or refuses one: shown at once, then saved. Accepted, the team
 * follows by itself (PROJECT_MEMBER_JOINED reloads the projects)
 */
export const decideJoinRequest = (
  slug: string,
  request: JoinRequest,
  accept: boolean,
) => {
  setStatus(slug, request.id, accept ? 'accepted' : 'refused')
  return api['POST/api/project/join-request/decide']
    .fetch({ joinRequestId: request.id, accept })
    .then(
      () =>
        accept && notify({
          title: t`${request.name} rejoint l’équipe`,
          icon: Check,
          tone: 'verified',
        }),
      (error) => {
        setStatus(slug, request.id, 'pending')
        notifyFailure(
          accept ? 'Candidature non acceptée' : 'Candidature non refusée',
          error,
        )
        // Another manager may have answered: read the list again
        loadJoinRequests(slug)
      },
    )
}
