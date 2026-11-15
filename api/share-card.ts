import { sql } from '@01edu/db'
import { notSuspended } from '/api/revoked.ts'
import { numbersOf } from '/api/lib/json.ts'
import satori from 'satori'
import { initWasm, Resvg } from '@resvg/resvg-wasm'
import { MEDIA_DIR } from '/api/media.ts'
import { proofsOf } from '/api/proofs.ts'
import { badgesOf } from '/api/badges.ts'
import { countryName } from '/api/vocabulary.ts'
import { skillNamesOf, skillsOf } from '/api/skills.ts'

// The Share Card (§17.2): a PNG of 1200 × 630, the og:image of a profile or
// a project. A tree of elements becomes an SVG with satori, then a PNG with
// resvg. The fonts are in the binary (api/assets/fonts). Each card is kept
// on disk under the hash of what it shows: the same data, the same file;
// changed data, a new one.

export const CARD_WIDTH = 1200
export const CARD_HEIGHT = 630

// The colours of a card: those of the profile themes and accents of the
// app (web/assets/styles/theme.css, §9.2), so a card looks like its profile
type Palette = {
  page: string
  slab: string
  line: string
  ink: string
  muted: string
  indigo: string
  indigoSoft: string
  onIndigo: string
  verified: string
  verifiedSoft: string
  dark: boolean
}

const LIGHT: Palette = {
  page: '#f6f6f8',
  slab: '#ffffff',
  line: '#e0e0e6',
  ink: '#1d1d25',
  muted: '#5d5d6b',
  indigo: '#3340b8',
  indigoSoft: '#e8eafb',
  onIndigo: '#ffffff',
  verified: '#1e7a4e',
  verifiedSoft: '#e3f3ea',
  dark: false,
}

export const CARD_THEMES = ['minimal', 'clair', 'sombre', 'terminal', 'cyber']
export const CARD_ACCENTS = ['indigo', 'vert', 'ambre', 'corail']

const themes: Record<string, Palette> = {
  minimal: LIGHT,
  clair: LIGHT,
  sombre: {
    page: '#0e0e13',
    slab: '#16161d',
    line: '#2c2c37',
    ink: '#ededf3',
    muted: '#a2a2b2',
    indigo: '#8c96ff',
    indigoSoft: '#23264d',
    onIndigo: '#0e0e13',
    verified: '#4fc88a',
    verifiedSoft: '#12301f',
    dark: true,
  },
  terminal: {
    page: '#0a0d0b',
    slab: '#0f1411',
    line: '#1f2b23',
    ink: '#c9f2d4',
    muted: '#82ad8f',
    indigo: '#4fc88a',
    indigoSoft: '#123222',
    onIndigo: '#0a0d0b',
    verified: '#4fc88a',
    verifiedSoft: '#12301f',
    dark: true,
  },
  cyber: {
    page: '#0b0a14',
    slab: '#121021',
    line: '#2a2546',
    ink: '#ece9ff',
    muted: '#aba4d8',
    indigo: '#ff5fdc',
    indigoSoft: '#3a1338',
    onIndigo: '#0b0a14',
    verified: '#4fc88a',
    verifiedSoft: '#12301f',
    dark: true,
  },
}

// An accent other than indigo, on a light or a dark theme
const accents: Record<string, [string, string, string, string]> = {
  //       light: accent, soft     dark: accent, soft
  vert: ['#1e7a4e', '#e3f3ea', '#4fc88a', '#12301f'],
  ambre: ['#8a5700', '#fbf0dc', '#e9b04c', '#33270f'],
  corail: ['#b42318', '#fce8e6', '#ff7b6e', '#3a1715'],
}

/** The palette of a theme and an accent; unknown ones fall to the default */
export const paletteOf = (theme: string, accent: string): Palette => {
  const base = themes[theme] ?? LIGHT
  const tone = accents[accent]
  if (!tone) return base
  return base.dark
    ? { ...base, indigo: tone[2], indigoSoft: tone[3], onIndigo: base.page }
    : { ...base, indigo: tone[0], indigoSoft: tone[1], onIndigo: '#ffffff' }
}

