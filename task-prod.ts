import { config } from './build-config.ts'
import { copyBadgeAssets } from './task-copy-assets.ts'
import { build } from 'npm:esbuild'

await build({ ...config, sourcemap: false, minify: true })
copyBadgeAssets()

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
