import { logger } from '@01edu/api/log'

export const log = await logger({})

/** What a caught error says, whatever was thrown */
export const errorMessage = (err: unknown) =>
  err instanceof Error ? err.message : String(err)