// The metals of the badge levels (§8.2): the fill of a light card, of a dark
const metals = [
  ['#b87648', '#b5774a'],
  ['#8a929f', '#9aa3b1'],
  ['#b88b14', '#c99a1e'],
  ['#5f8fa0', '#7fa9b8'],
]
const levelNames = ['Bronze', 'Argent', 'Or', 'Platine']
const badgeNames: Record<string, string> = {
  trusted_reviewer: 'Reviewer de confiance',
  first_responder: 'Premier à répondre',
  mentor: 'Mentor',
  open_source: 'Contributeur open source',
  builder: 'Bâtisseur',
  maintainer: 'Mainteneur',
  cross_border: 'Bâtisseur sans frontières',
  community_pillar: 'Pilier de communauté',
}

// The light card of the projects
const color = LIGHT

// What satori reads: an element, its style, its children
type Node = {
  type: string
  props: {
    style?: Record<string, unknown>
    children?: unknown
    // An image: its src, width and height
    [attribute: string]: unknown
  }
}
const el = (
  type: string,
  style: Record<string, unknown>,
  ...children: (Node | string | false | undefined)[]
): Node => ({
  type,
  props: {
    style: { display: 'flex', ...style },
    children: children.filter((c) => c !== false && c !== undefined),
  },
})

const font = (name: string) =>
  Deno.readFile(new URL(`./assets/fonts/${name}.woff`, import.meta.url))

let ready: Promise<
  { name: string; data: Uint8Array; weight: 400 | 600 | 700 }[]
>
// The wasm of resvg and the fonts, read once
const setup = () =>
  ready ??= (async () => {
    const wasm = new URL(
      'index_bg.wasm',
      import.meta.resolve('@resvg/resvg-wasm'),
    )
    await initWasm(await Deno.readFile(wasm))
    const [plex400, plex600, bric600, bric700] = await Promise.all([
      font('ibm-plex-sans-latin-400-normal'),
      font('ibm-plex-sans-latin-600-normal'),
      font('bricolage-grotesque-latin-600-normal'),
      font('bricolage-grotesque-latin-700-normal'),
    ])
    return [
      { name: 'Plex', data: plex400, weight: 400 as const },
      { name: 'Plex', data: plex600, weight: 600 as const },
      { name: 'Bricolage', data: bric600, weight: 600 as const },
      { name: 'Bricolage', data: bric700, weight: 700 as const },
    ]
  })()

/** A PNG from a tree of elements */
const render = async (tree: Node) => {
  const fonts = await setup()
  const svg = await satori(tree as never, {
    width: CARD_WIDTH,
    height: CARD_HEIGHT,
    fonts: fonts.map((f) => ({ ...f, style: 'normal' as const })),
  })
  return new Resvg(svg, { fitTo: { mode: 'width', value: CARD_WIDTH } })
    .render().asPng()
}

export const cut = (text: string, max: number) =>
  text.length > max ? `${text.slice(0, max - 1).trimEnd()}…` : text

const initials = (name: string) =>
  name.split(/\s+/).filter(Boolean).slice(0, 2).map((w) => w[0]).join('')
    .toUpperCase()

// The mark of Pamoja and its name, as in the favicon
const brand = (host: string, c: Palette = color) =>
  el(
    'div',
    { alignItems: 'center', justifyContent: 'space-between', width: '100%' },
    el(
      'div',
      { alignItems: 'center', gap: 14 },
      el(
        'div',
        {
          width: 40,
          height: 40,
          borderRadius: 10,
          backgroundColor: c.indigo,
          alignItems: 'center',
          justifyContent: 'center',
          color: c.onIndigo,
          fontFamily: 'Bricolage',
          fontWeight: 700,
          fontSize: 26,
        },
        'P',
      ),
      el(
        'div',
        {
          fontFamily: 'Bricolage',
          fontWeight: 700,
          fontSize: 30,
          color: c.ink,
        },
        'Pamoja',
      ),
    ),
    host && el('div', { fontSize: 22, color: c.muted }, host),
  )

