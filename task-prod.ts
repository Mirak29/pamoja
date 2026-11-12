import { config, copyMocks } from './build-config.ts'
import { build } from 'npm:esbuild@0.25.5'

// From an empty folder: what the dev build left there (source maps, its
// CSS, chunks of older versions) never ships
await Deno.remove('dist', { recursive: true }).catch((error) => {
  if (!(error instanceof Deno.errors.NotFound)) throw error
})
await build({
  ...config,
  sourcemap: false,
  minify: true,
  // The licenses stay in the packages: not sent with each page
  legalComments: 'none',
})
copyMocks()

const tailwind = await new Deno.Command('deno', {
  args: [
    'run',
    '-A',
    'npm:@tailwindcss/cli',
    '--input=web/assets/styles/style.css',
    '--minify',
  ],
  stderr: 'inherit',
}).output()
if (!tailwind.success) throw Error('tailwind build failed')

// Inline the CSS in the HTML to save a request on first load
const css = new TextDecoder().decode(tailwind.stdout)
const html = Deno.readTextFileSync('web/index.html')
  .replace(
    '<link rel="stylesheet" href="style.css" />',
    `<style>${css}</style>`,
  )
Deno.writeTextFileSync('dist/index.html', html)
