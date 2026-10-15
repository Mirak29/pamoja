import { b64url } from '/api/lib/encoding.ts'
import { GITHUB_APP_ID, GITHUB_APP_PRIVATE_KEY } from '/api/lib/env.ts'
import { log } from '/api/lib/log.ts'

// The GitHub App speaking for itself (§5.2): a JWT signed with its private
// key, valid 10 minutes, asks GitHub where the app is installed. The
// installation tokens of the live sync come from it too (PAM-204).

export const appConfigured = () => !!(GITHUB_APP_ID && GITHUB_APP_PRIVATE_KEY)

// GitHub hands out a PKCS#1 key (BEGIN RSA PRIVATE KEY); WebCrypto reads
// PKCS#8 only: wrap it in the PKCS#8 envelope of an RSA key
const derLength = (length: number) =>
  length < 0x80
    ? [length]
    : length < 0x100
    ? [0x81, length]
    : length < 0x10000
    ? [0x82, length >> 8, length & 0xff]
    : [0x83, length >> 16, (length >> 8) & 0xff, length & 0xff]

const der = (tag: number, content: Uint8Array) =>
  new Uint8Array([tag, ...derLength(content.length), ...content])

// SEQUENCE { OID rsaEncryption, NULL }
const rsaAlgorithm = Uint8Array.fromHex('300d06092a864886f70d0101010500')

export const pkcs1ToPkcs8 = (pkcs1: Uint8Array) =>
  der(
    0x30,
    new Uint8Array([
      ...[0x02, 0x01, 0x00], // version 0
      ...rsaAlgorithm,
      ...der(0x04, pkcs1),
    ]),
  )

const pemBody = (pem: string) =>
  Uint8Array.fromBase64(
    pem.replace(/-----[A-Z ]+-----/g, '').replace(/\s+/g, ''),
  )

/** The private key of the app, from its PEM, PKCS#1 or PKCS#8 */
export const importPrivateKey = (pem: string) => {
  const text = pem.replaceAll('\\n', '\n')
  const body = pemBody(text)
  const pkcs8 = text.includes('BEGIN RSA PRIVATE KEY')
    ? pkcs1ToPkcs8(body)
    : body
  return crypto.subtle.importKey(
    'pkcs8',
    pkcs8,
    { name: 'RSASSA-PKCS1-v1_5', hash: 'SHA-256' },
    false,
    ['sign'],
  )
}

const encode = (value: unknown) =>
  new TextEncoder().encode(JSON.stringify(value)).toBase64(b64url)

/** A JWT of the app: issued a minute early for clock drift, valid 9 more */
export const appJwt = async (
  appId = GITHUB_APP_ID,
  pem = GITHUB_APP_PRIVATE_KEY,
) => {
  const key = await importPrivateKey(pem)
  const now = Math.floor(Date.now() / 1000)
  const unsigned = `${encode({ alg: 'RS256', typ: 'JWT' })}.${
    encode({ iat: now - 60, exp: now + 540, iss: appId })
  }`
  const signature = await crypto.subtle.sign(
    'RSASSA-PKCS1-v1_5',
    key,
    new TextEncoder().encode(unsigned),
  )
  return `${unsigned}.${new Uint8Array(signature).toBase64(b64url)}`
}

/**
 * The installation of the app that covers this repo, if any: lets an import
 * go live at once (§5.4). Undefined without the app configured.
 */
export const installationOf = async (fullName: string) => {
  if (!appConfigured()) return
  const res = await fetch(
    `https://api.github.com/repos/${fullName}/installation`,
    {
      headers: {
        Accept: 'application/vnd.github+json',
        Authorization: `Bearer ${await appJwt()}`,
        'User-Agent': 'Pamoja',
        'X-GitHub-Api-Version': '2022-11-28',
      },
    },
  )
  if (res.status === 404) {
    await res.body?.cancel()
    return
  }
  if (!res.ok) {
    await res.body?.cancel()
    log.warn('github-app-error', { fullName, status: res.status })
    return
  }
  const installation = await res.json() as {
    id: number
    account: { login: string; type: 'User' | 'Organization' }
  }
  return installation
}
