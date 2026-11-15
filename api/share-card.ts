import { sql } from '@01edu/db'
import satori from 'satori'
import { initWasm, Resvg } from '@resvg/resvg-wasm'
import { MEDIA_DIR } from '/api/media.ts'
import { proofsOf } from '/api/proofs.ts'
import { countryName } from '/api/vocabulary.ts'
import { skillNamesOf, skillsOf } from '/api/skills.ts'

// The Share Card (§17.2): a PNG of 1200 × 630, the og:image of a profile or
// a project. A tree of elements becomes an SVG with satori, then a PNG with
// resvg. The fonts are in the binary (api/assets/fonts). Each card is kept
// on disk under the hash of what it shows: the same data, the same file;
// changed data, a new one.

export const CARD_WIDTH = 1200
export const CARD_HEIGHT = 630

// The light theme of the app (web/assets/styles/theme.css)
const color = {
  page: '#f6f6f8',
  slab: '#ffffff',
  line: '#e0e0e6',
  ink: '#1d1d25',
  muted: '#5d5d6b',
  indigo: '#3340b8',
  indigoSoft: '#e8eafb',
  verified: '#1e7a4e',
  verifiedSoft: '#e3f3ea',
}

// What satori reads: an element, its style, its children
type Node = {
  type: string
  props: { style?: Record<string, unknown>; children?: unknown }
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

const cut = (text: string, max: number) =>
  text.length > max ? `${text.slice(0, max - 1).trimEnd()}…` : text

const initials = (name: string) =>
  name.split(/\s+/).filter(Boolean).slice(0, 2).map((w) => w[0]).join('')
    .toUpperCase()

// The mark of Pamoja and its name, as in the favicon
const brand = (host: string) =>
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
          backgroundColor: color.indigo,
          alignItems: 'center',
          justifyContent: 'center',
          color: '#ffffff',
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
          color: color.ink,
        },
        'Pamoja',
      ),
    ),
    el('div', { fontSize: 22, color: color.muted }, host),
  )

const chip = (text: string) =>
  el(
    'div',
    {
      padding: '8px 16px',
      borderRadius: 999,
      border: `2px solid ${color.line}`,
      backgroundColor: color.slab,
      fontSize: 22,
      color: color.ink,
    },
    text,
  )

const stat = (value: number, label: string, tone = color.indigo) =>
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
    el('div', { fontSize: 20, color: color.muted }, label),
  )

// The card, then its content with a margin around: satori adds a padding
// to the size it is given
const frame = (host: string, ...body: (Node | false | undefined)[]) =>
  el(
    'div',
    {
      width: CARD_WIDTH,
      height: CARD_HEIGHT,
      flexDirection: 'column',
      backgroundColor: color.page,
      fontFamily: 'Plex',
      color: color.ink,
    },
    el('div', { height: 14, backgroundColor: color.indigo }),
    el(
      'div',
      {
        flex: 1,
        flexDirection: 'column',
        justifyContent: 'space-between',
        margin: '44px 56px 52px',
      },
      brand(host),
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
  },
  string
>`
  SELECT user.userId, user.githubUsername AS login,
    profile.displayName AS name, profile.headline, profile.city,
    profile.country
  FROM user JOIN profile ON profile.userId = user.userId
  WHERE user.githubUsername = ? COLLATE NOCASE
    AND (user.suspendedUntil IS NULL OR user.suspendedUntil < unixepoch())
`.get

/** What the card of a profile shows, or undefined for an unknown one */
export const profileCardData = (login: string) => {
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
  let skills: string[] = []
  try {
    skills = skillNamesOf(JSON.parse(row.skills ?? '[]') as number[])
  } catch {
    // No skills yet
  }
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

const profileTree = (card: ProfileCard, host: string) =>
  frame(
    host,
    el(
      'div',
      { alignItems: 'center', gap: 36 },
      el(
        'div',
        {
          width: 150,
          height: 150,
          borderRadius: 999,
          backgroundColor: color.indigoSoft,
          border: `4px solid ${color.indigo}`,
          alignItems: 'center',
          justifyContent: 'center',
          fontFamily: 'Bricolage',
          fontWeight: 700,
          fontSize: 60,
          color: color.indigo,
        },
        initials(card.name) || '?',
      ),
      el(
        'div',
        { flexDirection: 'column', gap: 8, flex: 1 },
        el(
          'div',
          {
            fontFamily: 'Bricolage',
            fontWeight: 700,
            fontSize: 62,
            lineHeight: 1.05,
          },
          cut(card.name, 34),
        ),
        el(
          'div',
          { fontSize: 24, color: color.muted },
          [`@${card.login}`, card.place].filter(Boolean).join(' · '),
        ),
        card.headline &&
          el(
            'div',
            { fontSize: 28, lineHeight: 1.3, marginTop: 6 },
            cut(card.headline, 110),
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
          { gap: 44 },
          stat(card.proofs, card.proofs > 1 ? 'preuves' : 'preuve'),
          card.verified > 0 &&
            stat(
              card.verified,
              card.verified > 1
                ? 'vérifiées par GitHub'
                : 'vérifiée par GitHub',
              color.verified,
            ),
          ...card.dimensions.slice(0, 2).map((d) =>
            stat(d.n, d.label, color.ink)
          ),
        )
        : el(
          'div',
          { fontSize: 26, color: color.muted, maxWidth: 560 },
          'Construit sa réputation sur de vraies collaborations.',
        ),
      el(
        'div',
        {
          gap: 10,
          flexWrap: 'wrap',
          justifyContent: 'flex-end',
          maxWidth: 440,
        },
        ...card.skills.slice(0, 4).map(chip),
      ),
    ),
  )

const projectTree = (card: ProjectCard, host: string) =>
  frame(
    host,
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
        ...card.skills.slice(0, 4).map(chip),
      ),
    ),
  )

const CARD_DIR = `${MEDIA_DIR}/cards`
// Changed with the drawing: the cards already kept are drawn again
const CARD_LAYOUT = 3

const hashOf = async (value: unknown) =>
  new Uint8Array(
    await crypto.subtle.digest(
      'SHA-256',
      new TextEncoder().encode(JSON.stringify(value)),
    ),
  ).toHex().slice(0, 32)

/**
 * The PNG of a card, from the disk when the same data was already drawn,
 * else drawn and kept. Its hash goes in the ETag
 */
export const cardPng = async (
  card: ProfileCard | ProjectCard,
  host: string,
) => {
  const key = await hashOf([CARD_LAYOUT, card, host])
  const path = `${CARD_DIR}/${key}.png`
  try {
    return { key, png: await Deno.readFile(path) }
  } catch {
    // Not drawn yet
  }
  const png = await render(
    card.kind === 'profile' ? profileTree(card, host) : projectTree(card, host),
  )
  await Deno.mkdir(CARD_DIR, { recursive: true })
  await Deno.writeFile(path, png)
  return { key, png }
}

/** The card as an HTTP answer: cached by the crawlers, revalidated by ETag */
export const cardResponse = async (
  card: ProfileCard | ProjectCard | undefined,
  host: string,
  ifNoneMatch: string | null,
) => {
  if (!card) return new Response('Not found', { status: 404 })
  const { key, png } = await cardPng(card, host)
  const etag = `"${key}"`
  const headers = {
    'Content-Type': 'image/png',
    'Cache-Control': 'public, max-age=3600',
    ETag: etag,
  }
  if (ifNoneMatch === etag) return new Response(null, { status: 304, headers })
  return new Response(png as Uint8Array<ArrayBuffer>, { headers })
}
