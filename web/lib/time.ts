import { t, translate } from '/web/lib/language.ts'

const MINUTE = 60_000

/** Relative time, in the language of the interface */
export const ago = (at: number) => {
  const minutes = Math.round((Date.now() - at) / MINUTE)
  if (minutes < 1) return translate('à l’instant')
  if (minutes < 60) return t`il y a ${minutes} min`
  const hours = Math.round(minutes / 60)
  if (hours < 24) return t`il y a ${hours} h`
  return t`il y a ${Math.round(hours / 24)} j`
}
