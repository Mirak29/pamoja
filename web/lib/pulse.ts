import { signal } from '@preact/signals'
import { api, type ApiOutput } from '/web/lib/api.ts'

// The deterministic Pulse counted by the server (PAM-306, §6.4), per
// project slug; the demo projects keep their fixtures

export type LivePulse = ApiOutput['GET/api/project/pulse']
type PulseQuery = Parameters<typeof api['GET/api/project/pulse']['fetch']>[0]

export const livePulses = signal<Record<string, LivePulse>>({})

/** The Pulses read again: a new AI summary is ready (PULSE_READY, §6.4) */
export const reloadPulses = () =>
  Object.keys(livePulses.peek()).forEach(loadPulse)

/** The last 7 days of a project, read again each time its Pulse opens */
export const loadPulse = (project: string) =>
  // The client writes null as « null » in the query: only the slug is sent
  api['GET/api/project/pulse'].fetch({ project } as PulseQuery).then(
    (pulse) => {
      livePulses.value = { ...livePulses.peek(), [project]: pulse }
    },
    () => {},
  )

export type LiveDna = ApiOutput['GET/api/project/dna']

/** DNA, Health and Story computed by the server (PAM-308), per slug */
export const liveDnas = signal<Record<string, LiveDna>>({})

/** Reads DNA, Health and Story of a project, each time its Pulse opens */
export const loadDna = (slug: string) =>
  api['GET/api/project/dna'].fetch({ slug }).then(
    (dna) => {
      liveDnas.value = { ...liveDnas.peek(), [slug]: dna }
    },
    () => {},
  )
