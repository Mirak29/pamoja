// Renders every diagram of sources/*.mmd into images/*.png (README.md), with
// Mermaid in Chrome, in the colours of the light theme.
//
//   deno run -A docs/modelisation/render.ts [name…]
//
// Chrome or Edge must be installed; CHROME=<path> picks another one.
import puppeteer from 'npm:puppeteer-core@23.11.1'

const here = new URL('.', import.meta.url)
const path = (name: string) =>
  decodeURIComponent(new URL(name, here).pathname).replace(/^\/(\w:)/, '$1')

const executablePath = [
  Deno.env.get('CHROME'),
  'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
  'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe',
  '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
  '/usr/bin/google-chrome',
  '/usr/bin/chromium',
].find((candidate) => {
  try {
    return candidate && Deno.statSync(candidate).isFile
  } catch {
    return false
  }
})
if (!executablePath) throw new Error('Chrome introuvable : CHROME=<chemin>')

const names = Deno.args.length ? Deno.args : [...Deno.readDirSync(path('sources'))]
  .filter((entry) => entry.name.endsWith('.mmd'))
  .map((entry) => entry.name.slice(0, -4))
  .sort()

const page = `<!doctype html><html><head><meta charset="utf-8">
<link href="https://fonts.googleapis.com/css2?family=IBM+Plex+Sans:wght@400;500;600&family=IBM+Plex+Mono:wght@400&display=block" rel="stylesheet">
<style>
  body { margin: 0; background: #FFFFFF; font-family: 'IBM Plex Sans', sans-serif; }
  #out { display: inline-block; padding: 32px; background: #FFFFFF; }
</style>
<script src="https://cdn.jsdelivr.net/npm/mermaid@11.4.1/dist/mermaid.min.js"></script>
</head><body><div id="out"></div></body></html>`

const browser = await puppeteer.launch({ executablePath, headless: true })
const tab = await browser.newPage()
await tab.setViewport({ width: 2400, height: 1200, deviceScaleFactor: 2 })
await tab.setContent(page, { waitUntil: 'networkidle0' })
await tab.evaluate(async () => {
  await document.fonts.load('400 16px "IBM Plex Sans"')
  await document.fonts.load('600 16px "IBM Plex Sans"')
  // deno-lint-ignore no-explicit-any
  ;(window as any).mermaid.initialize({
    startOnLoad: false,
    theme: 'base',
    fontFamily: 'IBM Plex Sans, sans-serif',
    themeVariables: {
      fontFamily: 'IBM Plex Sans, sans-serif',
      fontSize: '15px',
      background: '#FFFFFF',
      primaryColor: '#E8EAFB',
      primaryBorderColor: '#3340B8',
      primaryTextColor: '#1D1D25',
      secondaryColor: '#F6F6F8',
      tertiaryColor: '#F6F6F8',
      lineColor: '#5E5E6B',
      textColor: '#1D1D25',
      noteBkgColor: '#F6F6F8',
      noteBorderColor: '#C3C3CB',
      actorBkg: '#E8EAFB',
      actorBorder: '#3340B8',
      signalColor: '#1D1D25',
      labelBoxBkgColor: '#E8EAFB',
      clusterBkg: '#F6F6F8',
      clusterBorder: '#C3C3CB',
      attributeBackgroundColorOdd: '#FFFFFF',
      attributeBackgroundColorEven: '#F6F6F8',
    },
    er: { useMaxWidth: false },
    flowchart: { useMaxWidth: false, htmlLabels: true },
    sequence: { useMaxWidth: false },
    state: { useMaxWidth: false },
    class: { useMaxWidth: false },
  })
})

await Deno.mkdir(path('images'), { recursive: true })
for (const name of names) {
  const source = await Deno.readTextFile(path(`sources/${name}.mmd`))
  await tab.evaluate(async (source) => {
    // deno-lint-ignore no-explicit-any
    const { svg } = await (window as any).mermaid.render('diagram', source)
    document.getElementById('out')!.innerHTML = svg
  }, source)
  const out = await tab.$('#out')
  await out!.screenshot({ path: path(`images/${name}.png`) as `${string}.png` })
  console.log(`images/${name}.png`)
}

await browser.close()
