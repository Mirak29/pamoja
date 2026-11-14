// A JSON column of the database, read: the driver gives it as text or
// already decoded, and a broken value reads as nothing

/** The items of a JSON list, or an empty list */
export const listOf = (value: unknown): unknown[] => {
  let list = value
  if (typeof value === 'string') {
    try {
      list = JSON.parse(value)
    } catch {
      return []
    }
  }
  return Array.isArray(list) ? list : []
}

/** The strings of a JSON list, or an empty list */
export const stringsOf = (value: unknown): string[] =>
  listOf(value).filter((item): item is string => typeof item === 'string')

/** The numbers of a JSON list, or an empty list */
export const numbersOf = (value: unknown): number[] =>
  listOf(value).filter((item): item is number => typeof item === 'number')
