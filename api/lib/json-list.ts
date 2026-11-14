// A JSON list of the database: the driver gives it as text or already read
export const listOf = (value: unknown): unknown[] => {
  if (Array.isArray(value)) return value
  if (typeof value !== 'string') return []
  try {
    const list = JSON.parse(value)
    return Array.isArray(list) ? list : []
  } catch {
    return []
  }
}
