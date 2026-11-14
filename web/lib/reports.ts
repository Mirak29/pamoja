import { api } from '/web/lib/api.ts'
import { CircleAlert } from '/web/assets/icons.tsx'
import { notify } from '/web/ui/toast.tsx'
import {
  type ReportKind,
  submitReport as submitLocal,
} from '/web/fixtures/reports.ts'

// Reporting content persisted on the server (PAM-508): the page confirms at
// once; a server post or comment hides itself past three distinct reporters,
// so it leaves the feed for everyone (§10.5). Demo content, whose id is a
// fixture string, stays handled in the page.

const serverType: Partial<Record<ReportKind, string>> = {
  post: 'post',
}

export const submitReport = (draft: Parameters<typeof submitLocal>[0]) => {
  submitLocal(draft)
  const targetType = serverType[draft.kind]
  const targetId = Number(draft.target)
  if (!targetType || !Number.isInteger(targetId) || targetId <= 0) return
  api['POST/api/report/create'].fetch({
    targetType,
    targetId,
    reason: draft.reason,
    comment: draft.comment,
  }).catch(() =>
    notify({
      title: 'Signalement non enregistré',
      body: 'Pamoja n’a pas pu joindre le serveur. Réessaie dans un instant.',
      icon: CircleAlert,
      tone: 'danger',
    })
  )
}
