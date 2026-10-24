import { sql } from '@01edu/db'
import { respond } from '@01edu/api/response'
import { now } from '@01edu/time'
import { every } from '/api/lib/background.ts'
import { APP_ENV } from '/api/lib/env.ts'
import { type Window, within } from '/api/lib/rate.ts'
import { Media } from '/api/schema.ts'

// Uploaded images and files (§17.3). The browser resizes an image and
// strips its metadata before sending it; the server checks the type on the
// first bytes, never the name, and writes the file on disk under a random
// name, never in SQLite. An upload waits for its content (a message): never
// attached after 24 h, it is deleted.

export const MEDIA_LIMITS = {
  image: 2 * 1024 * 1024,
  file: 5 * 1024 * 1024,
  // The browser sends 2 000 px at most: more is not a photo of a screen
  side: 4096,
  uploads: { count: 20, per: 3600 },
}

// The whole request, form included: refused before it is read
const MAX_REQUEST = MEDIA_LIMITS.file + 64 * 1024

/** Where the files live: a persistent volume in production (§17.4) */
export const MEDIA_DIR = Deno.env.get('MEDIA_DIR') ??
  (APP_ENV === 'test'
    ? Deno.makeTempDirSync({ prefix: 'pamoja-media-' })
    : './media')
Deno.mkdirSync(MEDIA_DIR, { recursive: true })
// The folder of the tests goes with them
if (APP_ENV === 'test' && !Deno.env.get('MEDIA_DIR')) {
  globalThis.addEventListener('unload', () => {
    try {
      Deno.removeSync(MEDIA_DIR, { recursive: true })
    } catch {
      // Already gone
    }
  })
}

const notFound = () => new respond.NotFoundError({ message: 'Media not found' })
const badRequest = (message: string) => new respond.BadRequestError({ message })
const tooLarge = () =>
  new respond.ContentTooLargeError({ message: 'File too large' })

type Kind = { mime: string; ext: string; image: boolean }

/** The type of a file, read on its first bytes */
export const sniff = (bytes: Uint8Array): Kind | undefined => {
  const at = (offset: number, ...values: number[]) =>
    values.every((value, i) => bytes[offset + i] === value)
  if (at(0, 0xff, 0xd8, 0xff)) {
    return { mime: 'image/jpeg', ext: 'jpg', image: true }
  }
  if (at(0, 0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a)) {
    return { mime: 'image/png', ext: 'png', image: true }
  }
  // RIFF....WEBP
  if (at(0, 0x52, 0x49, 0x46, 0x46) && at(8, 0x57, 0x45, 0x42, 0x50)) {
    return { mime: 'image/webp', ext: 'webp', image: true }
  }
  // %PDF-
  if (at(0, 0x25, 0x50, 0x44, 0x46, 0x2d)) {
    return { mime: 'application/pdf', ext: 'pdf', image: false }
  }
}

/** Width and height, read in the header of the image */
export const sizeOf = (bytes: Uint8Array, mime: string) => {
  const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength)
  const size = (width: number, height: number) => ({ width, height })
  try {
    if (mime === 'image/png') {
      return size(view.getUint32(16), view.getUint32(20))
    }
    if (mime === 'image/webp') {
      const chunk = String.fromCharCode(...bytes.subarray(12, 16))
      if (chunk === 'VP8 ') {
        return size(
          view.getUint16(26, true) & 0x3fff,
          view.getUint16(28, true) & 0x3fff,
        )
      }
      if (chunk === 'VP8L') {
        const bits = view.getUint32(21, true)
        return size((bits & 0x3fff) + 1, ((bits >> 14) & 0x3fff) + 1)
      }
      if (chunk === 'VP8X') {
        const read24 = (offset: number) =>
          bytes[offset] | bytes[offset + 1] << 8 | bytes[offset + 2] << 16
        return size(read24(24) + 1, read24(27) + 1)
      }
      return
    }
    if (mime === 'image/jpeg') {
      // The segments up to the frame header (SOF), which holds the size
      let i = 2
      while (i + 9 < bytes.length) {
        if (bytes[i] !== 0xff) return
        const marker = bytes[i + 1]
        if (marker === 0xff) {
          i++
          continue
        }
        const frame = marker >= 0xc0 && marker <= 0xcf &&
          marker !== 0xc4 && marker !== 0xc8 && marker !== 0xcc
        if (frame) return size(view.getUint16(i + 7), view.getUint16(i + 5))
        i += 2 + view.getUint16(i + 2)
      }
    }
  } catch {
    // Cut short: unreadable
  }
}

