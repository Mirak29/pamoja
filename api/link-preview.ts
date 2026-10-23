// The preview of a link (§10.6): the server reads the page once and keeps
// its title, description and site, never its image. A member chooses the
// address, so it is fetched with care (§16): http or https on their usual
// ports, a public address only (never the machine itself or its network),
// each redirect checked again, 5 s and 512 KB at most, an HTML page only.

export type Preview = {
  url: string
  title: string
  description: string
  site: string
}

/** The first http(s) link of a message, without the punctuation after it */
export const firstLink = (body: string) =>
  body.match(/https?:\/\/[^\s<>()"'`\]]+/)?.[0].replace(/[.,;:!?*_~]+$/, '')

const ipv4 = (address: string) => {
  const parts = address.split('.')
  if (parts.length !== 4 || !parts.every((p) => /^\d{1,3}$/.test(p))) return
  const bytes = parts.map(Number)
  return bytes.every((b) => b <= 255) ? bytes : undefined
}

const publicV4 = ([a, b, c]: number[]) =>
  !(
    a === 0 || a === 10 || a === 127 || a >= 224 ||
    (a === 100 && b >= 64 && b <= 127) ||
    (a === 169 && b === 254) ||
    (a === 172 && b >= 16 && b <= 31) ||
    (a === 192 && b === 0 && (c === 0 || c === 2)) ||
    (a === 192 && b === 168) ||
    (a === 198 && (b === 18 || b === 19)) ||
    (a === 198 && b === 51 && c === 100) ||
    (a === 203 && b === 0 && c === 113)
  )

/**
 * An address of the internet, not of a private network, the machine itself
 * or a reserved range. IPv6: global unicast only (2000::/3), without the
 * ranges that carry an IPv4 inside (6to4, Teredo) nor the documentation one
 */
export const isPublicAddress = (address: string) => {
  const v4 = ipv4(address)
  if (v4) return publicV4(v4)
  const v6 = address.toLowerCase().replace(/^\[|\]$/g, '')
  if (!v6.includes(':')) return false
  // An IPv4 written as IPv6 (::ffff:10.0.0.1)
  const mapped = v6.match(/^::ffff:(\d+\.\d+\.\d+\.\d+)$/)
  if (mapped) {
    const bytes = ipv4(mapped[1])
    return !!bytes && publicV4(bytes)
  }
  const first = v6.startsWith('::') ? 0 : parseInt(v6.split(':')[0], 16)
  if (!(first >= 0x2000 && first <= 0x3fff)) return false
  return !v6.startsWith('2001:db8:') && !/^2001:0?:/.test(v6) &&
    !v6.startsWith('2002:')
}

type Resolve = (host: string) => Promise<string[]>

const resolveHost: Resolve = async (host) => {
  const found = await Promise.allSettled([
    Deno.resolveDns(host, 'A'),
    Deno.resolveDns(host, 'AAAA'),
  ])
  return found.flatMap((r) => r.status === 'fulfilled' ? r.value : [])
}

/** Every address of the host is public; a name with no address is not */
const safeHost = async (hostname: string, resolve: Resolve) => {
  const host = hostname.replace(/^\[|\]$/g, '').toLowerCase()
  if (ipv4(host) || host.includes(':')) return isPublicAddress(host)
  if (
    !host.includes('.') || host === 'localhost' ||
    /\.(localhost|local|internal|lan|home|corp)$/.test(host)
  ) {
    return false
  }
  const addresses = await resolve(host)
  return addresses.length > 0 && addresses.every(isPublicAddress)
}

const MAX_BYTES = 512 * 1024
const TIMEOUT = 5_000
const MAX_REDIRECTS = 3

// The beginning of the page only: the head holds what is read
const readCapped = async (body: ReadableStream<Uint8Array>) => {
  const reader = body.getReader()
  const chunks: Uint8Array[] = []
  let size = 0
  while (size < MAX_BYTES) {
    const { done, value } = await reader.read()
    if (done) break
    chunks.push(value)
    size += value.length
  }
  reader.cancel().catch(() => {})
  const all = new Uint8Array(Math.min(size, MAX_BYTES))
  let offset = 0
  for (const chunk of chunks) {
    const part = chunk.subarray(0, all.length - offset)
    all.set(part, offset)
    offset += part.length
  }
  return new TextDecoder().decode(all)
}

const entities: Record<string, string> = {
  amp: '&',
  lt: '<',
  gt: '>',
  quot: '"',
  apos: "'",
  nbsp: ' ',
}

const decode = (text: string) =>
  text.replace(/&(#x[0-9a-f]+|#\d+|[a-z]+);/gi, (all, code: string) => {
    if (code[0] !== '#') return entities[code.toLowerCase()] ?? all
    const n = code[1] === 'x' || code[1] === 'X'
      ? parseInt(code.slice(2), 16)
      : Number(code.slice(1))
    return n > 0 && n <= 0x10ffff ? String.fromCodePoint(n) : ''
  })

// Text only: no tag, no control character, one line, cut to its size
const clean = (text: string | undefined, max: number) => {
  const plain = decode(text ?? '')
    .replace(/<[^>]*>/g, '')
    // deno-lint-ignore no-control-regex
    .replace(/[\u0000-\u001f\u007f]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
  return plain.length > max ? `${plain.slice(0, max - 1)}…` : plain
}

/** Title, description and site of an HTML page, from its head */
export const readPreview = (html: string, url: string): Preview | undefined => {
  const head = html.slice(0, html.search(/<\/head>/i) + 1 || html.length)
  const meta = new Map<string, string>()
  // A quoted value may hold a « > »
  for (const [tag] of head.matchAll(/<meta\s(?:[^>"']|"[^"]*"|'[^']*')*>/gi)) {
    const attributes = new Map<string, string>()
    for (
      const [, name, , double, single, bare] of tag.matchAll(
        /([a-z:-]+)\s*=\s*("([^"]*)"|'([^']*)'|([^\s>]+))/gi,
      )
    ) {
      attributes.set(name.toLowerCase(), double ?? single ?? bare ?? '')
    }
    const key = (attributes.get('property') ?? attributes.get('name'))
      ?.toLowerCase()
    const content = attributes.get('content')
    if (key && content !== undefined && !meta.has(key)) meta.set(key, content)
  }
  const title = clean(
    meta.get('og:title') ?? meta.get('twitter:title') ??
      head.match(/<title[^>]*>([\s\S]*?)<\/title>/i)?.[1],
    200,
  )
  if (!title) return
  return {
    url,
    title,
    description: clean(
      meta.get('og:description') ?? meta.get('description') ??
        meta.get('twitter:description'),
      300,
    ),
    site: clean(meta.get('og:site_name'), 80) ||
      new URL(url).hostname.replace(/^www\./, ''),
  }
}

export type Fetch = (url: URL, init: RequestInit) => Promise<Response>

/**
 * Reads the preview of a link, or nothing: a refused address, an error, a
 * page that is not HTML or has no title
 */
export const fetchPreview = async (
  link: string,
  { resolve = resolveHost, fetch = globalThis.fetch as Fetch } = {},
): Promise<Preview | undefined> => {
  let current: URL
  try {
    current = new URL(link)
  } catch {
    return
  }
  try {
    for (let hop = 0; hop <= MAX_REDIRECTS; hop++) {
      if (current.protocol !== 'http:' && current.protocol !== 'https:') return
      if (current.port && current.port !== '80' && current.port !== '443') {
        return
      }
      if (current.username || current.password) return
      if (!await safeHost(current.hostname, resolve)) return
      const res = await fetch(current, {
        redirect: 'manual',
        signal: AbortSignal.timeout(TIMEOUT),
        headers: {
          'User-Agent': 'PamojaBot/1.0 (link preview)',
          Accept: 'text/html',
        },
      })
      if (res.status >= 300 && res.status < 400) {
        await res.body?.cancel()
        const location = res.headers.get('location')
        if (!location) return
        current = new URL(location, current)
        continue
      }
      const type = res.headers.get('content-type') ?? ''
      if (!res.ok || !res.body || !/^text\/html\b/i.test(type)) {
        await res.body?.cancel()
        return
      }
      return readPreview(await readCapped(res.body), link)
    }
  } catch {
    // Unreachable, too slow, refused: no preview
  }
}
