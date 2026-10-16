// Every link that leaves Pamoja opens in a new tab, with no access to this
// page (noopener) and no referrer: a GitHub issue, a profile, a website, a
// video. One rule for the whole app, so a new link, or one in a Markdown
// content, cannot forget it. The login and the installation of the app go
// to GitHub in the same tab on purpose: they are not links.

const leaves = (anchor: HTMLAnchorElement) => {
  try {
    const url = new URL(anchor.href, location.href)
    return (url.protocol === 'https:' || url.protocol === 'http:') &&
      url.origin !== location.origin
  } catch {
    return false
  }
}

/** Marks an external link before the browser follows it */
const openExternal = (event: Event) => {
  const anchor = (event.target as Element | null)?.closest?.('a[href]')
  if (!(anchor instanceof HTMLAnchorElement) || anchor.target) return
  if (!leaves(anchor)) return
  anchor.target = '_blank'
  const rel = new Set(anchor.rel.split(/\s+/).filter(Boolean))
  rel.add('noopener').add('noreferrer')
  anchor.rel = [...rel].join(' ')
}

// Capture phase: before the router or a page handler sees the click; the
// keyboard (Enter on a link) sends a click too
addEventListener('click', openExternal, true)
// The middle and right buttons: the menu and a middle click read the target
addEventListener('auxclick', openExternal, true)
addEventListener('contextmenu', openExternal, true)