const chip = (text: string, c: Palette = color) =>
  el(
    'div',
    {
      padding: '8px 16px',
      borderRadius: 999,
      border: `2px solid ${c.line}`,
      backgroundColor: c.slab,
      fontSize: 22,
      color: c.ink,
    },
    text,
  )

const stat = (
  value: number,
  label: string,
  tone: string = color.indigo,
  c: Palette = color,
) =>
  el(
    'div',
    { flexDirection: 'column', gap: 2 },
    el(
      'div',
      {
        fontFamily: 'Bricolage',
        fontWeight: 700,
        fontSize: 52,
        color: tone,
        lineHeight: 1,
      },
      String(value),
    ),
    el('div', { fontSize: 20, color: c.muted }, label),
  )

// The card, then its content with a margin around: satori adds a padding
// to the size it is given
const frame = (
  host: string,
  c: Palette,
  ...body: (Node | false | undefined)[]
) =>
  el(
    'div',
    {
      width: CARD_WIDTH,
      height: CARD_HEIGHT,
      flexDirection: 'column',
      backgroundColor: c.page,
      fontFamily: 'Plex',
      color: c.ink,
    },
    el('div', { height: 14, backgroundColor: c.indigo }),
    el(
      'div',
      {
        flex: 1,
        flexDirection: 'column',
        justifyContent: 'space-between',
        margin: '44px 56px 52px',
      },
      brand(host, c),
      ...body,
    ),
  )

const dimensions: Record<string, string> = {
  review: 'Code Review',
  build: 'Project Building',
  mentor: 'Mentoring',
  oss: 'Open Source',
  help: 'Entraide',
}

const getProfile = sql<
  {
    userId: number
    login: string
    name: string
    headline: string | null
    city: string | null
    country: string | null
    avatarUrl: string | null
    theme: string | null
    accent: string | null
  },
  string
>`
  SELECT user.userId, user.githubUsername AS login,
    profile.displayName AS name, profile.headline, profile.city,
    profile.country, user.avatarUrl, profile.theme, profile.accent
  FROM user JOIN profile ON profile.userId = user.userId
  WHERE user.githubUsername = ? COLLATE NOCASE
    AND ${notSuspended()}
`.get

/** A theme or an accent asked for when sharing (§9.2), if it is one */
export type CardStyle = { theme?: string | null; accent?: string | null }

const pick = (
  list: string[],
  wanted?: string | null,
  fallback?: string | null,
) =>
  wanted && list.includes(wanted)
    ? wanted
    : fallback && list.includes(fallback)
    ? fallback
    : list[0]

/**
 * What the card of a profile shows, or undefined for an unknown one: in the
 * theme and accent of the profile, or those asked for when sharing
 */
export const profileCardData = (login: string, style: CardStyle = {}) => {
  const row = getProfile(login)
  if (!row) return
  const proofs = proofsOf(row.userId)
  const counts = new Map<string, number>()
  for (const proof of proofs) {
    counts.set(proof.dimension, (counts.get(proof.dimension) ?? 0) + 1)
  }
  return {
    kind: 'profile' as const,
    login: row.login,
    name: row.name,
    headline: row.headline ?? '',
    place: [row.city, row.country ? countryName(row.country) : '']
      .filter(Boolean).join(', '),
    skills: skillsOf(row.userId).skills.map((s) => s.name).slice(0, 5),
    proofs: proofs.length,
    verified: proofs.filter((p) => p.source === 'github').length,
    // The strongest dimensions first
    dimensions: [...counts].sort((a, b) => b[1] - a[1]).slice(0, 3)
      .map(([key, n]) => ({ label: dimensions[key] ?? key, n })),
    // Its GitHub photo: read by the server, from GitHub only (cardPng)
    avatarUrl: row.avatarUrl ?? '',
    // The badges unlocked, the highest level first (§8.2)
    badges: badgesOf(row.userId)
      .filter((b) => b.level > 0)
      .sort((a, b) => b.level - a.level)
      .slice(0, 4)
      .map((b) => ({ name: badgeNames[b.badge] ?? b.badge, level: b.level })),
    theme: pick(CARD_THEMES, style.theme, row.theme),
    accent: pick(CARD_ACCENTS, style.accent, row.accent),
  }
}

