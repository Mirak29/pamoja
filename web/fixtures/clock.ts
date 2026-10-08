// Fixture dates are relative to the page load, so "il y a 5 h" stays true
const HOUR = 3_600_000

export const hoursAgo = (hours: number) => Date.now() - hours * HOUR
export const daysAgo = (days: number) => hoursAgo(days * 24)
