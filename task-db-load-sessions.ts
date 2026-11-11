// Prepare distinct local sessions for the k6 load test. Requires the
// synthetic dev00000… accounts created by `deno task stress`.
import { db } from '@01edu/db'
import { Entry } from '/api/entries.ts'
import { b64url } from '/api/lib/encoding.ts'
import { APP_ENV } from '/api/lib/env.ts'
import { createSession } from '/api/session.ts'

const path = 'qa/load/sessions.json'

if (APP_ENV === 'prod') {
  throw new Error(
    'Refusé en production : les sessions sont réservées au test local.',
  )
}

if (Deno.args.includes('--clean')) {
  const sessions = JSON.parse(await Deno.readTextFile(path)) as {
    entryId: number
  }[]
  for (const session of sessions) Entry.archive(session.entryId)
  await Deno.remove(path)
  console.log(`Sessions de charge archivées : ${sessions.length}`)
} else {
  try {
    await Deno.stat(path)
    throw new Error(
      `${path} existe déjà. Nettoie-le avec deno task load:sessions:clean.`,
    )
  } catch (error) {
    if (!(error instanceof Deno.errors.NotFound)) throw error
  }

  const users = db.prepare(`
    SELECT userId, githubUsername
    FROM user
    WHERE githubUsername BETWEEN 'dev00000' AND 'dev00999'
    ORDER BY githubUsername
  `).all() as { userId: number; githubUsername: string }[]

  if (users.length !== 1000) {
    throw new Error(
      `Trouvé ${users.length} comptes de charge sur 1000. Lance deno task stress avant la préparation.`,
    )
  }

  const sessions: { login: string; cookie: string; entryId: number }[] = []
  for (const user of users) {
    const token = await createSession(user.userId, 'demo')
    const encodedId = token.split(':', 1)[0]
    const bytes = Uint8Array.fromBase64(encodedId, b64url).slice()
    const entryId = new Float64Array(bytes.buffer)[0]
    sessions.push({
      login: user.githubUsername,
      cookie: `session=${token}`,
      entryId,
    })
  }

  await Deno.writeTextFile(path, JSON.stringify(sessions))
  console.log(`Sessions prêtes : ${sessions.length} comptes dans ${path}`)
}
