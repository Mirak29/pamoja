// deno task tunnel: GitHub cannot reach localhost, so a Cloudflare quick
// tunnel gives the dev server a public HTTPS address, and the app is told to
// send its webhooks there (§5.6). The address changes at each start: the
// script updates the webhook URL of the app itself, with its JWT. The app is
// shared: whoever starts a tunnel last receives the webhooks. Dev only.
import { appConfigured, appJwt } from '/api/github-app.ts'
import { APP_ENV, GITHUB_WEBHOOK_SECRET } from '/api/lib/env.ts'

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

// A quick tunnel: no account, a new *.trycloudflare.com address each time
const tunnel = new Deno.Command(cloudflared, {
  args: ['tunnel', '--no-autoupdate', '--url', `http://127.0.0.1:${PORT}`],
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

const webhook = `${address}/api/github/webhook`
console.log(`Tunnel ouvert : ${address} → http://127.0.0.1:${PORT}`)

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
