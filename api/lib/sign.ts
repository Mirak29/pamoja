import { b64url } from '/api/lib/encoding.ts'
import { SESSION_SECRET } from '/api/lib/env.ts'

// HMAC SHA-256 with SESSION_SECRET: what the server signs, it can trust when
// it comes back, even after a restart

const key = await crypto.subtle.importKey(
  'raw',
  new TextEncoder().encode(SESSION_SECRET),
  { name: 'HMAC', hash: 'SHA-256' },
  false,
  ['sign', 'verify'],
)

/** `data.signature`, both in base64url */
export const signText = async (data: string) => {
  const bytes = new TextEncoder().encode(data)
  const signature = await crypto.subtle.sign('HMAC', key, bytes)
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
    if (!await crypto.subtle.verify('HMAC', key, hash, bytes)) return
    return new TextDecoder().decode(bytes)
  } catch {
    return
  }
}
