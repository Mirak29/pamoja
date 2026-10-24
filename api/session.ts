import { deleteCookie, setCookie } from 'jsr:@std/http@^1.0.20/cookie'
import { respond } from '@01edu/api/response'
import type { RequestContext } from '@01edu/api/context'
import { now } from '@01edu/time'
import { entries, Entry } from '/api/entries.ts'
import { b64url } from '/api/lib/encoding.ts'
import { BASE_URL } from '/api/lib/env.ts'
import { sessionKey } from '/api/lib/sign.ts'

// A session is a USER_LOGIN entry, like in Tournament. The cookie holds its
// id, signed with SESSION_SECRET: Tournament signs with the password salt,
// Pamoja has no password (§5.3).

export type Session = { entryId: number; userId: number; createdAt: number }

// 30 days in seconds, the unit of `now()` and of the cookie Max-Age; checked
// on the server from the entry, not only by the cookie expiry
const MAX_AGE = 30 * 24 * 60 * 60

const encodeId = (entryId: number) =>
  new Uint8Array(new Float64Array([entryId]).buffer)

const getLogin = Entry.sql<'userId' | 'createdAt', number>`
  SELECT userId, createdAt
  FROM entry
  WHERE id = ? AND type = ${entries.USER_LOGIN}
`.get

export const createSession = async (
  userId: number,
  source: 'github' | 'demo',
) => {
  const entryId = Entry.insert.USER_LOGIN({ userId, source })
  const data = encodeId(entryId)
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
  if (bytes.byteLength !== 8) return
  // verify compares in constant time
  if (!await crypto.subtle.verify('HMAC', sessionKey, hash, bytes)) return
  const [entryId] = new Float64Array(bytes.buffer)
  // An archived entry (logout) is no longer in the `entry` view
  const login = getLogin(entryId)
  if (!login?.userId || now() - login.createdAt > MAX_AGE) return
  return { entryId, userId: login.userId, createdAt: login.createdAt }
}

export const withSession = async (ctx: RequestContext) => {
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
