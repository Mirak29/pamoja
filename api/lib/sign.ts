import { b64url } from '/api/lib/encoding.ts'
import { SESSION_SECRET } from '/api/lib/env.ts'

// HMAC SHA-256 with SESSION_SECRET: what the server signs, it can trust when
// it comes back, even after a restart

/** An HMAC SHA-256 key made of a secret */
export const hmacKey = (secret: string, usages: KeyUsage[]) =>
  crypto.subtle.importKey(
    'raw',
    new TextEncoder().encode(secret),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    usages,
  )

/** The key of SESSION_SECRET: signed tokens and session cookies */
export const sessionKey = await hmacKey(SESSION_SECRET, ['sign', 'verify'])

/** `data.signature`, both in base64url */
export const signText = async (data: string) => {
  const bytes = new TextEncoder().encode(data)
  const signature = await crypto.subtle.sign('HMAC', sessionKey, bytes)
  return `${bytes.toBase64(b64url)}.${
    new Uint8Array(signature).toBase64(b64url)
  }`
}

/** The text of a signed token, if its signature is valid */
export const verifyText = async (token: string) => {
  const [data, signature, extra] = token.split('.')
  if (!data || !signature || extra !== undefined) return
  try {
    const bytes = Uint8Array.fromBase64(data, b64url).slice()
    const hash = Uint8Array.fromBase64(signature, b64url).slice()
    // verify compares in constant time
    if (!await crypto.subtle.verify('HMAC', sessionKey, hash, bytes)) return
    return new TextDecoder().decode(bytes)
  } catch {
    return
  }
}
