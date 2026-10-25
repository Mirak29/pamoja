// deno task stress: adds data at volume to the dev database, after the seed,
// to test the screens with thousands of rows (api/stress.ts). Never in
// production; `deno task seed` gives the database back.
import { APP_ENV } from '/api/lib/env.ts'

if (APP_ENV === 'prod') {
  console.error('Refusé en production : le test de charge remplit la base.')
  Deno.exit(1)
}

// After the check: opening the database runs the migrations
await import('/api/stress.ts')
