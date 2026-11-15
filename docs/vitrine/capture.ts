// Captures the screens of the preview video (docs/vitrine/README.md) from a
// running Pamoja with the demo data and the simulated sign-in: full pages (or
// the window, for a dialog), in the light theme, at 1440 px wide.
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

type Screen = {
  name: string
  path: string
  /** Signed out: the landing */
  out?: boolean
  /** Only what the window shows (a dialog, a panel), not the whole page */
  view?: boolean
  /** Starts at this element: the tabs of a project, under its header */
  from?: string
  /** The Assistant panel open */
  assistant?: boolean
  /** Opens the first item of the page that holds this text */
  open?: string
}

/** The screens, in the order of the video */
const tabs = '[aria-label="Sections du projet"]'
const project = '/project/openpay-africa'
const screens: Screen[] = [
  { name: 'landing', path: '/', out: true },
  { name: 'import', path: '/projects?dialog=new-project', view: true },
  { name: 'project', path: project },
  { name: 'pulse', path: `${project}/pulse`, from: tabs },
  { name: 'board', path: `${project}/board`, from: tabs },
  { name: 'roadmap', path: `${project}/roadmap`, from: tabs },
  { name: 'prs', path: `${project}/prs`, from: tabs },
  { name: 'team', path: `${project}/team`, from: tabs },
  { name: 'channels', path: `${project}/channels`, from: tabs },
  { name: 'help', path: '/help/h1' },
  { name: 'profile', path: '/@moussa' },
  { name: 'feed', path: '/' },
  { name: 'explore', path: '/explore' },
  { name: 'communities', path: '/communities' },
  { name: 'messages', path: '/messages', open: 'Moussa Diallo', view: true },
  { name: 'notifications', path: '/notifications' },
  { name: 'assistant', path: '/', assistant: true, view: true },
  { name: 'search', path: '/search?q=go' },
  {
    name: 'report',
    path: '/?dialog=report&report=post%3Apo3',
    view: true,
  },
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

const shoot = async (screen: Screen) => {
  // The Assistant panel is remembered by the browser: open only on its shot
  await page.evaluate((open) => {
    try {
      localStorage.setItem('pamoja-assistant-open', open ? '1' : '0')
    } catch { /* a page without storage */ }
  }, !!screen.assistant)
  await page.goto(base + screen.path, { waitUntil: 'load' })
  await settle()
  if (screen.open) {
    await page.evaluate((text) => {
      const item = [...document.querySelectorAll('main a, main button')]
        .find((el) => el.textContent?.includes(text)) as HTMLElement | undefined
      item?.click()
    }, screen.open)
    await settle()
  }
  const file = `${out}${screen.name}.png` as `${string}.png`
  if (screen.view) {
    await page.screenshot({ path: file })
  } else if (screen.from) {
    // The whole page from that element down
    const top = await page.evaluate((selector) => {
      const el = document.querySelector(selector)
      return el ? el.getBoundingClientRect().top + scrollY - 16 : 0
    }, screen.from)
    const height = await page.evaluate(() =>
      document.documentElement.scrollHeight
    )
    await page.screenshot({
      path: file,
      captureBeyondViewport: true,
      clip: { x: 0, y: top, width: 1440, height: height - top },
    })
  } else {
    await page.screenshot({ path: file, fullPage: true })
  }
  console.log(`${screen.name}.png  ${screen.path}`)
}

// Signed out first, then the simulated sign-in (Abdou)
for (const screen of screens.filter((s) => s.out)) await shoot(screen)
await page.goto(base + '/login', { waitUntil: 'load' })
await page.evaluate(() => {
  const button = [...document.querySelectorAll('button')]
    .find((b) => b.textContent?.includes('GitHub'))
  button?.click()
})
await page.waitForFunction(() => !location.pathname.startsWith('/login'))
for (const screen of screens.filter((s) => !s.out)) await shoot(screen)

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
