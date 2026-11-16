import { deleteCookie, setCookie } from 'jsr:@std/http@^1.0.20/cookie'
import { respond } from '@01edu/api/response'
import type { RequestContext } from '@01edu/api/context'
import { isSuspended } from '/api/moderation.ts'
import { now } from '@01edu/time'
import { sql } from '@01edu/db'
import { entries, Entry } from '/api/entries.ts'
import { b64url } from '/api/lib/encoding.ts'
import { BASE_URL } from '/api/lib/env.ts'
import { sessionKey } from '/api/lib/sign.ts'

// A session is a USER_LOGIN entry, like in Tournament. The cookie holds its
// id and a random secret, signed with SESSION_SECRET: Tournament signs with
// the password salt, Pamoja has no password (§5.3).
//
// The id alone is not enough: entry ids start again at 1 on a new database
// (deno task prod:reset, a restored backup), while SESSION_SECRET stays. A
// cookie of the old database then named the login of someone else, who was
// opened to its holder. The secret ties the cookie to the one login it was
// made for; the entry keeps only its SHA-256, so a copy of the database
// opens no session.

export type Session = { entryId: number; userId: number; createdAt: number }

// 30 days in seconds, the unit of `now()` and of the cookie Max-Age; checked
// on the server from the entry, not only by the cookie expiry
const MAX_AGE = 30 * 24 * 60 * 60

// 8 bytes of entry id (a float64, like before), then the secret
const ID_BYTES = 8
const SECRET_BYTES = 32

const hashOf = async (secret: Uint8Array<ArrayBuffer>) =>
  new Uint8Array(await crypto.subtle.digest('SHA-256', secret)).toBase64(
    b64url,
  )

const getLogin = sql<
  { userId: number; createdAt: number; tokenHash: string },
  number
>`
  SELECT userId, createdAt, tokenHash
  FROM entry
  JOIN entryTokenHash ON entryTokenHash.entryId = entry.id
  WHERE entry.id = ? AND type = ${entries.USER_LOGIN}
`.get

export const createSession = async (
  userId: number,
  source: 'github' | 'demo',
) => {
  const secret = crypto.getRandomValues(new Uint8Array(SECRET_BYTES))
  const entryId = Entry.insert.USER_LOGIN({
    userId,
    source,
    tokenHash: await hashOf(secret),
  })
  const data = new Uint8Array(ID_BYTES + SECRET_BYTES)
  data.set(new Uint8Array(new Float64Array([entryId]).buffer))
  data.set(secret, ID_BYTES)
  const signature = await crypto.subtle.sign('HMAC', sessionKey, data)
  return `${data.toBase64(b64url)}:${
    new Uint8Array(signature).toBase64(b64url)
  }`
}

export const decodeSession = async (
  text?: string,
): Promise<Session | undefined> => {
  const [data, signature, extra] = text?.split(':') || []
  if (!data || !signature || extra !== undefined) return
  let bytes: Uint8Array<ArrayBuffer>, hash: Uint8Array<ArrayBuffer>
  try {
    bytes = Uint8Array.fromBase64(data, b64url).slice()
    hash = Uint8Array.fromBase64(signature, b64url).slice()
  } catch {
    return
  }
  // A cookie made before the secret (8 bytes) is refused: one more login
  if (bytes.byteLength !== ID_BYTES + SECRET_BYTES) return
  // verify compares in constant time
  if (!await crypto.subtle.verify('HMAC', sessionKey, hash, bytes)) return
  const [entryId] = new Float64Array(bytes.buffer.slice(0, ID_BYTES))
  // An archived entry (logout) is no longer in the `entry` view
  const login = getLogin(entryId)
  if (!login?.userId || now() - login.createdAt > MAX_AGE) return
  // Another database gave this id to another login: its secret differs
  if (login.tokenHash !== await hashOf(bytes.slice(ID_BYTES))) return
  return { entryId, userId: login.userId, createdAt: login.createdAt }
}

export const withSession = async (ctx: RequestContext) => {
  const session = await decodeSession(ctx.cookies.session)
  if (!session) {
    throw new respond.UnauthorizedError({ message: 'Missing user session' })
  }
  // A suspended account still reads, but writes nothing (§10.5)
  if (ctx.req.method !== 'GET' && isSuspended(session.userId)) {
    throw new respond.ForbiddenError({
      message: 'Account suspended',
      reason: 'suspended',
    })
  }
  return session
}

/**
 * The session of a request that only records what was read (a notification,
 * a conversation, a channel): a suspended account may still do it (§10.5)
 */
export const withReadingSession = async (ctx: RequestContext) => {
  const session = await decodeSession(ctx.cookies.session)
  if (!session) {
    throw new respond.UnauthorizedError({ message: 'Missing user session' })
  }
  return session
}

export const withOptionalSession = (ctx: RequestContext) =>
  decodeSession(ctx.cookies.session)

export const setSessionCookie = (response: Response, session: string) => {
  setCookie(response.headers, {
    name: 'session',
    value: session,
    path: BASE_URL,
    secure: true,
    httpOnly: true,
    sameSite: 'Lax',
    maxAge: MAX_AGE,
  })
  return response
}

export const endSession = (session: Session | undefined) => {
  session && Entry.archive(session.entryId)
  const response = respond.NoContent()
  deleteCookie(response.headers, 'session', {
    path: BASE_URL,
    secure: true,
    httpOnly: true,
  })
  return response
}
