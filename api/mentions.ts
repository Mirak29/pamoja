import { sql } from '@01edu/db'
import { blockOf } from '/api/messages.ts'
import {
  createNotification,
  type NotificationCategory,
} from '/api/notifications.ts'
import { notSuspended } from '/api/revoked.ts'

// @mentions (§10.1): who a post, a reply or a message of a channel names by
// their login is told at once. Only real developers are, at most
// MENTIONS_MAX by text, never the author, never across a block, and only
// those who can read where they are named.

/** The same rule as the page (web/ui/rich-text.tsx), not inside an email */
const MENTION = /(?<![\w.@])@([A-Za-z0-9][A-Za-z0-9-]{0,38})(?![\w-])/g

/** Developers told by one text, at most: past it, the text is a list */
export const MENTIONS_MAX = 10

/** The logins a text names, in order, each once, lower case */
export const mentionsOf = (text: string) => {
  const seen = new Set<string>()
  for (const [, login] of text.matchAll(MENTION)) {
    seen.add(login.toLowerCase())
    if (seen.size === MENTIONS_MAX) break
  }
  return [...seen]
}

const usersOf = sql<
  { userId: number; login: string },
  { logins: string }
>`
  SELECT userId, githubUsername AS login FROM user
  WHERE lower(githubUsername) IN (SELECT value FROM json_each(:logins))
    AND ${notSuspended()}
`.all

/** The developers a text names who exist on Pamoja */
export const mentionedIn = (text: string) => {
  const logins = mentionsOf(text)
  return logins.length ? usersOf({ logins: JSON.stringify(logins) }) : []
}

const existing = sql<{ login: string }, { logins: string }>`
  SELECT lower(githubUsername) AS login FROM user
  WHERE lower(githubUsername) IN (SELECT value FROM json_each(:logins))
`.all

/**
 * The @logins of texts shown together that are developers on Pamoja, in one
 * query: the page links those only, an unknown @login stays text
 */
export const knownMentions = (texts: string[]) => {
  const all = new Set(texts.flatMap(mentionsOf))
  const known = all.size
    ? new Set(
      existing({ logins: JSON.stringify([...all]) }).map((r) => r.login),
    )
    : new Set<string>()
  return (text: string) => mentionsOf(text).filter((login) => known.has(login))
}

/**
 * Tells each developer the text names. `skip` are those told already (the
 * author replied to); `reads` says who may read where the text is. The
 * logins told come back.
 */
export const notifyMentions = (
  { me, text, category, payload, skip = [], reads = () => true }: {
    me: number
    text: string
    category: NotificationCategory
    payload: Record<string, unknown>
    skip?: number[]
    reads?: (userId: number) => boolean
  },
) => {
  const told: string[] = []
  for (const { userId, login } of mentionedIn(text)) {
    if (userId === me || skip.includes(userId)) continue
    const block = blockOf(me, userId)
    if (block.byMe || block.byThem || !reads(userId)) continue
    createNotification({
      userId,
      type: 'mention',
      category,
      actorId: me,
      payload: { ...payload, excerpt: text.trim().slice(0, 90) },
    })
    told.push(login)
  }
  return told
}

// Who to propose after an @: those the author follows first, then by
// login; a login or a name, or a word of the name, that starts so
const suggest = sql<
  { login: string; name: string; avatarUrl: string },
  { me: number; prefix: string; word: string }
>`
  SELECT user.githubUsername AS login, profile.displayName AS name,
    user.avatarUrl
  FROM user
  JOIN profile ON profile.userId = user.userId
  WHERE user.userId != :me AND ${notSuspended()}
    AND (lower(user.githubUsername) LIKE :prefix ESCAPE '!'
      OR lower(profile.displayName) LIKE :prefix ESCAPE '!'
      OR lower(profile.displayName) LIKE :word ESCAPE '!')
  ORDER BY EXISTS (SELECT 1 FROM follow
      WHERE follow.followerId = :me AND follow.targetType = 'user'
        AND follow.targetId = user.userId) DESC,
    lower(user.githubUsername)
  LIMIT 8
`.all

/** Up to 8 developers to name, for what is typed after an @ */
export const suggestMentions = (me: number, typed: string) => {
  // `!` escapes the wildcards of LIKE: what is typed is text
  const q = typed.trim().toLowerCase().slice(0, 39).replace(/[!%_]/g, '!$&')
  return suggest({ me, prefix: `${q}%`, word: `% ${q}%` })
}
