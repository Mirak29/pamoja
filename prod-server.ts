// First: refuses to start without APP_ENV=prod, before the API loads
import '/api/lib/production.ts'
import api from './api/server.ts'
import { serveDir } from 'jsr:@std/http@^1.0.20/file-server'
import { BASE_URL } from '/api/lib/env.ts'
import { VIDEO_FRAMES } from '/api/video-links.ts'

const html = Deno.readTextFileSync(import.meta.dirname + '/dist/index.html')
  .replace(
    '<base href="/" />',
    `<base href="${BASE_URL}" />`,
  )
const encoder = new TextEncoder()
const indexHtml = encoder.encode(html)
const port = Number(Deno.env.get('PORT')) || 8000
const serveDirOpts = { fsRoot: import.meta.dirname + '/dist' }
// The page and the files without a hash in their name are revalidated (an
// ETag, then 304 while unchanged); the chunks named after their hash never
// change: kept a year (§12.7)
const htmlContent = {
  headers: {
    'Content-Type': 'text/html',
    'Cache-Control': 'no-cache',
    // A page frames the players of the embedded videos only (§17.3)
    'Content-Security-Policy': `frame-src ${VIDEO_FRAMES.join(' ')}`,
  },
}
const cached = async (response: Promise<Response>, pathname: string) => {
  const res = await response
  res.headers.set(
    'Cache-Control',
    pathname.startsWith('/chunks/')
      ? 'public, max-age=31536000, immutable'
      : 'no-cache',
  )
  return res
}
// Compressed when the browser accepts it: JSON shrinks several times
// (§12.7). Off by default in Deno; the event stream opts out (no-transform)
Deno.serve({ port, automaticCompression: true }, (req) => {
  const { pathname } = new URL(req.url)

  if (pathname.startsWith('/api/')) {
    return api.fetch(req)
  }

  if (pathname.includes('.')) {
    return cached(serveDir(req, serveDirOpts), pathname)
  }

  return new Response(indexHtml, htmlContent)
})
