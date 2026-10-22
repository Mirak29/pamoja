import { type Limited, LIMITS } from '/api/limits.ts'
import { CircleAlert } from '/web/assets/icons.tsx'
import { language, t } from '/web/lib/language.ts'
import { notify } from '/web/ui/toast.tsx'

/**
 * True, and the member is told, when a text is longer than its field allows
 * (§16). The field stops at the limit; this catches what goes around it,
 * until the server checks these contents itself (PAM-406, PAM-501).
 */
export const overLimit = (text: string, field: Limited) => {
  if (text.trim().length <= LIMITS[field]) return false
  notify({
    title: 'Texte trop long',
    body: t`${
      LIMITS[field].toLocaleString(language.peek())
    } caractères au plus.`,
    icon: CircleAlert,
    tone: 'danger',
  })
  return true
}
