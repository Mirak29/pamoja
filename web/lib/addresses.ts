// The French addresses of the first versions (PAM-125), shared in messages
// and saved in bookmarks, keep working: each one is read here into its
// English address. A profile stays /@login; a conversation is found by its
// public id, which an old link does not have (/messages?avec= is resolved by
// the messages page).

const sections: Record<string, string> = {
  aide: 'help',
  projet: 'project',
  projets: 'projects',
  communaute: 'community',
  communautes: 'communities',
  explorer: 'explore',
  recherche: 'search',
  reglages: 'settings',
  enregistres: 'saved',
  connexion: 'login',
}

const projectTabs: Record<string, string> = {
  canaux: 'channels',
  equipe: 'team',
  activite: 'activity',
  reglages: 'settings',
}

const channels: Record<string, string> = {
  suivi: 'updates',
  aide: 'help',
  annonces: 'announcements',
}

const communityTabs: Record<string, string> = {
  membres: 'members',
  projets: 'projects',
  aide: 'help',
  apropos: 'about',
}

const exploreTabs: Record<string, string> = {
  projets: 'projects',
  travail: 'work',
}

const params: Record<string, string> = {
  fil: 'feed',
  categorie: 'category',
  filtre: 'filter',
  etape: 'step',
  retour: 'next',
  vue: 'view',
  // The filters of Explore
  pays: 'country',
  communaute: 'community',
  intention: 'intent',
  disponible: 'available',
  techno: 'tech',
  stade: 'stage',
  activite: 'activity',
  contributeurs: 'contributors',
  debutants: 'beginners',
}

const values: Record<string, Record<string, string>> = {
  feed: {
    'pour-toi': 'for-you',
    abonnements: 'following',
    communautes: 'communities',
  },
  category: {
    toutes: 'all',
    'pour-toi': 'for-you',
    projets: 'projects',
    communautes: 'communities',
    systeme: 'system',
  },
  filter: { tout: 'all', equipe: 'team', aide: 'help' },
  view: { publique: 'public' },
  tab: {
    'pour-moi': 'for-me',
    'mes-demandes': 'mine',
    acceptees: 'accepted',
    projets: 'projects',
  },
  dialog: {
    partage: 'share',
    reseau: 'network',
    preuves: 'proofs',
    'preuves-aides': 'proofs-helped',
  },
}

/** A path in English, `/help/new` for `/aide/nouvelle`; others as they are */
export const englishPath = (path: string) => {
  const segments = path.replace(/^\//, '').split('/')
  if (segments[0] === 'profil' && segments[1] === 'modifier') {
    return `/profile/edit${segments.length > 2 ? '/' : ''}${
      segments.slice(2).join('/')
    }`
  }
  const [first] = segments
  segments[0] = sections[first] ?? first
  if (segments[0] === 'help' && segments[1] === 'nouvelle') segments[1] = 'new'
  if (segments[0] === 'project' && segments[2]) {
    segments[2] = projectTabs[segments[2]] ?? segments[2]
    if (segments[2] === 'channels' && segments[3]) {
      segments[3] = channels[segments[3]] ?? segments[3]
    }
  }
  if (segments[0] === 'community' && segments[2]) {
    segments[2] = communityTabs[segments[2]] ?? segments[2]
  }
  if (segments[0] === 'explore' && segments[1]) {
    segments[1] = exploreTabs[segments[1]] ?? segments[1]
  }
  return `/${segments.join('/')}`
}

const englishValue = (key: string, value: string): string => {
  if (key === 'next') return englishAddress(value) ?? value
  if (key === 'dialog' && value.startsWith('preuves-')) {
    return values.dialog[value] ?? `proofs-${value.slice('preuves-'.length)}`
  }
  return values[key]?.[value] ?? value
}

/**
 * The English address of an old one, path and query, or undefined when it
 * is English already
 */
export const englishAddress = (address: string): string | undefined => {
  const [path, query = ''] = address.split('?')
  const search = new URLSearchParams(query)
  const english = new URLSearchParams()
  for (const [key, value] of search) {
    const name = params[key] ?? key
    english.append(name, englishValue(name, value))
  }
  const next = `${englishPath(path)}${english.size ? `?${english}` : ''}`
  const before = `${path.startsWith('/') ? path : `/${path}`}${
    search.size ? `?${search}` : ''
  }`
  return next === before ? undefined : next
}
