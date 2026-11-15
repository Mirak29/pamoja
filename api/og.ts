import { sql } from '@01edu/db'
import { APP_ENV } from '/api/lib/env.ts'
import { profileCardData, projectCardData } from '/api/share-card.ts'

// Previews of a shared link and the sitemap (§17.1). A crawler (LinkedIn,
// X, WhatsApp, Discord, Slack) reads no JavaScript: the server writes in the
// page the title, the description and the card of a profile (/@login) or of
// a project (/project/slug), read from the database and escaped in HTML.
// Every other page gets the default ones.

const DEFAULT = {
  title: 'Pamoja',
  description:
    'Les développeurs africains collaborent sur de vrais projets : chaque review, chaque aide devient une preuve, vérifiée par GitHub.',
}

/** Text written in HTML: a name may hold markup */
export const escapeHtml = (text: string) =>
  text.replace(
    /[&<>"']/g,
    (c) =>
      ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[
        c
      ]!,
  )

/**
 * The origin of the links the page gives: behind Caddy the request says
 * http, the address is https
 */
export const originOf = (req: Request) => {
  const url = new URL(req.url)
  const proto = req.headers.get('x-forwarded-proto') ??
    (APP_ENV === 'prod' ? 'https' : url.protocol.slice(0, -1))
  return `${proto}://${req.headers.get('host') ?? url.host}`
}

type Preview = {
  title: string
  description: string
  image?: string
  url: string
}

const short = (text: string, max = 200) =>
  text.length > max ? `${text.slice(0, max - 1).trimEnd()}…` : text

/** The preview of a path, from what the database holds */
export const previewOf = (pathname: string, origin: string): Preview => {
  const url = `${origin}${pathname}`
  const profile = pathname.match(/^\/@([A-Za-z0-9-]{1,39})\/?$/)
  if (profile) {
    const card = profileCardData(profile[1])
    if (card) {
      const proofs = card.proofs
        ? ` · ${card.proofs} preuve${card.proofs > 1 ? 's' : ''} sur Pamoja`
        : ''
      return {
        title: `${card.name} (@${card.login}) · Pamoja`,
        description: short(
          (card.headline || `Développeur sur Pamoja`) + proofs,
        ),
        image: `${origin}/api/user/card?login=${
          encodeURIComponent(card.login)
        }`,
        url,
      }
    }
  }
  const project = pathname.match(/^\/project\/([a-z0-9-]{1,80})\/?$/)
  if (project) {
    const card = projectCardData(project[1])
    if (card) {
      return {
        title: `${card.name} · Pamoja`,
        description: short(
          card.description || `Un projet de ${card.ownerName} sur Pamoja`,
        ),
        image: `${origin}/api/project/card?slug=${
          encodeURIComponent(card.slug)
        }`,
        url,
      }
    }
  }
  return { ...DEFAULT, url }
}

/** The tags of a preview, in place of the title of the page */
export const tagsOf = (preview: Preview) => {
  const tag = (attr: string, key: string, value: string) =>
    `<meta ${attr}="${key}" content="${escapeHtml(value)}" />`
  return [
    `<title>${escapeHtml(preview.title)}</title>`,
    tag('name', 'description', preview.description),
    tag('property', 'og:site_name', 'Pamoja'),
    tag('property', 'og:type', 'website'),
    tag('property', 'og:title', preview.title),
    tag('property', 'og:description', preview.description),
    tag('property', 'og:url', preview.url),
    ...(preview.image
      ? [
        tag('property', 'og:image', preview.image),
        tag('property', 'og:image:width', '1200'),
        tag('property', 'og:image:height', '630'),
        tag('name', 'twitter:card', 'summary_large_image'),
        tag('name', 'twitter:image', preview.image),
      ]
      : [tag('name', 'twitter:card', 'summary')]),
    tag('name', 'twitter:title', preview.title),
    tag('name', 'twitter:description', preview.description),
  ].join('\n    ')
}

/** The page with the preview of its path */
export const pageWithPreview = (html: string, req: Request) => {
  const { pathname } = new URL(req.url)
  return html.replace(
    /<title>[^<]*<\/title>/,
    tagsOf(previewOf(pathname, originOf(req))),
  )
}

const publicProfiles = sql<{ login: string; at: number }, undefined>`
  SELECT user.githubUsername AS login, profile.updatedAt AS at
  FROM user JOIN profile ON profile.userId = user.userId
  WHERE user.suspendedUntil IS NULL OR user.suspendedUntil < unixepoch()
  ORDER BY user.userId
  LIMIT 50000
`.all

const publicProjects = sql<{ slug: string; at: number }, undefined>`
  SELECT slug, createdAt AS at FROM project
  WHERE visibility = 'public'
  ORDER BY projectId
  LIMIT 50000
`.all

const day = (seconds: number) =>
  new Date((seconds || Date.now() / 1000) * 1000).toISOString().slice(0, 10)

/** sitemap.xml: the public profiles and projects (§17.1) */
export const sitemap = (req: Request) => {
  const origin = originOf(req)
  const entry = (path: string, at: number) =>
    `  <url><loc>${escapeHtml(`${origin}${path}`)}</loc><lastmod>${
      day(at)
    }</lastmod></url>`
  const xml = [
    '<?xml version="1.0" encoding="UTF-8"?>',
    '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">',
    entry('/', 0),
    ...publicProfiles().map((p) =>
      entry(`/@${encodeURIComponent(p.login)}`, p.at)
    ),
    ...publicProjects().map((p) =>
      entry(`/project/${encodeURIComponent(p.slug)}`, p.at)
    ),
    '</urlset>',
  ].join('\n')
  return new Response(xml, {
    headers: {
      'Content-Type': 'application/xml; charset=utf-8',
      'Cache-Control': 'public, max-age=3600',
    },
  })
}
