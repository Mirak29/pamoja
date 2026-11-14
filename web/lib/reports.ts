import { api } from '/web/lib/api.ts'
import { notifyFailure } from '/web/lib/failure.ts'
import { serverIdOf } from '/web/fixtures/posts.ts'
import { keyOf, reportReasons } from '/api/vocabulary.ts'
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
  // A post of the server is shown as « s12 »: its id is the number
  const targetId = serverIdOf(draft.target)
  // The page shows the reason in words, the server keeps its key
  const reason = keyOf(reportReasons, draft.reason)
  if (!targetType || !targetId || !reason) return
  api['POST/api/report/create'].fetch({
    targetType,
    targetId,
    reason,
    comment: draft.comment,
  }).catch((error) => notifyFailure('Signalement non enregistré', error))
}
