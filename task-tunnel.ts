// deno task tunnel: GitHub cannot reach localhost, so a Cloudflare quick
// tunnel gives the dev server a public HTTPS address, and the app is told to
// send its webhooks there (§5.6). The address changes at each start: the
// script updates the webhook URL of the app itself, with its JWT. The app is
// shared: whoever starts a tunnel last receives the webhooks. Dev only.
import { appConfigured, appJwt } from '/api/github-app.ts'
import { APP_ENV, GITHUB_WEBHOOK_SECRET } from '/api/lib/env.ts'
import { replayMissed } from '/api/webhook-replay.ts'

const PORT = Deno.env.get('PORT') ?? '8800'

if (APP_ENV === 'prod') {
  console.error(
    'Le tunnel sert au dev : la production reçoit ses webhooks sur son domaine.',
  )
  Deno.exit(1)
}

// On the PATH, or where winget puts it on Windows: a terminal opened before
// the install does not see the new PATH yet
const candidates = [
  'cloudflared',
  'C:\\Program Files (x86)\\cloudflared\\cloudflared.exe',
  'C:\\Program Files\\cloudflared\\cloudflared.exe',
]
let cloudflared: string | undefined
for (const candidate of candidates) {
  try {
    await new Deno.Command(candidate, { args: ['--version'], stdout: 'null' })
      .output()
    cloudflared = candidate
    break
  } catch {
    // not there
  }
}
if (!cloudflared) {
  console.error(
    'cloudflared est introuvable. Installe-le une fois, puis relance :\n' +
      '  winget install --id Cloudflare.cloudflared\n' +
      '(macOS : brew install cloudflared · Linux : voir developers.cloudflare.com/cloudflared)',
  )
  Deno.exit(1)
}

// The tunnel is public: only the webhook goes through it, to the dev server
// on this machine. The rest of the app stays local (§16).
const WEBHOOK = '/api/github/webhook'
const skipped = new Set(['host', 'connection', 'content-length'])
const gate = Deno.serve(
  { hostname: '127.0.0.1', port: 0, onListen: () => {} },
  async (req) => {
    if (req.method !== 'POST' || new URL(req.url).pathname !== WEBHOOK) {
      return new Response('Not found', { status: 404 })
    }
    // The body goes as received: its signature is checked on the raw bytes
    const headers = new Headers()
    req.headers.forEach((value, key) =>
      skipped.has(key) || headers.set(key, value)
    )
    try {
      return await fetch(`http://127.0.0.1:${PORT}${WEBHOOK}`, {
        method: 'POST',
        headers,
        body: await req.arrayBuffer(),
      })
    } catch {
      // The dev server is not running: GitHub will show the failed delivery
      return new Response('Dev server unreachable', { status: 502 })
    }
  },
)

// A quick tunnel: no account, a new *.trycloudflare.com address each time
const tunnel = new Deno.Command(cloudflared, {
  args: [
    'tunnel',
    '--no-autoupdate',
    '--url',
    `http://127.0.0.1:${gate.addr.port}`,
  ],
  stdout: 'null',
  stderr: 'piped',
}).spawn()

// cloudflared prints its address on stderr; the rest of its output is still
// read, or its pipe would fill up and stall the tunnel
const reader = tunnel.stderr.pipeThrough(new TextDecoderStream()).getReader()
let address: string | undefined
let buffer = ''
while (!address) {
  const { value, done } = await reader.read()
  if (done) break
  buffer += value
  address = buffer.match(/https:\/\/[a-z0-9-]+\.trycloudflare\.com/)?.[0]
}
;(async () => {
  while (!(await reader.read()).done) {
    // drained
  }
})()

if (!address) {
  console.error('Le tunnel n’a pas démarré : regarde la sortie de cloudflared.')
  Deno.exit(1)
}

/** Answers within the time given, or not */
const answers = async (url: string, seconds: number) => {
  for (let i = 0; i < seconds; i++) {
    try {
      const res = await fetch(url, { signal: AbortSignal.timeout(2000) })
      await res.body?.cancel()
      if (res.status < 500) return true
    } catch {
      // not yet
    }
    await new Promise((resolve) => setTimeout(resolve, 1000))
  }
  return false
}

/**
 * The events sent while no tunnel was open never arrived, and GitHub does
 * not send them again by itself (§5.6): they are sent again now, once the
 * tunnel and the dev server both answer
 */
async function replay(address: string) {
  if (!await answers(`http://127.0.0.1:${PORT}/api/health`, 15)) {
    console.log(
      'Le serveur de dev ne répond pas : lance `deno task dev`, puis relance le tunnel pour recevoir les événements manqués.',
    )
    return
  }
  // A new quick tunnel takes a few seconds to be reachable
  if (!await answers(`${address}${WEBHOOK}`, 30)) {
    console.log(
      'Le tunnel ne répond pas encore : relance-le pour recevoir les événements manqués.',
    )
    return
  }
  try {
    const { sent, refused } = await replayMissed()
    console.log(
      sent || refused
        ? `${sent} événement(s) GitHub manqué(s) renvoyé(s)${
          refused ? `, ${refused} refusé(s) par GitHub` : ''
        }.`
        : 'Aucun événement GitHub manqué.',
    )
  } catch (err) {
    console.error(
      `Événements manqués non renvoyés : ${
        err instanceof Error ? err.message : String(err)
      }`,
    )
  }
}

const webhook = `${address}/api/github/webhook`
console.log(
  `Tunnel ouvert : ${address}${WEBHOOK} → http://127.0.0.1:${PORT}${WEBHOOK} (le reste de l’app reste local)`,
)

// Points the webhook of the app at the tunnel (PATCH /app/hook/config)
if (!appConfigured() || !GITHUB_WEBHOOK_SECRET) {
  console.log(
    'GITHUB_APP_ID, GITHUB_APP_PRIVATE_KEY ou GITHUB_WEBHOOK_SECRET manque dans .env-local :\n' +
      `colle toi-même cette URL dans le webhook de l’app : ${webhook}`,
  )
} else {
  const res = await fetch('https://api.github.com/app/hook/config', {
    method: 'PATCH',
    headers: {
      Accept: 'application/vnd.github+json',
      Authorization: `Bearer ${await appJwt()}`,
      'User-Agent': 'Pamoja',
      'X-GitHub-Api-Version': '2022-11-28',
    },
    body: JSON.stringify({
      url: webhook,
      content_type: 'json',
      secret: GITHUB_WEBHOOK_SECRET,
      insecure_ssl: '0',
    }),
  })
  if (res.ok) {
    await res.body?.cancel()
    console.log(`Webhook de l’app → ${webhook}`)
    console.log(
      'GitHub envoie maintenant les événements ici, tant que le tunnel reste ouvert.',
    )
    await replay(address)
  } else {
    console.error(
      `GitHub a refusé la mise à jour du webhook (${res.status}) : ${await res
        .text()}`,
    )
  }
}

console.log('Ctrl+C pour fermer le tunnel.')
const { code } = await tunnel.status
Deno.exit(code)