const getProject = sql<
  {
    projectId: number
    slug: string
    name: string
    description: string | null
    skills: string | null
    owner: string
    ownerName: string
    stats: string | null
  },
  string
>`
  SELECT project.projectId, project.slug, project.name, project.description,
    project.skills, user.githubUsername AS owner,
    profile.displayName AS ownerName, repository.stats
  FROM project
  JOIN user ON user.userId = project.ownerId
  JOIN profile ON profile.userId = project.ownerId
  LEFT JOIN repository ON repository.projectId = project.projectId
  WHERE project.slug = ? AND project.visibility = 'public'
`.get

const countMembers = sql<{ n: number }, number>`
  SELECT count(*) AS n FROM projectMember WHERE projectId = ?
`.get

const countNeeds = sql<{ n: number }, number>`
  SELECT count(*) AS n FROM projectNeed
  WHERE projectId = ? AND status = 'open'
`.get

/** What the card of a public project shows */
export const projectCardData = (slug: string) => {
  const row = getProject(slug)
  if (!row) return
  let stars = 0
  try {
    stars = (JSON.parse(row.stats ?? '{}') as { stars?: number }).stars ?? 0
  } catch {
    // No statistics read from GitHub yet
  }
  const skills = skillNamesOf(numbersOf(row.skills))
  return {
    kind: 'project' as const,
    slug: row.slug,
    name: row.name,
    description: row.description ?? '',
    owner: row.owner,
    ownerName: row.ownerName,
    skills: skills.slice(0, 5),
    members: countMembers(row.projectId)?.n ?? 0,
    needs: countNeeds(row.projectId)?.n ?? 0,
    stars,
  }
}

type ProfileCard = NonNullable<ReturnType<typeof profileCardData>>
type ProjectCard = NonNullable<ReturnType<typeof projectCardData>>

// The photo in a ring of the accent, or the initials without one
const portrait = (card: ProfileCard, c: Palette, photo?: string) =>
  el(
    'div',
    {
      width: 184,
      height: 184,
      borderRadius: 999,
      border: `6px solid ${c.indigo}`,
      padding: 6,
      backgroundColor: c.page,
      flexShrink: 0,
    },
    photo
      ? {
        type: 'img',
        props: {
          src: photo,
          width: 160,
          height: 160,
          style: { borderRadius: 999, objectFit: 'cover' },
        },
      }
      : el(
        'div',
        {
          width: 160,
          height: 160,
          borderRadius: 999,
          backgroundColor: c.indigoSoft,
          alignItems: 'center',
          justifyContent: 'center',
          fontFamily: 'Bricolage',
          fontWeight: 700,
          fontSize: 62,
          color: c.indigo,
        },
        initials(card.name) || '?',
      ),
  )

// A badge unlocked: the metal of its level, its name, the level
const badgePill = (
  badge: { name: string; level: number },
  c: Palette,
) => {
  const metal = metals[badge.level - 1]?.[c.dark ? 1 : 0] ?? c.indigo
  return el(
    'div',
    {
      alignItems: 'center',
      gap: 10,
      padding: '7px 16px 7px 8px',
      borderRadius: 999,
      border: `2px solid ${metal}`,
      backgroundColor: c.slab,
      fontSize: 20,
      color: c.ink,
    },
    el('div', {
      width: 24,
      height: 24,
      borderRadius: 999,
      backgroundColor: metal,
    }),
    el(
      'div',
      { gap: 6 },
      el('div', { fontWeight: 600 }, cut(badge.name, 26)),
      el('div', { color: c.muted }, `· ${levelNames[badge.level - 1] ?? ''}`),
    ),
  )
}