// The name given back on download: no path, no control character
export const cleanName = (name: string, ext: string) => {
  const base = name.split(/[\\/]/).pop()!
    // A quote comes encoded in a form (%22)
    // deno-lint-ignore no-control-regex
    .replace(/%22|[\u0000-\u001f\u007f"]/g, '')
    .replace(/\.[^.]*$/, '')
    .trim()
    .slice(0, 100)
  return `${base || 'fichier'}.${ext}`
}

const randomKey = () =>
  Array.from(
    crypto.getRandomValues(new Uint8Array(16)),
    (byte) => byte.toString(16).padStart(2, '0'),
  ).join('')

const countUploads = sql<Window, { me: number; since: number }>`
  SELECT count(*) AS n, min(createdAt) AS oldest FROM media
  WHERE ownerId = :me AND createdAt > :since
`.get

export type MediaRow = {
  mediaId: number
  ownerId: number
  storageKey: string
  mime: string
  width: number
  height: number
  bytes: number
  fileName: string | null
  targetType: string | null
  targetId: number | null
  position: number
  hiddenAt: number | null
  createdAt: number
}

/** What a page shows of a media: its address is its random key */
export const shownMedia = (m: MediaRow) => ({
  id: m.mediaId,
  key: m.storageKey,
  mime: m.mime,
  image: m.mime.startsWith('image/'),
  width: m.width,
  height: m.height,
  bytes: m.bytes,
  name: m.fileName ?? '',
})

const getMedia = sql<MediaRow, number>`
  SELECT * FROM media WHERE mediaId = ?
`.get

/** The body of a request, refused as soon as it passes `max` bytes */
const readCapped = async (req: Request, max: number) => {
  const chunks: Uint8Array[] = []
  let size = 0
  for await (const chunk of req.body ?? []) {
    size += chunk.length
    if (size > max) throw tooLarge()
    chunks.push(chunk)
  }
  const all = new Uint8Array(size)
  let offset = 0
  for (const chunk of chunks) {
    all.set(chunk, offset)
    offset += chunk.length
  }
  return all
}

/**
 * An image (JPEG, PNG, WebP, 2 MB) or a PDF (5 MB), read from the form of
 * the request (§17.3); 20 uploads by hour
 */
export const upload = async (me: number, req: Request) => {
  const length = Number(req.headers.get('content-length'))
  if (length > MAX_REQUEST) throw tooLarge()
  within(countUploads, MEDIA_LIMITS.uploads, me, 'Too many uploads')
  let form: FormData
  try {
    // Read with its limit: a body sent in chunks has no Content-Length
    const body = await readCapped(req, MAX_REQUEST)
    form = await new Response(body, { headers: req.headers }).formData()
  } catch (err) {
    if (err instanceof respond.ContentTooLargeError) throw err
    throw badRequest('A file is required')
  }
  const file = form.get('file')
  if (!(file instanceof File)) throw badRequest('A file is required')
  if (file.size > MEDIA_LIMITS.file) throw tooLarge()
  const bytes = new Uint8Array(await file.arrayBuffer())
  const kind = sniff(bytes)
  if (!kind) {
    throw new respond.UnsupportedMediaTypeError({
      message: 'Only JPEG, PNG or WebP images and PDF files',
    })
  }
  if (kind.image && bytes.length > MEDIA_LIMITS.image) throw tooLarge()
  const size = kind.image ? sizeOf(bytes, kind.mime) : { width: 0, height: 0 }
  if (!size || (kind.image && (!size.width || !size.height))) {
    throw badRequest('Unreadable image')
  }
  if (size.width > MEDIA_LIMITS.side || size.height > MEDIA_LIMITS.side) {
    throw badRequest('Image too large')
  }
  const storageKey = `${randomKey()}.${kind.ext}`
  await Deno.writeFile(`${MEDIA_DIR}/${storageKey}`, bytes, { createNew: true })
  const mediaId = Media.insert({
    ownerId: me,
    storageKey,
    mime: kind.mime,
    width: size.width,
    height: size.height,
    bytes: bytes.length,
    fileName: kind.image ? null : cleanName(file.name, kind.ext),
    targetType: null,
    targetId: null,
    position: 0,
    hiddenAt: null,
    source: 'platform',
    createdAt: now(),
  })
  return shownMedia(getMedia(mediaId)!)
}

const setTarget = sql<
  undefined,
  { mediaId: number; targetType: string; targetId: number; position: number }
>`
  UPDATE media SET targetType = :targetType, targetId = :targetId,
    position = :position
  WHERE mediaId = :mediaId AND targetType IS NULL
`.run

/** Attaches uploads of the developer to what they wrote, in this order */
export const attach = (
  me: number,
  ids: number[],
  targetType: string,
  targetId: number,
) => {
  if (new Set(ids).size !== ids.length) throw badRequest('Twice the same file')
  ids.forEach((mediaId, position) => {
    const media = getMedia(mediaId)
    if (!media || media.ownerId !== me || media.targetType || media.hiddenAt) {
      throw badRequest('No such upload')
    }
    setTarget({ mediaId, targetType, targetId, position })
  })
}

const listOf = sql<MediaRow, { targetType: string; ids: string }>`
  SELECT * FROM media
  WHERE targetType = :targetType
    AND targetId IN (SELECT value FROM json_each(:ids))
  ORDER BY targetId, position
`.all

/** The media of several contents, by content */
export const mediaOf = (targetType: string, ids: number[]) => {
  const byTarget = new Map<number, ReturnType<typeof shownMedia>[]>()
  if (!ids.length) return byTarget
  for (const m of listOf({ targetType, ids: JSON.stringify(ids) })) {
    byTarget.set(m.targetId!, [
      ...byTarget.get(m.targetId!) ?? [],
      shownMedia(m),
    ])
  }
  return byTarget
}

const deleteRow = sql<undefined, number>`
  DELETE FROM media WHERE mediaId = ?
`.run

/** Deletes media: their rows and their files */
const remove = (media: MediaRow[]) => {
  for (const m of media) {
    deleteRow(m.mediaId)
    try {
      Deno.removeSync(`${MEDIA_DIR}/${m.storageKey}`)
    } catch {
      // Already gone
    }
  }
}

/** Deletes the media of a content: rows and files */
export const removeMediaOf = (targetType: string, targetId: number) =>
  remove(listOf({ targetType, ids: JSON.stringify([targetId]) }))

const listStale = sql<MediaRow, number>`
  SELECT * FROM media WHERE targetType IS NULL AND createdAt < ?
`.all

/** Uploads never attached after 24 h: deleted (§17.3) */
export const cleanMedia = (at = now()) => {
  const stale = listStale(at - 24 * 3600)
  remove(stale)
  return stale.length
}

/** Every hour, from the start of the server */
export const startMediaCleanup = () =>
  every('media-cleanup-error', 3600_000, () => cleanMedia())

const getReadable = sql<
  MediaRow & { conversationId: number | null; messageDeleted: number | null },
  string
>`
  SELECT media.*, directMessage.conversationId,
    directMessage.deletedAt AS messageDeleted
  FROM media
  LEFT JOIN directMessage ON media.targetType = 'message'
    AND directMessage.directMessageId = media.targetId
  WHERE media.storageKey = ?
`.get

const getMembership = sql<
  { yes: number },
  { conversationId: number; userId: number }
>`
  SELECT 1 AS yes FROM conversationMember
  WHERE conversationId = :conversationId AND userId = :userId
`.get

/**
 * The file of a media, to whom may see it: an upload to its owner, a file
 * of a direct message to the two of the conversation (§10.6)
 */
export const serveMedia = async (me: number, key: string) => {
  if (!/^[0-9a-f]{32}\.(jpg|png|webp|pdf)$/.test(key)) throw notFound()
  const media = getReadable(key)
  if (!media || media.hiddenAt) throw notFound()
  const allowed = !media.targetType
    ? media.ownerId === me
    : media.targetType === 'message'
    ? media.conversationId !== null && !media.messageDeleted &&
      !!getMembership({ conversationId: media.conversationId, userId: me })
    : true
  if (!allowed) throw notFound()
  let file: Deno.FsFile
  try {
    file = await Deno.open(`${MEDIA_DIR}/${media.storageKey}`)
  } catch {
    throw notFound()
  }
  const image = media.mime.startsWith('image/')
  return new Response(file.readable, {
    headers: {
      'Content-Type': media.mime,
      'Content-Length': String(media.bytes),
      // The key never changes for a file, and only its readers fetch it
      'Cache-Control': 'private, max-age=31536000, immutable',
      'X-Content-Type-Options': 'nosniff',
      'Content-Security-Policy': "default-src 'none'; sandbox",
      'Cross-Origin-Resource-Policy': 'same-origin',
      // A PDF is downloaded, never opened in the page
      'Content-Disposition': image
        ? 'inline'
        : `attachment; filename*=UTF-8''${
          encodeURIComponent(media.fileName ?? `fichier.pdf`)
        }`,
    },
  })
}
