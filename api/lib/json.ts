// A JSON column of the database, read: the driver gives it as text or
// already decoded, and a broken value reads as nothing

/** The strings of a JSON list, or an empty list */
export const stringsOf = (value: unknown): string[] => {
  let list = value
  if (typeof value === 'string') {
    try {
      list = JSON.parse(value)
    } catch {
      return []
    }
  }
  return Array.isArray(list)
    ? list.filter((item): item is string => typeof item === 'string')
    : []
}
