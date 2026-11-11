import { signal } from '@preact/signals'
import { api, type ApiOutput } from '/web/lib/api.ts'

// The deterministic Pulse counted by the server (PAM-306, §6.4), per
// project slug; the demo projects keep their fixtures

export type LivePulse = ApiOutput['GET/api/project/pulse']
type PulseQuery = Parameters<typeof api['GET/api/project/pulse']['fetch']>[0]

export const livePulses = signal<Record<string, LivePulse>>({})

/** The last 7 days of a project, read again each time its Pulse opens */
export const loadPulse = (project: string) =>
  // The client writes null as « null » in the query: only the slug is sent
  api['GET/api/project/pulse'].fetch({ project } as PulseQuery).then(
    (pulse) => {
      livePulses.value = { ...livePulses.peek(), [project]: pulse }
    },
    () => {},
  )
