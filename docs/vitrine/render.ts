// Renders scene.html frame by frame (docs/vitrine/README.md): the page draws
// any moment with renderAt(t), so the video never depends on the speed of
// the machine. Needs ffmpeg on the PATH, and Chrome or Edge.
//
//   deno run -A docs/vitrine/render.ts --sheet     one frame a second, tiled
//   deno run -A docs/vitrine/render.ts --draft     half size, to review
//   deno run -A docs/vitrine/render.ts             pamoja-apercu.mp4 and .gif
import puppeteer from 'npm:puppeteer-core@23.11.1'

const here = new URL('.', import.meta.url)
const path = (name: string) =>
  decodeURIComponent(new URL(name, here).pathname).replace(/^\/(\w:)/, '$1')
const sheet = Deno.args.includes('--sheet')
const draft = Deno.args.includes('--draft')
const scale = draft || sheet ? 0.5 : 1

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

const browser = await puppeteer.launch({
  executablePath,
  headless: true,
  args: ['--allow-file-access-from-files', '--force-color-profile=srgb'],
})
const page = await browser.newPage()
await page.setViewport({ width: 1920, height: 1080, deviceScaleFactor: scale })
await page.goto(new URL('scene.html?render', here).href, { waitUntil: 'load' })
await page.evaluate(() => (window as unknown as { ready: Promise<void> }).ready)
const { duration, fps } = await page.evaluate(() => {
  const w = window as unknown as { DURATION: number; FPS: number }
  return { duration: w.DURATION, fps: w.FPS }
})

const frameAt = async (t: number) => {
  await page.evaluate(
    (t) => (window as unknown as { renderAt(t: number): void }).renderAt(t),
    t,
  )
  return await page.screenshot({ type: 'png' })
}

const ffmpeg = (args: string[]) =>
  new Deno.Command('ffmpeg', { args: ['-v', 'error', '-y', ...args], stdin: 'piped' })
    .spawn()

if (sheet) {
  // One frame a second, tiled into one image to look at before rendering
  const count = Math.ceil(duration)
  const tile = ffmpeg([
    '-f', 'image2pipe', '-framerate', '1', '-i', '-',
    '-vf', `scale=480:-1,tile=5x${Math.ceil(count / 5)}`,
    '-frames:v', '1', path('sheet.png'),
  ])
  const writer = tile.stdin.getWriter()
  for (let s = 0; s < count; s++) await writer.write(await frameAt(s + 0.5))
  await writer.close()
  await tile.status
  console.log('sheet.png')
} else {
  const video = path(draft ? 'draft.mp4' : 'pamoja-apercu.mp4')
  const encode = ffmpeg([
    '-f', 'image2pipe', '-framerate', String(fps), '-i', '-',
    '-c:v', 'libx264', '-pix_fmt', 'yuv420p', '-crf', draft ? '30' : '27',
    '-preset', 'slow', '-movflags', '+faststart', video,
  ])
  const writer = encode.stdin.getWriter()
  const frames = Math.round(duration * fps)
  for (let i = 0; i < frames; i++) {
    await writer.write(await frameAt(i / fps))
    if (i % fps === 0) console.log(`${(i / fps).toFixed(0)} s / ${duration} s`)
  }
  await writer.close()
  if (!(await encode.status).success) throw new Error('ffmpeg a échoué')
  console.log(video)

  if (!draft) {
    // The README shows a GIF (GitHub plays no video from the repository
    // inline): 560 px, 6 frames a second, one palette for the whole clip,
    // under 10 MB so the README opens fast
    const gif = new Deno.Command('ffmpeg', {
      args: [
        '-v', 'error', '-y', '-i', video,
        '-vf',
        'fps=6,scale=560:-1:flags=lanczos,split[a][b];[a]palettegen=max_colors=48:stats_mode=diff[p];[b][p]paletteuse=dither=bayer:bayer_scale=5:diff_mode=rectangle',
        path('pamoja-apercu.gif'),
      ],
    })
    if (!(await gif.output()).success) throw new Error('GIF : ffmpeg a échoué')
    console.log(path('pamoja-apercu.gif'))
  }
}

await browser.close()
