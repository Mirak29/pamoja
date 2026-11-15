import { db, sql } from '@01edu/db'
import { now } from '@01edu/time'
import { respond } from '@01edu/api/response'
import { ModerationAction } from '/api/schema.ts'
import { Entry, maybe } from '/api/entries.ts'
import { createNotification } from '/api/notifications.ts'
import { LIMITS } from '/api/limits.ts'

// The moderation queue and its decisions (§10.5). Content of a community is
// handled by its moderators; the rest (a post outside any community, a help
// request, a profile) by the platform admins, the logins of PAMOJA_ADMINS,
// and by every community moderator while none is set. A decision closes the
// open reports of its target, is kept in `moderationAction` with its reason,
// is an entry, and its author is told why.

export const MODERATION_ACTIONS = ['dismiss', 'hide', 'warn', 'suspend']
// Days a suspension may last
export const SUSPEND_DAYS = [1, 7, 30]

const badRequest = (m: string) => new respond.BadRequestError({ message: m })
const forbidden = (m: string) => new respond.ForbiddenError({ message: m })

const moderated = sql<{ communityId: number }, number>`
  SELECT communityId FROM communityMember
  WHERE userId = ? AND role = 'moderator'
`.all

const loginOf = sql<{ login: string }, number>`
  SELECT githubUsername AS login FROM user WHERE userId = ?
`.get

const admins = () =>
  (Deno.env.get('PAMOJA_ADMINS') ?? '').split(',').map((l) => l.trim())
    .filter(Boolean).map((l) => l.toLowerCase())

/** What a developer may moderate: some communities, and the rest or not */
const scopeOf = (me: number) => {
  const communities = new Set(moderated(me).map((m) => m.communityId))
  const login = loginOf(me)?.login.toLowerCase() ?? ''
  const listed = admins()
  const admin = listed.length ? listed.includes(login) : communities.size > 0
  return { communities, admin }
}

/** Whether the developer has a queue: they moderate something (§10.5) */
export const isModerator = (me: number) => {
  const scope = scopeOf(me)
  return scope.admin || scope.communities.size > 0
}

type Target = {
  targetType: string
  targetId: number
  authorId: number
  communityId: number | null
  title: string
  excerpt: string
  href: string
  hidden: boolean
}

const getPost = sql<
  {
    postId: number
    authorId: number
    communityId: number | null
    title: string | null
    body: string
    rootId: number | null
    hiddenAt: number | null
  },
  number
>`
  SELECT postId, authorId, communityId, title, body, rootId, hiddenAt
  FROM post WHERE postId = ?
`.get

const getHelp = sql<
  { authorId: number; title: string; description: string | null },
  number
>`
  SELECT authorId, title, description FROM helpRequest
  WHERE helpRequestId = ?
`.get

const getProfile = sql<
  { login: string; name: string; headline: string | null },
  number
>`
  SELECT user.githubUsername AS login, profile.displayName AS name,
    profile.headline
  FROM user JOIN profile ON profile.userId = user.userId
  WHERE user.userId = ?
`.get

/** The content a report points at, as the queue shows it */
const targetOf = (targetType: string, targetId: number): Target | undefined => {
  if (targetType === 'post' || targetType === 'comment') {
    const post = getPost(targetId)
    if (!post) return
    return {
      targetType,
      targetId,
      authorId: post.authorId,
      communityId: post.communityId,
      title: post.title || post.body.slice(0, 80),
      excerpt: post.title ? post.body.slice(0, 160) : post.body.slice(80, 240),
      href: `post/s${post.rootId ?? post.postId}`,
      hidden: post.hiddenAt !== null,
    }
  }
  if (targetType === 'help_request') {
    const help = getHelp(targetId)
    if (!help) return
    return {
      targetType,
      targetId,
      authorId: help.authorId,
      communityId: null,
      title: help.title,
      excerpt: (help.description ?? '').slice(0, 160),
      href: `help/${targetId}`,
      hidden: false,
    }
  }
  if (targetType === 'profile') {
    const profile = getProfile(targetId)
    if (!profile) return
    return {
      targetType,
      targetId,
      authorId: targetId,
      communityId: null,
      title: profile.name,
      excerpt: profile.headline ?? '',
      href: `@${profile.login}`,
      hidden: false,
    }
  }
}

const inScope = (scope: ReturnType<typeof scopeOf>, target: Target) =>
  target.communityId === null
    ? scope.admin
    : scope.communities.has(target.communityId)

const openReports = sql<
  {
    reportId: number
    targetType: string
    targetId: number
    reason: string
    comment: string | null
    reporter: string
    createdAt: number
  },
  undefined
>`
  SELECT report.reportId, report.targetType, report.targetId, report.reason,
    report.comment, user.githubUsername AS reporter, report.createdAt
  FROM report JOIN user ON user.userId = report.reporterId
  WHERE report.status = 'open'
  ORDER BY report.createdAt ASC
  LIMIT 500
`.all

const recentActions = sql<
  {
    moderationActionId: number
    moderator: string
    targetType: string
    targetId: number
    action: string
    reason: string
    until: number | null
    createdAt: number
  },
  undefined
>`
  SELECT moderationActionId, user.githubUsername AS moderator, targetType,
    targetId, action, reason, until, moderationAction.createdAt
  FROM moderationAction JOIN user ON user.userId = moderationAction.moderatorId
  ORDER BY moderationAction.createdAt DESC
  LIMIT 200
`.all

const authorLogin = (target: Target) => loginOf(target.authorId)?.login ?? ''

