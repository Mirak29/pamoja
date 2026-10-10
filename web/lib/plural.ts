/**
 * The word for a count, in French: 0 and 1 take the singular.
 *
 * @example
 * plural(3, 'PR ouverte', 'PRs ouvertes') // 'PRs ouvertes'
 * plural(1, 'contributeur') // 'contributeur'
 */
export const plural = (count: number, one: string, many = `${one}s`) =>
  count > 1 ? many : one

/**
 * A count followed by its word.
 *
 * @example
 * counted(1, 'demande d’aide ouverte', 'demandes d’aide ouvertes')
 * // '1 demande d’aide ouverte'
 */
export const counted = (count: number, one: string, many = `${one}s`) =>
  `${count} ${plural(count, one, many)}`
