import type { Message, TrackingAlert } from '/web/fixtures/channels.ts'
import { personOf } from '/web/fixtures/people.ts'
import { t, translate } from '/web/lib/language.ts'
import { counted } from '/web/lib/plural.ts'

// The sentence of an alert of #suivi (PAM-411): the server gives the facts,
// the page writes them in its language, at each render (§6.8)

const nameOf = (login: string) => login ? personOf(login).name : ''

const ofReview = (alert: TrackingAlert) => {
  const { pullRequest: n, title } = alert
  const who = nameOf(alert.actor) || translate('un reviewer')
  return alert.state === 'approved'
    ? t`PR #${n} « ${title} » approuvée par ${who}.`
    : alert.state === 'changes_requested'
    ? t`Changements demandés sur la PR #${n} « ${title} » par ${who}.`
    : t`Review de ${who} sur la PR #${n} « ${title} ».`
}

const ofIssue = (alert: TrackingAlert) => {
  const { issue: n, title } = alert
  return alert.state === 'closed'
    ? t`Issue #${n} fermée : « ${title} ».`
    : alert.state === 'reopened'
    ? t`Issue #${n} rouverte : « ${title} ».`
    : t`Issue #${n} ouverte : « ${title} ».`
}

const ofCi = (alert: TrackingAlert, failed: boolean) => {
  const { pullRequest: n, title, name, branch } = alert
  if (failed) {
    return n
      ? t`CI en échec sur la PR #${n} « ${title} » : le job ${name} échoue sur ${branch}.`
      : t`CI en échec sur ${branch} : le job ${name} échoue.`
  }
  return n
    ? t`CI réparée sur la PR #${n} « ${title} » : le job ${name} repasse au vert.`
    : t`CI réparée sur ${branch} : le job ${name} repasse au vert.`
}

const ofPush = (alert: TrackingAlert) => {
  const commits = counted(alert.count, 'commit poussé', 'commits poussés')
  const who = nameOf(alert.actor)
  return who
    ? t`${commits} sur ${alert.branch} par ${who}.`
    : t`${commits} sur ${alert.branch}.`
}

/** The sentence of an alert read from the server */
export const alertText = (alert: TrackingAlert) => {
  const { pullRequest: n, title } = alert
  switch (alert.kind) {
    case 'PR_OPENED':
      return t`PR #${n} ouverte par ${
        nameOf(alert.author) || alert.author
      } : « ${title} ».`
    case 'PR_REVIEWED':
      return ofReview(alert)
    case 'PR_MERGED':
      return t`PR #${n} « ${title} » mergée.`
    case 'PR_CLOSED':
      return t`PR #${n} « ${title} » fermée sans merge.`
    case 'PR_REVIEW_STALE':
      return t`La PR #${n} « ${title} » attend une review depuis 2 jours.`
    case 'ISSUE_UPDATED':
      return ofIssue(alert)
    case 'RELEASE_PUBLISHED':
      return t`Release ${alert.tag} publiée.`
    case 'CI_FAILED':
      return ofCi(alert, true)
    case 'CI_FIXED':
      return ofCi(alert, false)
    default:
      return ofPush(alert)
  }
}

/** What a message says: an alert of the server is written now */
export const textOf = (message: Message) =>
  message.alert ? alertText(message.alert) : message.text
