// Captures the screens of the preview video (docs/vitrine/README.md) from a
// running Pamoja with the demo data and the simulated sign-in: full pages, in
// the light theme, at 1440 px wide.
//
//   deno run -A docs/vitrine/capture.ts [http://localhost:8000]
//
// Chrome or Edge must be installed; CHROME=<path> picks another one.
import puppeteer from 'npm:puppeteer-core@23.11.1'

const base = (Deno.args[0] ?? 'http://localhost:8000').replace(/\/$/, '')
const out = new URL('./screens/', import.meta.url).pathname.replace(
  /^\/(\w:)/,
  '$1',
)
await Deno.mkdir(out, { recursive: true })

const candidates = [
  Deno.env.get('CHROME'),
  'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
  'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe',
  '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
  '/usr/bin/google-chrome',
  '/usr/bin/chromium',
].filter(Boolean) as string[]
const executablePath = candidates.find((path) => {
  try {
    return Deno.statSync(path).isFile
  } catch {
    return false
  }
})
if (!executablePath) throw new Error('Chrome introuvable : CHROME=<chemin>')

/** The screens, in the order of the video: name, path, signed in or not */
const screens: [string, string, boolean][] = [
  ['landing', '/', false],
  ['feed', '/', true],
  ['project', '/project/openpay-africa', true],
  ['pulse', '/project/openpay-africa/pulse', true],
  ['board', '/project/openpay-africa/board', true],
  ['roadmap', '/project/openpay-africa/roadmap', true],
  ['help', '/help/h1', true],
  ['profile', '/@moussa', true],
  ['explore', '/explore', true],
]

const browser = await puppeteer.launch({ executablePath, headless: true })
const page = await browser.newPage()
await page.setViewport({ width: 1440, height: 900, deviceScaleFactor: 1.5 })
await page.emulateMediaFeatures([
  { name: 'prefers-color-scheme', value: 'light' },
  { name: 'prefers-reduced-motion', value: 'reduce' },
])

const settle = async () => {
  await page.evaluate(() => document.fonts.ready)
  await new Promise((done) => setTimeout(done, 2500))
}

const shoot = async (name: string, path: string) => {
  await page.goto(base + path, { waitUntil: 'load' })
  await settle()
  await page.screenshot({ path: `${out}${name}.png`, fullPage: true })
  console.log(`${name}.png  ${path}`)
}

// Signed out first, then the simulated sign-in (Abdou)
for (const [name, path] of screens.filter(([, , session]) => !session)) {
  await shoot(name, path)
}
await page.goto(base + '/login', { waitUntil: 'load' })
await page.evaluate(() => {
  const button = [...document.querySelectorAll('button')]
    .find((b) => b.textContent?.includes('GitHub'))
  button?.click()
})
await page.waitForFunction(() => !location.pathname.startsWith('/login'))
for (const [name, path] of screens.filter(([, , session]) => session)) {
  await shoot(name, path)
}

// The Share Card of the profile, as the server renders it
const card = await page.evaluate(() =>
  document.querySelector<HTMLMetaElement>('meta[property="og:image"]')
    ?.content
)
await page.goto(base + '/@moussa', { waitUntil: 'load' })
const image = await page.evaluate(() =>
  document.querySelector<HTMLMetaElement>('meta[property="og:image"]')
    ?.content
)
const source = image ?? card
if (source) {
  const response = await fetch(new URL(source, base))
  if (response.ok) {
    await Deno.writeFile(
      `${out}share-card.png`,
      new Uint8Array(await response.arrayBuffer()),
    )
    console.log('share-card.png')
  }
}

await browser.close()
