import { config } from './build-config.ts'
import { context } from 'npm:esbuild'
import api from '/api/server.ts'

const ctx = await context({
  ...config,
  entryPoints: { ...config.entryPoints, index: 'web/debug-app.ts' },
  sourcemap: 'both',
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

const { port } = await ctx.serve({ servedir: 'dist' })

const getForwaredPath = (path: string) => {
  if (path === '/esbuild') return path // server event for live reload
  if (path.includes('.')) return path
  return '/'
}

export default {
  fetch(request: Request) {
    const url = new URL(request.url)
    if (url.pathname.startsWith('/api')) return api.fetch(request)
    const pathname = getForwaredPath(url.pathname)
    const apiUrl = `http://localhost:${port}${pathname}${url.hash}${url.search}`
    const { headers, method, signal, body } = request
    return fetch(apiUrl, { headers, method, signal, body, redirect: 'manual' })
  },
}