const profileTree = (card: ProfileCard, host: string, photo?: string) => {
  const c = paletteOf(card.theme, card.accent)
  return frame(
    host,
    c,
    el(
      'div',
      { alignItems: 'center', gap: 40 },
      portrait(card, c, photo),
      el(
        'div',
        { flexDirection: 'column', gap: 8, flex: 1 },
        el(
          'div',
          {
            fontFamily: 'Bricolage',
            fontWeight: 700,
            fontSize: 60,
            lineHeight: 1.05,
          },
          cut(card.name, 30),
        ),
        el(
          'div',
          { fontSize: 24, color: c.muted },
          [`@${card.login}`, card.place].filter(Boolean).join(' · '),
        ),
        card.headline &&
          el(
            'div',
            { fontSize: 26, lineHeight: 1.3, marginTop: 4 },
            cut(card.headline, 90),
          ),
        card.skills.length > 0 &&
          el(
            'div',
            { gap: 10, flexWrap: 'wrap', marginTop: 8 },
            ...card.skills.slice(0, 4).map((skill) => chip(skill, c)),
          ),
      ),
    ),
    el(
      'div',
      { alignItems: 'flex-end', justifyContent: 'space-between', gap: 24 },
      // Its proofs; before the first, what it is here for, never a zero
      card.proofs
        ? el(
          'div',
          { gap: 40 },
          stat(
            card.proofs,
            card.proofs > 1 ? 'preuves' : 'preuve',
            c.indigo,
            c,
          ),
          card.verified > 0 &&
            stat(
              card.verified,
              card.verified > 1
                ? 'vérifiées par GitHub'
                : 'vérifiée par GitHub',
              c.verified,
              c,
            ),
          ...card.dimensions.slice(0, card.badges.length > 2 ? 1 : 2).map((
            d,
          ) => stat(d.n, d.label, c.ink, c)),
        )
        : el(
          'div',
          { fontSize: 26, color: c.muted, maxWidth: 520 },
          'Construit sa réputation sur de vraies collaborations.',
        ),
      card.badges.length > 0 &&
        el(
          'div',
          {
            flexDirection: 'column',
            alignItems: 'flex-end',
            gap: 10,
            maxWidth: 470,
          },
          ...card.badges.slice(0, 3).map((badge) => badgePill(badge, c)),
        ),
    ),
  )
}

const projectTree = (card: ProjectCard, host: string) =>
  frame(
    host,
    color,
    el(
      'div',
      { flexDirection: 'column', gap: 12 },
      el(
        'div',
        {
          fontFamily: 'Bricolage',
          fontWeight: 700,
          fontSize: 68,
          lineHeight: 1.05,
        },
        cut(card.name, 30),
      ),
      el(
        'div',
        { fontSize: 24, color: color.muted },
        `par ${card.ownerName} · @${card.owner}`,
      ),
      card.description &&
        el(
          'div',
          { fontSize: 30, lineHeight: 1.3, marginTop: 8 },
          cut(card.description, 140),
        ),
    ),
    el(
      'div',
      { alignItems: 'flex-end', justifyContent: 'space-between', gap: 24 },
      el(
        'div',
        { gap: 44 },
        stat(card.members, card.members > 1 ? 'membres' : 'membre'),
        stat(
          card.needs,
          card.needs > 1 ? 'besoins ouverts' : 'besoin ouvert',
          color.verified,
        ),
        card.stars > 0 && stat(card.stars, 'étoiles', color.ink),
      ),
      el(
        'div',
        {
          gap: 10,
          flexWrap: 'wrap',
          justifyContent: 'flex-end',
          maxWidth: 480,
        },
        ...card.skills.slice(0, 4).map((skill) => chip(skill)),
      ),
    ),
  )

const CARD_DIR = `${MEDIA_DIR}/cards`
// Changed with the drawing: the cards already kept are drawn again
const CARD_LAYOUT = 5
// A card nobody asked for in a week leaves the disk
const KEEP_FOR = 7 * 24 * 3600 * 1000

