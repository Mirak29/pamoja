// First: refuses to start without APP_ENV=prod, before the API loads
import '/api/lib/production.ts'
import api from './api/server.ts'
import { serveDir } from 'jsr:@std/http@^1.0.20/file-server'
import { BASE_URL } from '/api/lib/env.ts'

const html = Deno.readTextFileSync(import.meta.dirname + '/dist/index.html')
  .replace(
    '<base href="/" />',
    `<base href="${BASE_URL}" />`,
  )
const encoder = new TextEncoder()
const indexHtml = encoder.encode(html)
const port = Number(Deno.env.get('PORT')) || 8000
const serveDirOpts = { fsRoot: import.meta.dirname + '/dist' }
const htmlContent = { headers: { 'Content-Type': 'text/html' } }
Deno.serve({ port }, (req) => {
  const { pathname } = new URL(req.url)

  if (pathname.startsWith('/api/')) {
    return api.fetch(req)
  }

  if (pathname.includes('.')) {
    return serveDir(req, serveDirOpts)
  }

  return new Response(indexHtml, htmlContent)
})
