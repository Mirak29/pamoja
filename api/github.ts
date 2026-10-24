import { respond } from '@01edu/api/response'
import { GITHUB_BOT_TOKEN } from '/api/lib/env.ts'
import { errorMessage, log } from '/api/lib/log.ts'

// Server reads of the GitHub REST API with the bot token (§5.2): public
// repos only, never during the display of a page (§5.6). A known ETag makes
// the request conditional: a 304 answer does not count in the quota.

export type GithubAnswer<T> =
  | { status: 200; data: T; etag?: string; link?: string }
  | { status: 304 }
  | { status: 404 }

// A GitHub failure is not a bug of Pamoja: the page gets a 503 when the
// quota is spent (it comes back within the hour), a 502 otherwise
const githubFailure = (status: number, path: string, quotaLeft?: string) =>
  quotaLeft === '0' || status === 429
    ? new respond.ServiceUnavailableError({
      message: 'GitHub quota reached, try again later',
      path,
    })
    : new respond.BadGatewayError({
      message: `GitHub answered ${status}`,
      path,
    })

/** The headers of every call to the REST API, with a token when given */
export const githubHeaders = (
  token?: string,
  accept = 'application/vnd.github+json',
) => ({
  Accept: accept,
  'User-Agent': 'Pamoja',
  'X-GitHub-Api-Version': '2022-11-28',
  ...token && { Authorization: `Bearer ${token}` },
})

// A read that hangs would hold the 15 min refresh forever: it is cut short
const TIMEOUT = 30_000

export const github = async <T>(
  path: string,
  { etag, raw }: { etag?: string; raw?: boolean } = {},
): Promise<GithubAnswer<T>> => {
  let res: Response
  try {
    res = await fetch(`https://api.github.com${path}`, {
      headers: {
        ...githubHeaders(
          GITHUB_BOT_TOKEN,
          raw ? 'application/vnd.github.raw+json' : undefined,
        ),
        ...etag && { 'If-None-Match': etag },
      },
      signal: AbortSignal.timeout(TIMEOUT),
    })
  } catch (err) {
    log.warn('github-read-error', { path, message: errorMessage(err) })
    throw new respond.BadGatewayError({
      message: 'GitHub did not answer',
      path,
    })
  }
  if (res.status === 304) return { status: 304 }
  if (res.status === 404) {
    await res.body?.cancel()
    return { status: 404 }
  }
  if (!res.ok) {
    await res.body?.cancel()
    const remaining = res.headers.get('x-ratelimit-remaining') ?? undefined
    log.warn('github-read-error', { path, status: res.status, remaining })
    throw githubFailure(res.status, path, remaining)
  }
  return {
    status: 200,
    data: (raw ? await res.text() : await res.json()) as T,
    etag: res.headers.get('etag') ?? undefined,
    link: res.headers.get('link') ?? undefined,
  }
}

/** The data of a read that must succeed: a 404 is an error here */
export const read = async <T>(path: string, options?: { raw?: boolean }) => {
  const answer = await github<T>(path, options)
  if (answer.status !== 200) throw githubFailure(answer.status, path)
  return answer.data
}

/** Reads that may be absent: no README, no release */
export const readOptional = async <T>(
  path: string,
  options?: { raw?: boolean },
) => {
  const answer = await github<T>(path, options)
  return answer.status === 200 ? answer.data : undefined
}

/** Number of items of a list read with per_page=1, from its last page link */
export const countOf = async (path: string) => {
  const answer = await github<unknown[]>(
    `${path}${path.includes('?') ? '&' : '?'}per_page=1`,
  )
  if (answer.status !== 200) return 0
  const last = answer.link?.match(/[?&]page=(\d+)>; rel="last"/)
  return last ? Number(last[1]) : answer.data.length
}

/** GitHub dates are ISO strings; the database keeps seconds (§14) */
export const seconds = (iso: string | null | undefined) =>
  iso ? Date.parse(iso) / 1000 : null
