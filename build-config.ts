import { denoPlugins } from 'jsr:@luca/esbuild-deno-loader@^0.11.1'
import type { BuildOptions } from 'npm:esbuild@0.25.5'
// check to update to 25.6 once @luca/esbuild-deno-loader use the newer
// build type

export const config: BuildOptions = {
  entryPoints: { index: 'web/app.tsx' },
  // The loader asks `deno info` for each package, with --no-config unless it
  // is given the config. Without deno.json, @preact/signals took Preact 11 as
  // its peer and relinked node_modules to it: the bundle got a second Preact
  // whose components never followed the signals, and the page stayed blank.
  plugins: [...denoPlugins({ configPath: `${import.meta.dirname}/deno.json` })],
  format: 'esm',
  bundle: true,
  jsxFactory: 'h',
  jsxFragment: 'Fragment',
  // A page loads what it shows: the land of the globe comes apart
  splitting: true,
  chunkNames: 'chunks/[name]-[hash]',
  outdir: 'dist',
  // The pages of the team (/dev), served in dev only: the production build
  // sets it false and drops them (§17.4)
  define: { DEV_PAGES: 'true' },
} as const

/** The demo images of the fixtures, served next to the bundle */
export const copyMocks = () => {
  Deno.mkdirSync('dist/mocks', { recursive: true })
  for (const { name } of Deno.readDirSync('web/assets/mocks')) {
    Deno.copyFileSync(`web/assets/mocks/${name}`, `dist/mocks/${name}`)
  }
}
