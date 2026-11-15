// deno task pwa-icons: the icons of the installed app (PWA), drawn from the
// logo into web/assets/pwa/. Run again only when the logo changes.
import { initWasm, Resvg } from '@resvg/resvg-wasm'

await initWasm(
  await Deno.readFile(
    new URL(
      './index_bg.wasm',
      import.meta.resolve('@resvg/resvg-wasm'),
    ),
  ),
)

// The P of the logo: a straight leg (the code) and an indigo thread joining
// two nodes (two people), on a 64 grid
const mark = `
  <line x1="22" y1="12" x2="22" y2="54" stroke="#1D1D25" stroke-width="4" stroke-linecap="round"/>
  <path d="M22 12 C 51 12, 51 38, 22 38" fill="none" stroke="#3340B8" stroke-width="4" stroke-linecap="round"/>
  <circle cx="22" cy="12" r="5.5" fill="#3340B8"/>
  <circle cx="22" cy="38" r="5.5" fill="#3340B8"/>`

/**
 * The mark centred on the light surface. `inner` is the share of the side
 * the mark fills: Android's maskable icons keep a safe circle of 80 %, so
 * the mark stays inside it once the corners are cut
 */
const icon = (size: number, inner: number, radius: number) => {
  // The mark's own box, strokes included: x 16.5 to 44.8, y 6.5 to 56
  const scale = (size * inner) / 49.5
  const x = size / 2 - 30.6 * scale
  const y = size / 2 - 31.25 * scale
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 ${size} ${size}">
  <rect width="${size}" height="${size}" rx="${radius}" fill="#F6F6F8"/>
  <g transform="translate(${x} ${y}) scale(${scale})">${mark}</g>
</svg>`
}

const out = 'web/assets/pwa'
await Deno.mkdir(out, { recursive: true })
const files: [string, string][] = [
  // Any shape: the system shows it as it is, rounded by its own corners
  ['icon-192.png', icon(192, 0.62, 42)],
  ['icon-512.png', icon(512, 0.62, 112)],
  // Maskable: full bleed, the system cuts its own shape
  ['icon-maskable-512.png', icon(512, 0.5, 0)],
  // iOS rounds the corners itself and refuses transparency
  ['apple-touch-icon.png', icon(180, 0.58, 0)],
]
for (const [name, svg] of files) {
  const png = new Resvg(svg).render().asPng()
  await Deno.writeFile(`${out}/${name}`, png)
  console.log(`${out}/${name}`, png.length, 'bytes')
}
