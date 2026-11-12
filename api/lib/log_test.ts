import { assertEquals } from 'jsr:@std/assert@^1.0.13'
import { jsonLog } from '/api/lib/log.ts'

Deno.test('log: one JSON line per event in production (§17.4)', () => {
  const out: string[] = []
  const err: string[] = []
  const log = jsonLog({
    log: (line: string) => out.push(line),
    error: (line: string) => err.push(line),
  } as unknown as Console)

  log.info('server-start')
  log.error('backup-error', { error: new Error('disk full') })
  log('warn', 'slow', { ms: 1200 })

  assertEquals(out.length, 1)
  const start = JSON.parse(out[0])
  assertEquals([start.level, start.event], ['info', 'server-start'])
  assertEquals(typeof start.at, 'string')
  // Errors and warnings on the error output, the error itself readable
  assertEquals(err.length, 2)
  const failed = JSON.parse(err[0])
  assertEquals(failed.props.error.message, 'disk full')
  assertEquals(JSON.parse(err[1]).props, { ms: 1200 })
})
