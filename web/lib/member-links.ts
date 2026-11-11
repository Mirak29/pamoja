// Links a member wrote: in a post, a message, a description, a profile
// (§16). Only web addresses become links, and they open apart from Pamoja.
// web/lib/external-links.ts stays the net for every other external link.

/**
 * A link a member wrote, as an address the page may follow: http or https
 * only, normalized; anything else (`javascript:`, `data:`, a typo) is none
 * and stays text
 */
export const webHref = (link: string) => {
  try {
    const url = new URL(link)
    return url.protocol === 'https:' || url.protocol === 'http:'
      ? url.href
      : undefined
  } catch {
    return undefined
  }
}

/**
 * The attributes of a link a member wrote: a new tab with no access to this
 * page, no referrer, and no ranking given to where it leads
 */
export const memberLink = {
  target: '_blank',
  rel: 'noopener noreferrer nofollow ugc',
} as const
