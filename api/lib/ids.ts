// The public id of something private, in its address (PAM-125): random, so
// it reveals nothing (neither how many exist nor in what order) and cannot
// be guessed from another one, unlike its number in the database. 12
// characters of 62: about 71 bits.
const ALPHABET =
  '0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz'

export const publicId = () =>
  Array.from(
    crypto.getRandomValues(new Uint8Array(12)),
    (byte) => ALPHABET[byte % ALPHABET.length],
  ).join('')

/** The shape of a public id: refused before any query when it does not fit */
export const isPublicId = (text: string) => /^[0-9A-Za-z]{12}$/.test(text)
