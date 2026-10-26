import { config } from './build-config.ts'
import { context } from 'npm:esbuild@0.25.5'
import { serveDir } from 'jsr:@std/http@^1.0.20/file-server'
import api from '/api/server.ts'
import { VIDEO_FRAMES } from '/api/video-links.ts'

const ctx = await context({
  ...config,
  entryPoints: { ...config.entryPoints, index: 'web/debug-app.ts' },
  // A separate map: the browser loads it only when the devtools are open
  sourcemap: 'linked',
})

await ctx.watch()

Deno.mkdirSync('dist', { recursive: true })
Deno.copyFileSync('web/index.html', 'dist/index.html')

// Tailwind compiles the CSS next to the bundle, the piped stdin makes it stop
// with this process when `deno serve --watch` restarts
new Deno.Command('deno', {
  args: [
    'run',
    '-A',
    'npm:@tailwindcss/cli',
    '--input=web/assets/styles/style.css',
    '--output=dist/style.css',
    '--watch',
  ],
  stdin: 'piped',
}).spawn()

// 127.0.0.1, not localhost: on Windows, localhost tries IPv6 first and
// esbuild only listens on IPv4, which cost 2 s per file. Port 8801, next to
// the app: on its default 8000, esbuild served the pages without /api, and a
// login opened there failed
const { port } = await ctx.serve({
  servedir: 'dist',
  host: '127.0.0.1',
  port: 8801,
})

// esbuild writes the bundle into dist: every file is read from disk, the
// page included. Only the live reload events come from esbuild: going
// through it for each file cost up to 2.5 s on Windows.
// Always revalidated: without Cache-Control, the browser keeps the bundle by
// heuristic and shows the code before the last rebuild
const fresh = async (response: Promise<Response>) => {
  const res = await response
  res.headers.set('Cache-Control', 'no-cache')
  return res
}

const fromDisk = (request: Request) =>
  fresh(serveDir(request, { fsRoot: 'dist', quiet: true }))

// A page frames the players of the embedded videos only (§17.3)
const index = async (request: Request) => {
  const res = await fromDisk(new Request(new URL('/index.html', request.url)))
  res.headers.set(
    'Content-Security-Policy',
    `frame-src ${VIDEO_FRAMES.join(' ')}`,
  )
  return res
}

export default {
  fetch(request: Request) {
    const url = new URL(request.url)
    if (url.pathname.startsWith('/api')) return api.fetch(request)
    if (url.pathname === '/esbuild') {
      const { headers, signal } = request
      return fetch(`http://127.0.0.1:${port}/esbuild`, { headers, signal })
    }
    if (!url.pathname.includes('.')) return index(request)
    return fromDisk(request)
  },
}
