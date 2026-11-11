import http from 'k6/http'
import { check, sleep } from 'k6'

const baseUrl = (__ENV.K6_BASE_URL || 'http://127.0.0.1:8800').replace(
  /\/$/,
  '',
)
const vus = Number(__ENV.PAMOJA_VUS || 1000)
const duration = __ENV.PAMOJA_DURATION || '2m'
const sessions = JSON.parse(open('./sessions.json'))

export const options = {
  scenarios: {
    mixed_local_routes: {
      executor: 'constant-vus',
      vus,
      duration,
    },
  },
  thresholds: {
    http_req_failed: ['rate<0.01'],
    http_req_duration: ['p(95)<1000'],
  },
}

export function setup() {
  if (sessions.length !== 1000) {
    throw new Error(
      `Il faut 1000 sessions de test, trouvé : ${sessions.length}`,
    )
  }
  const health = http.get(`${baseUrl}/api/health`, {
    tags: { name: 'health-preflight' },
  })
  check(health, { 'le serveur est prêt': (r) => r.status === 200 })
  if (health.status !== 200) {
    throw new Error(`Serveur non prêt : HTTP ${health.status}`)
  }
  return { sessions }
}

function send(session, name, path, method = 'GET', body, accepted = [200]) {
  const params = {
    headers: {
      Cookie: session.cookie,
      ...(body ? { 'Content-Type': 'application/json' } : {}),
    },
    tags: { name },
  }
  const response = method === 'GET'
    ? http.get(`${baseUrl}${path}`, params)
    : http.post(`${baseUrl}${path}`, JSON.stringify(body ?? {}), params)
  check(response, {
    [`${name} répond comme attendu`]: (r) => accepted.includes(r.status),
  })
  return response
}

function json(response) {
  try {
    return JSON.parse(response.body)
  } catch {
    return undefined
  }
}

const tasks = [
  (s) => send(s, 'health', '/api/health'),
  (s) => send(s, 'api-doc', '/api/doc'),
  (s) => send(s, 'home', '/'),
  (s) => send(s, 'public-profile', `/api/user?username=${s.login}`),
  (s) => send(s, 'public-badges', `/api/user/badges?username=${s.login}`),
  (s) => send(s, 'public-proofs', `/api/user/proofs?username=${s.login}`),
  (s) => send(s, 'current-user', '/api/user/me'),
  (s) => send(s, 'my-projects', '/api/projects'),
  (s) =>
    send(
      s,
      'project-issues',
      '/api/project/issues?slug=stress-project-0&before=',
    ),
  (s) =>
    send(
      s,
      'project-pulls',
      '/api/project/pulls?slug=stress-project-0&before=',
    ),
  (s) => send(s, 'help-mine', '/api/help?tab=mine&before='),
  (s) => send(s, 'help-accepted', '/api/help?tab=accepted&before='),
  (s) => send(s, 'help-projects', '/api/help?tab=projects&before='),
  (s) => send(s, 'help-for-me', '/api/help/for-me?before='),
  (s) =>
    send(
      s,
      'help-preview',
      '/api/help/preview?category=code_review&skills=Go&project=',
    ),
  (s) => {
    const list = send(s, 'help-mine-for-detail', '/api/help?tab=mine&before=')
    const item = json(list)?.items?.[0]
    if (item?.id) {
      send(s, 'help-detail', `/api/help/detail?id=${item.id}`)
    }
  },
  (s) => send(s, 'notifications', '/api/notifications?before=&category='),
  (s) => send(s, 'conversations', '/api/conversations?before='),
  (s) => send(s, 'conversation-with', '/api/conversation/with?login=abdou'),
  (s) => send(s, 'conversation-search', '/api/conversations/search?q=Message'),
  (s) => {
    const list = send(
      s,
      'conversations-for-detail',
      '/api/conversations?before=',
    )
    const item = json(list)?.items?.[0]
    if (item?.id) {
      send(s, 'conversation-detail', `/api/conversation?id=${item.id}`)
    }
  },
  (s) =>
    send(
      s,
      'profile-update',
      '/api/user/profile/update',
      'POST',
      {
        displayName: 'Compte de charge',
        headline: 'Test k6',
        bio: '',
        country: '',
        city: '',
        website: '',
        matchingMode: 'instant',
      },
    ),
  (s) =>
    send(
      s,
      'skills-update',
      '/api/user/skills/update',
      'POST',
      { skills: [], domains: [] },
    ),
  (s) =>
    send(
      s,
      'intents-update',
      '/api/user/intents/update',
      'POST',
      { intents: [] },
    ),
  (s) =>
    send(
      s,
      'notification-preferences',
      '/api/notification/preferences',
      'POST',
      { matchingMode: 'instant', minScore: 0, helpTypes: ['code_review'] },
    ),
  (s) =>
    send(
      s,
      'notifications-read-all',
      '/api/notifications/read-all',
      'POST',
      {},
      [200, 204],
    ),
  (s) => {
    const list = send(s, 'conversations-for-read', '/api/conversations?before=')
    const item = json(list)?.items?.[0]
    if (item?.id) {
      send(
        s,
        'conversation-read',
        '/api/conversation/read',
        'POST',
        { id: item.id },
        [200, 204],
      )
    }
  },
]

export default function (data) {
  const session = data.sessions[(__VU - 1) % data.sessions.length]
  tasks[(__ITER + __VU - 1) % tasks.length](session)
  sleep(1)
}
