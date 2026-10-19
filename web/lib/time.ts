import { language } from '/web/lib/language.ts'

const MINUTE = 60_000

/** Relative time, localized to the selected interface language. */
export const ago = (at: number) => {
  const minutes = Math.round((Date.now() - at) / MINUTE)
  const english = language.peek() === 'en'
  if (minutes < 1) return english ? 'just now' : 'à l’instant'
  if (minutes < 60) {
    return english ? `${minutes} min ago` : `il y a ${minutes} min`
  }
  const hours = Math.round(minutes / 60)
  if (hours < 24) return english ? `${hours} h ago` : `il y a ${hours} h`
  const days = Math.round(hours / 24)
  return english ? `${days} d ago` : `il y a ${days} j`
}
