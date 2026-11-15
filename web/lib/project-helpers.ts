import { signal } from '@preact/signals'
import { Send } from '/web/assets/icons.tsx'
import { api, type ApiOutput } from '/web/lib/api.ts'
import { notifyFailure } from '/web/lib/failure.ts'
import { t } from '/web/lib/language.ts'
import { notify } from '/web/ui/toast.tsx'

// « Ils pourraient aider » (PAM-402, §6.6): for each open need of a project,
// the developers the matching of the server proposes, and the invitations
// of the managers, saved and sent as a notification.

type Helpers = ApiOutput['GET/api/project/helpers']
type Helper = Helpers['needs'][number]['helpers'][number]

/** What the server proposed, by project */
export const helpers = signal<Partial<Record<string, Helpers>>>({})

/** Reads who could help on a project */
export const loadHelpers = (slug: string) =>
  api['GET/api/project/helpers'].fetch({ slug }).then(
    (data) => helpers.value = { ...helpers.peek(), [slug]: data },
    () => {},
  )

/** Invites a developer on a need: shown at once, then saved */
export const inviteHelper = (slug: string, helper: Helper, need: string) => {
  helper.invited = true
  helpers.value = { ...helpers.peek() }
  api['POST/api/project/invite'].fetch({ slug, login: helper.login, need })
    .then(
      () =>
        notify({
          title: 'Invitation envoyée',
          body: t`${helper.name} reçoit une notification.`,
          icon: Send,
          tone: 'verified',
        }),
      (error) => {
        helper.invited = false
        helpers.value = { ...helpers.peek() }
        notifyFailure('Invitation non envoyée', error)
      },
    )
}