/**
 * The queue of a moderator: the open reports of what they moderate, one
 * entry by content with every report, oldest first; then their history
 */
export const moderationQueue = (me: number) => {
  const scope = scopeOf(me)
  const items = new Map<string, {
    target: Target
    reports: {
      reason: string
      comment: string
      by: string
      at: number
    }[]
  }>()
  for (const row of openReports()) {
    const key = `${row.targetType}:${row.targetId}`
    let item = items.get(key)
    if (!item) {
      const target = targetOf(row.targetType, row.targetId)
      if (!target || !inScope(scope, target)) continue
      item = { target, reports: [] }
      items.set(key, item)
    }
    item.reports.push({
      reason: row.reason,
      comment: row.comment ?? '',
      by: row.reporter,
      at: row.createdAt,
    })
  }
  const history = []
  for (const row of recentActions()) {
    const target = targetOf(row.targetType, row.targetId)
    if (!target || !inScope(scope, target)) continue
    history.push({
      id: row.moderationActionId,
      moderator: row.moderator,
      action: row.action,
      reason: row.reason,
      until: row.until ?? 0,
      at: row.createdAt,
      title: target.title,
      href: target.href,
    })
    if (history.length === 50) break
  }
  return {
    moderator: scope.admin || scope.communities.size > 0,
    queue: [...items.values()].map(({ target, reports }) => ({
      targetType: target.targetType,
      targetId: target.targetId,
      title: target.title,
      excerpt: target.excerpt,
      href: target.href,
      author: authorLogin(target),
      hidden: target.hidden,
      reports,
    })),
    history,
  }
}

const closeReports = sql<
  undefined,
  { targetType: string; targetId: number; status: string; at: number }
>`
  UPDATE report SET status = :status, resolvedAt = :at
  WHERE targetType = :targetType AND targetId = :targetId AND status = 'open'
`.run

const setHidden = sql<undefined, { postId: number; at: number | null }>`
  UPDATE post SET hiddenAt = :at WHERE postId = :postId
`.run

const suspend = sql<undefined, { userId: number; until: number }>`
  UPDATE user SET suspendedUntil = :until WHERE userId = :userId
`.run

// What the author reads in the notification
const notices: Record<string, string> = {
  hide: 'moderation_hidden',
  warn: 'moderation_warning',
  suspend: 'moderation_suspended',
}

/**
 * Decides on a reported content (§10.5): ignore (a content hidden by its
 * reports comes back), hide it, warn its author, or suspend them for some
 * days. A reason is required and sent to the author
 */
export const decide = (
  me: number,
  input: {
    targetType: string
    targetId: number
    action: string
    reason: string
    days: number
  },
) => {
  if (!MODERATION_ACTIONS.includes(input.action)) {
    throw badRequest('Unknown action')
  }
  const reason = input.reason.trim()
  if (!reason) throw badRequest('A decision needs a reason')
  if (reason.length > LIMITS.note) throw badRequest('Reason too long')
  if (input.action === 'suspend' && !SUSPEND_DAYS.includes(input.days)) {
    throw badRequest('Unknown duration')
  }
  const target = targetOf(input.targetType, input.targetId)
  if (!target) throw badRequest('Unknown content')
  if (!inScope(scopeOf(me), target)) throw forbidden('Not your queue')
  if (target.authorId === me) throw forbidden('Not on your own content')
  const at = now()
  const until = input.action === 'suspend' ? at + input.days * 86400 : null
  const isPost = input.targetType === 'post' ||
    input.targetType === 'comment'
  db.transaction(() => {
    if (isPost && input.action === 'dismiss' && target.hidden) {
      // Hidden by its reports, not by a moderator: it comes back
      setHidden({ postId: input.targetId, at: null })
    }
    if (isPost && input.action === 'hide' && !target.hidden) {
      setHidden({ postId: input.targetId, at })
    }
    if (until) suspend({ userId: target.authorId, until })
    closeReports({
      targetType: input.targetType,
      targetId: input.targetId,
      status: input.action === 'dismiss' ? 'dismissed' : 'resolved',
      at,
    })
    const moderationActionId = ModerationAction.insert({
      moderatorId: me,
      targetType: input.targetType,
      targetId: input.targetId,
      action: input.action,
      reason,
      until,
      createdAt: at,
    })
    Entry.insert.MODERATION_ACTION({
      userId: target.authorId,
      communityId: maybe(target.communityId),
      postId: isPost ? input.targetId : maybe(null),
      data: { moderationActionId, action: input.action },
      source: 'platform',
    })
    const type = notices[input.action]
    if (type) {
      createNotification({
        userId: target.authorId,
        type,
        category: 'system',
        payload: {
          excerpt: reason,
          title: target.title,
          postId: isPost ? input.targetId : 0,
          until: until ?? 0,
        },
      })
    }
  })()
  return { decided: true }
}

const getHiding = sql<{ reason: string }, number>`
  SELECT reason FROM moderationAction
  WHERE targetType IN ('post', 'comment') AND targetId = ? AND action = 'hide'
  ORDER BY createdAt DESC LIMIT 1
`.get

/** Why a post is hidden, for the banner its author sees (§10.5) */
export const hiddenReasonOf = (postId: number) =>
  getHiding(postId)?.reason ??
    'Masqué après plusieurs signalements, en attente d’un modérateur.'

const getSuspension = sql<{ until: number | null }, number>`
  SELECT suspendedUntil AS until FROM user WHERE userId = ?
`.get

/** Whether the account is suspended now: it may read, not write (§10.5) */
export const isSuspended = (userId: number) =>
  (getSuspension(userId)?.until ?? 0) > now()
