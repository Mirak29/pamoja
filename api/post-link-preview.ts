import '/api/schema.ts'
import { sql } from '@01edu/db'
import { respond } from '@01edu/api/response'
import { fetchPreview, type Preview } from '/api/link-preview.ts'

const projectOf = sql<{ name: string; description: string }, string>`
  SELECT name, description FROM project WHERE slug = ? AND visibility = 'public'
`.get
const cache = new Map<string, { until: number; result: Promise<Preview> }>()
let pending = 0

export const postLinkPreview = async (
  link: string,
  origin: string,
): Promise<Preview> => {
  let url: URL
  try {
    url = new URL(link)
    if (
      !['http:', 'https:'].includes(url.protocol) || url.username ||
      url.password || link.length > 2048
    ) throw new Error()
  } catch {
    throw new respond.BadRequestError('Invalid web link')
  }
  const fallback = {
    url: url.href,
    title: url.hostname,
    description: '',
    site: url.hostname,
  }
  if (url.origin === origin) {
    let slug = ''
    try {
      slug = decodeURIComponent(
        /^\/project\/([^/]+)(?:\/|$)/.exec(url.pathname)?.[1] ?? '',
      )
    } catch { /* Invalid path: domain only */ }
    const project = slug ? projectOf(slug) : undefined
    return project
      ? {
        ...fallback,
        title: project.name,
        description: project.description,
        site: 'Pamoja',
      }
      : fallback
  }
  const saved = cache.get(url.href)
  if (saved && saved.until > Date.now()) return await saved.result
  if (pending >= 4) return fallback
  if (cache.size >= 200) cache.delete(cache.keys().next().value!)
  pending++
  const result = fetchPreview(url.href).then((preview) => preview ?? fallback)
    .finally(() => pending--)
  cache.set(url.href, { until: Date.now() + 3600000, result })
  return await result
}
