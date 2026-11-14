// deno task seed: rebuilds the database with the demo data, from zero, so it
// can be replayed before each rehearsal (§14, §18.1). The server must be
// stopped: it keeps the database file open.
import { APP_ENV } from '/api/lib/env.ts'

const path = Deno.env.get('DATABASE_PATH') ?? ':memory:'

if (APP_ENV === 'prod' && !Deno.args.includes('--prod')) {
  console.error(
    'Refusé en production : le seed efface la base. Relance avec --prod pour confirmer.',
  )
  Deno.exit(1)
}

if (path !== ':memory:') {
  for (const file of [path, `${path}-wal`, `${path}-shm`]) {
    try {
      await Deno.remove(file)
    } catch (err) {
      if (err instanceof Deno.errors.NotFound) continue
      console.error(
        `Impossible d’effacer ${file} : arrête le serveur de dev, qui garde la base ouverte.`,
      )
      Deno.exit(1)
    }
  }
}

// After the reset: opening the database creates the tables
const { parseGithubIds, seed } = await import('/api/seed.ts')
const counts = seed(parseGithubIds(Deno.env.get('SEED_GITHUB_IDS')))
console.log(
  `Seed terminé : ${counts.developers} développeurs, ${counts.communities} communautés, ${counts.projects} projets, ${counts.reviews} reviews (source = demo).`,
)
