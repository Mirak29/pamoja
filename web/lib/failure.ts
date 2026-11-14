import { CircleAlert } from '/web/assets/icons.tsx'
import { reasonOf, retryAfterOf } from '/web/lib/api.ts'
import { t } from '/web/lib/language.ts'
import { waitLabel } from '/web/lib/messages.ts'
import { notify } from '/web/ui/toast.tsx'

// An action shown at once and then refused or lost on the way: the page has
// put it back, and says what happened. A limit reached says when to try
// again, a refusal says so, and only an unreachable server says it was not
// reached.

/**
 * Tells why an action was not saved. `refusals` gives the sentence of each
 * reason the server may answer; any other refusal gets a general one.
 */
export const notifyFailure = (
  title: string,
  error?: unknown,
  refusals: Partial<Record<string, string>> = {},
) => {
  const wait = error ? retryAfterOf(error) : undefined
  const reason = error ? reasonOf(error) : undefined
  notify({
    title,
    body: wait
      ? t`Trop de demandes d’un coup. Réessaie ${waitLabel(wait)}.`
      : reason
      ? refusals[reason] ?? 'Le serveur a refusé la demande.'
      : 'Pamoja n’a pas pu joindre le serveur. Réessaie dans un instant.',
    icon: CircleAlert,
    tone: 'danger',
  })
}
