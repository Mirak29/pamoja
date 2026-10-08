const MINUTE = 60_000

/** Relative time in French, as shown everywhere in the prototype */
export const ago = (at: number) => {
  const minutes = Math.round((Date.now() - at) / MINUTE)
  if (minutes < 1) return 'à l’instant'
  if (minutes < 60) return `il y a ${minutes} min`
  const hours = Math.round(minutes / 60)
  if (hours < 24) return `il y a ${hours} h`
  return `il y a ${Math.round(hours / 24)} j`
}
