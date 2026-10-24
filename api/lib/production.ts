import { APP_ENV } from '/api/lib/env.ts'

// Imported first by prod-server.ts, before the API loads. Without
// APP_ENV=prod the server would run with the session secret of dev and the
// simulated login (§5.3, §16): it refuses, unless asked to run the
// production build on a laptop (`deno task prod:local`).
if (APP_ENV !== 'prod' && !Deno.args.includes('--local')) {
  console.error(
    'Refusé : le serveur de production démarre avec APP_ENV=prod. Pour essayer le build sur ta machine : deno task prod:local',
  )
  Deno.exit(1)
}