/**
 * The address the card shows: the domain of the deployment (PUBLIC_HOST),
 * never the Host of a request, which anyone writes
 */
export const publicHost = () => Deno.env.get('PUBLIC_HOST')?.trim() ?? ''

const hashOf = async (value: unknown) =>
  new Uint8Array(
    await crypto.subtle.digest(
      'SHA-256',
      new TextEncoder().encode(JSON.stringify(value)),
    ),
  ).toHex().slice(0, 32)

// Cards being drawn: two requests for the same one draw it once
const drawing = new Map<string, Promise<Uint8Array>>()
let sweptAt = 0

// The cards older than a week leave the disk, at most once an hour
const sweep = async () => {
  if (Date.now() - sweptAt < 3600 * 1000) return
  sweptAt = Date.now()
  try {
    for await (const file of Deno.readDir(CARD_DIR)) {
      const path = `${CARD_DIR}/${file.name}`
      const info = await Deno.stat(path)
      const used = info.atime ?? info.mtime
      if (used && Date.now() - used.getTime() > KEEP_FOR) {
        await Deno.remove(path)
      }
    }
  } catch {
    // Nothing kept yet
  }
}

/** The key of a card: its data, its drawing and the address it shows */
const keyOf = (card: ProfileCard | ProjectCard) =>
  hashOf([CARD_LAYOUT, card, publicHost()])

// A photo is read from GitHub's avatars only: the server never fetches an
// address a profile could set
const PHOTO_HOST = 'avatars.githubusercontent.com'
const PHOTO_MAX = 2_000_000

/** The GitHub photo of a profile as a data URL, or none (then initials) */
export const photoOf = async (url: string) => {
  try {
    const address = new URL(url)
    if (address.protocol !== 'https:' || address.hostname !== PHOTO_HOST) {
      return
    }
    // Large enough for the card, small to read
    address.searchParams.set('s', '320')
    const res = await fetch(address, { signal: AbortSignal.timeout(4000) })
    const type = res.headers.get('content-type') ?? ''
    if (!res.ok || !/^image\/(png|jpeg)$/.test(type.split(';')[0])) return
    const bytes = new Uint8Array(await res.arrayBuffer())
    if (bytes.length > PHOTO_MAX) return
    return `data:${type.split(';')[0]};base64,${bytes.toBase64()}`
  } catch {
    // No photo: the initials
  }
}

/**
 * The PNG of a card, from the disk when the same data was already drawn,
 * else drawn once and kept
 */
const cardPng = async (card: ProfileCard | ProjectCard, key: string) => {
  const path = `${CARD_DIR}/${key}.png`
  try {
    return await Deno.readFile(path)
  } catch {
    // Not drawn yet
  }
  const pending = drawing.get(key)
  if (pending) return pending
  const host = publicHost()
  const draw = (async () =>
    render(
      card.kind === 'profile'
        ? profileTree(card, host, await photoOf(card.avatarUrl))
        : projectTree(card, host),
    ))().then(async (png) => {
      await Deno.mkdir(CARD_DIR, { recursive: true })
      await Deno.writeFile(path, png)
      sweep()
      return png
    }).finally(() => drawing.delete(key))
  drawing.set(key, draw)
  return draw
}

/** The card as an HTTP answer: cached by the crawlers, revalidated by ETag */
export const cardResponse = async (
  card: ProfileCard | ProjectCard | undefined,
  ifNoneMatch: string | null,
) => {
  if (!card) return new Response('Not found', { status: 404 })
  const key = await keyOf(card)
  const etag = `"${key}"`
  const headers = {
    'Content-Type': 'image/png',
    'Cache-Control': 'public, max-age=3600',
    ETag: etag,
  }
  // Unchanged: nothing is read from the disk
  if (ifNoneMatch === etag) return new Response(null, { status: 304, headers })
  const png = await cardPng(card, key)
  return new Response(png as Uint8Array<ArrayBuffer>, { headers })
}
