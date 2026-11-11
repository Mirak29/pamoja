import { language, translate } from '/web/lib/language.ts'

/**
 * Singular and plural forms follow the selected interface language.
 *
 * @example
 * plural(3, 'PR ouverte', 'PRs ouvertes') // 'PRs ouvertes'
 * plural(1, 'contributeur') // 'contributeur'
 */
export const plural = (count: number, one: string, many = `${one}s`) => {
  if (language.peek() === 'en') return translate(count === 1 ? one : many)
  return count > 1 ? many : one
}

/**
 * A count followed by its word.
 *
 * @example
 * counted(1, 'demande d’aide ouverte', 'demandes d’aide ouvertes')
 * // '1 demande d’aide ouverte'
 */
export const counted = (count: number, one: string, many = `${one}s`) =>
  `${count} ${plural(count, one, many)}`

/**
 * A counter of a badge: « 9+ » past 9, the badge stays small
 *
 * @example
 * badgeCount(12) // '9+'
 */
export const badgeCount = (count: number) => count > 9 ? '9+' : count
