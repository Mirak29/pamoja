// Fractional ranking for the board (§6.7, §14): a card's position is a string
// compared lexicographically, so inserting one between two others never
// renumbers the column, and two people moving cards at the same time keep
// both (no shared counter to lose).

const DIGITS = '0123456789abcdefghijklmnopqrstuvwxyz'

/**
 * A rank strictly between `a` and `b` (lexicographically, with `a < b`). An
 * empty `a` is the start of the column, an empty `b` its end, so `rankBetween()`
 * gives a first rank and `rankBetween(last)` appends after the last card.
 */
export const rankBetween = (a = '', b = ''): string => {
  let result = ''
  let i = 0
  while (true) {
    const lo = i < a.length ? DIGITS.indexOf(a[i]) : -1
    const hi = i < b.length ? DIGITS.indexOf(b[i]) : DIGITS.length
    if (lo + 1 < hi) {
      return result + DIGITS[Math.floor((lo + hi) / 2)]
    }
    // No room at this position: keep a's digit (or the lowest) and go deeper
    result += i < a.length ? a[i] : DIGITS[0]
    i++
  }
}
