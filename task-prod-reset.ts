// deno task prod:reset: the production back on a clean database (§18.1),
// from the team's machine, through SSH (alias `pamoja`):
//
//   1. the app stops, so the database is whole on the disk;
//   2. the database and the media come to ~/pamoja-backups, in one archive,
//      kept only if it holds a whole SQLite file;
//   3. the database and the media are erased, then the demo is seeded again
//      (--vide: nothing is seeded, the app starts on empty tables);
//   4. the app starts again and must answer.
//
//   deno task prod:reset           the demo, fresh
//   deno task prod:reset --vide    an empty database
//   deno task prod:reset --yes     no question asked (a script)
//
// PAMOJA_HOST (`pamoja`), PAMOJA_DIR (/root/pamoja), PAMOJA_BACKUPS
// (~/pamoja-backups) and SSH (the ssh program; on Windows the one of the
// system, which uses the key loaded in its agent) change the defaults.
// Restoring an archive: docs/deploiement.md.

const HOST = Deno.env.get('PAMOJA_HOST') ?? 'pamoja'
const DIR = Deno.env.get('PAMOJA_DIR') ?? '/root/pamoja'
const HOME = Deno.env.get('HOME') ?? Deno.env.get('USERPROFILE') ?? '.'
const BACKUPS = Deno.env.get('PAMOJA_BACKUPS') ?? `${HOME}/pamoja-backups`
const SSH = Deno.env.get('SSH') ??
  (Deno.build.os === 'windows' ? 'C:/Windows/System32/OpenSSH/ssh.exe' : 'ssh')

const compose = (command: string) => `cd ${DIR} && docker compose ${command}`
/** A shell in a container of the image, on the volume, the server stopped */
const inVolume = (script: string) =>
  compose(`run --rm --no-deps -T --entrypoint sh app -c '${script}'`)

/** A command on the machine; its output, or a failure that says it */
export const remote = async (command: string) => {
  const { code, stdout, stderr } = await new Deno.Command(SSH, {
    args: ['-o', 'BatchMode=yes', HOST, command],
    stdout: 'piped',
    stderr: 'piped',
  }).output()
  const out = new TextDecoder().decode(stdout).trim()
  if (code) {
    const err = new TextDecoder().decode(stderr).trim()
    throw Error(`${command}\n${err || out}`)
  }
  return out
}

/**
 * True when the archive starts with the database, whole: tar puts the name
 * of its first file at the start of a 512 bytes header, then its content,
 * which a SQLite file starts with its magic
 */
export const holdsDatabase = (head: Uint8Array) => {
  const text = (from: number, to: number) =>
    new TextDecoder().decode(head.subarray(from, to))
  const name = text(0, 100).split('\0')[0]
  const size = parseInt(text(124, 136).replace(/\0/g, '').trim(), 8)
  return name === 'pamoja.db' && size > 0 &&
    text(512, 527) === 'SQLite format 3'
}

/** The database (its -wal and -shm too) and the media, to this machine */
export const backup = async () => {
  await Deno.mkdir(BACKUPS, { recursive: true })
  const at = new Date().toISOString().slice(0, 16).replace(':', 'h')
  const path = `${BACKUPS}/pamoja-avant-reset-${at}.tar`
  const part = `${path}.part`
  const files = 'pamoja.db $(ls pamoja.db-wal pamoja.db-shm 2>/dev/null) media'
  const child = new Deno.Command(SSH, {
    args: [
      '-o',
      'BatchMode=yes',
      HOST,
      inVolume(`cd /data && tar cf - ${files}`),
    ],
    stdout: 'piped',
    stderr: 'piped',
  }).spawn()
  const file = await Deno.open(part, { write: true, create: true })
  const [status, , stderr] = await Promise.all([
    child.status,
    child.stdout.pipeTo(file.writable),
    new Response(child.stderr).text(),
  ])
  try {
    const head = new Uint8Array(1024)
    const read = await Deno.open(part)
    const n = await read.read(head)
    read.close()
    if (!status.success || !n || !holdsDatabase(head)) {
      throw Error(
        `La sauvegarde n’est pas une base entière : rien n’est effacé.\n${stderr.trim()}`,
      )
    }
    await Deno.rename(part, path)
    return path
  } finally {
    await Deno.remove(part).catch(() => {})
  }
}

/** Waits for the app to say it is healthy, then for its page */
const answers = async () => {
  for (let i = 0; i < 30; i++) {
    const status = await remote(compose(`ps app --format '{{.Status}}'`))
    if (status.includes('(healthy)')) {
      const code = await remote(
        `curl -s -o /dev/null -w '%{http_code}' http://127.0.0.1:8000/`,
      )
      if (code === '200') return
    }
    await new Promise((done) => setTimeout(done, 2000))
  }
  throw Error('L’app ne répond pas : `docker compose logs app` sur la VM.')
}

const run = async (empty: boolean) => {
  console.log(`Arrêt de l’app sur ${HOST}…`)
  await remote(compose('stop app'))
  try {
    console.log('Sauvegarde de la base et des médias…')
    const path = await backup()
    console.log(`  → ${path}`)

    console.log(empty ? 'Effacement de la base…' : 'Remise de la démo…')
    await remote(inVolume(
      'rm -rf /data/media/* /data/pamoja.db /data/pamoja.db-wal /data/pamoja.db-shm',
    ))
    if (!empty) {
      const seeded = await remote(
        compose('run --rm --no-deps -T app seed --prod'),
      )
      console.log(`  ${seeded.split('\n').pop()}`)
    }
  } finally {
    // Whatever failed, the app runs again: on its database when nothing was
    // erased yet, else on what is there now (the archive restores it)
    console.log('Redémarrage de l’app…')
    await remote(compose('start app'))
  }
  await answers()
  console.log(
    `Prod repartie sur ${
      empty ? 'une base vide' : 'une démo fraîche'
    }. Chacun se reconnecte avec GitHub.`,
  )
}

if (import.meta.main) {
  const empty = Deno.args.includes('--vide')
  const sure = Deno.args.includes('--yes') ||
    prompt(
        `Efface la base et les médias de la prod (${HOST}), après une sauvegarde, puis ${
          empty ? 'repart sur une base vide' : 'recharge la démo'
        }.\nTape ${HOST} pour confirmer :`,
      ) === HOST
  if (!sure) {
    console.log('Rien n’a été fait.')
    Deno.exit(1)
  }
  try {
    await run(empty)
  } catch (err) {
    console.error(err instanceof Error ? err.message : err)
    Deno.exit(1)
  }
}
