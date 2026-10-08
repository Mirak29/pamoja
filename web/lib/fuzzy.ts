// Typo tolerant matching ("postgress" finds PostgreSQL), until the search
// goes through GET/api/search and Meilisearch (PAM-507)
export const normalize = (text: string) =>
  text.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '')

const distance = (a: string, b: string) => {
  let previous = Array.from({ length: b.length + 1 }, (_, j) => j)
  for (let i = 1; i <= a.length; i++) {
    const current = [i]
    for (let j = 1; j <= b.length; j++) {
      current[j] = Math.min(
        previous[j] + 1,
        current[j - 1] + 1,
        previous[j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1),
      )
    }
    previous = current
  }
  return previous[b.length]
}

export const fuzzyMatch = (query: string, text: string) => {
  const q = normalize(query).trim()
  if (!q) return true
  const t = normalize(text)
  if (t.includes(q)) return true
  if (q.length < 4) return false
  const tolerance = q.length > 6 ? 2 : 1
  return t.split(/[^a-z0-9#]+/).some((word) =>
    word &&
    ((distance(q, word.slice(0, q.length)) <= tolerance &&
      word.length >= q.length - 1) ||
      distance(q, word) <= tolerance)
  )
}
