/*
 * The models of Pamoja (§11): one way to ask them, for the Assistant and for
 * the background tasks. Three providers, all compatible with OpenAI, tried in
 * order: Meta (Muse), then Gemini, then Groq. A provider that fails is skipped
 * for a few minutes; when none answers, the caller falls back to what it
 * computes without AI.
 *
 * Keys are read when asked, never in the repo (`.env-local`). A provider
 * without its key is left out; without any key, `hasModel()` is false.
 */

export type Provider = {
  name: string
  url: string
  // The variable that holds its key
  key: string
  model: string
}

export const PROVIDERS: Provider[] = [
  {
    // The cheapest of the Muse models: fast, enough for short answers
    name: 'meta',
    url: 'https://api.meta.ai/v1',
    key: 'META_API_KEY',
    model: 'muse-ember-1.0',
  },
  {
    name: 'gemini',
    url: 'https://generativelanguage.googleapis.com/v1beta/openai',
    key: 'GEMINI_API_KEY',
    model: 'gemini-3.5-flash',
  },
  {
    name: 'groq',
    url: 'https://api.groq.com/openai/v1',
    key: 'GROQ_API_KEY',
    model: 'openai/gpt-oss-120b',
  },
]

// Embeddings come from Gemini alone: the other two have none for us
const EMBEDDING = { provider: 'gemini', model: 'gemini-embedding-001' }
/** The size of a vector: small, enough to compare a request and a profile */
export const DIMENSIONS = 256

// How long a provider may take, and how long it rests after failing
const TIMEOUT_MS = 20_000
const REST_MS = 5 * 60_000

const restUntil = new Map<string, number>()

/** Forgets which providers rest: for the tests */
export const resetModels = () => restUntil.clear()

const keyOf = (provider: Provider) => Deno.env.get(provider.key)?.trim() ?? ''

const ready = () =>
  PROVIDERS.filter((provider) =>
    keyOf(provider) && (restUntil.get(provider.name) ?? 0) <= Date.now()
  )

/** Whether a model can be asked at all */
export const hasModel = () => PROVIDERS.some(keyOf)

const post = async (provider: Provider, path: string, body: unknown) => {
  const res = await fetch(`${provider.url}${path}`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${keyOf(provider)}`,
    },
    body: JSON.stringify(body),
    signal: AbortSignal.timeout(TIMEOUT_MS),
  })
  if (!res.ok) {
    await res.body?.cancel()
    throw new Error(`${provider.name} answered ${res.status}`)
  }
  return await res.json()
}

// Some models think aloud before answering: only the answer is kept
const answerOf = (content: unknown) =>
  typeof content === 'string'
    ? content.replace(/<think>[\s\S]*?<\/think>/g, '').trim()
    : ''

export type Message = { role: 'system' | 'user' | 'assistant'; content: string }

/**
 * The answer of the first provider that gives one. Throws when none does:
 * the caller shows what it has without AI.
 */
export const chat = async (
  messages: Message[],
  { json = false, temperature = 0.2 } = {},
) => {
  for (const provider of ready()) {
    try {
      const body = await post(provider, '/chat/completions', {
        model: provider.model,
        messages,
        stream: false,
        temperature,
        ...(json && { response_format: { type: 'json_object' } }),
      }) as { choices?: { message?: { content?: unknown } }[] }
      const answer = answerOf(body.choices?.[0]?.message?.content)
      if (answer) return answer
      throw new Error(`${provider.name} said nothing`)
    } catch {
      restUntil.set(provider.name, Date.now() + REST_MS)
    }
  }
  throw new Error('No model answered')
}

/**
 * A JSON answer, parsed; undefined when no model gives valid JSON. The
 * caller validates its shape before writing anything (§11).
 */
export const chatJson = async (messages: Message[]) => {
  try {
    const text = await chat(messages, { json: true })
    // A fence around the JSON is tolerated, nothing else
    return JSON.parse(text.replace(/^```(?:json)?\s*|\s*```$/g, '')) as unknown
  } catch {
    return undefined
  }
}

/**
 * One vector per text, normalized; undefined without Gemini or when it
 * fails: semantic proximity then counts 0 (§7.3).
 */
export const embed = async (texts: string[]) => {
  const provider = PROVIDERS.find((p) => p.name === EMBEDDING.provider)!
  const resting = (restUntil.get(EMBEDDING.model) ?? 0) > Date.now()
  if (!texts.length || !keyOf(provider) || resting) return undefined
  try {
    const body = await post(provider, '/embeddings', {
      model: EMBEDDING.model,
      input: texts,
      dimensions: DIMENSIONS,
    }) as { data?: { embedding?: number[] }[] }
    const vectors = (body.data ?? []).map((item) => item.embedding ?? [])
    if (
      vectors.length !== texts.length ||
      vectors.some((vector) => vector.length !== DIMENSIONS)
    ) throw new Error('Unexpected vectors')
    return vectors.map((vector) => {
      const norm = Math.hypot(...vector) || 1
      return Float32Array.from(vector, (value) => value / norm)
    })
  } catch {
    restUntil.set(EMBEDDING.model, Date.now() + REST_MS)
    return undefined
  }
}

/** Cosine of two normalized vectors, from -1 to 1 */
export const cosine = (a: Float32Array, b: Float32Array) => {
  let sum = 0
  for (let i = 0; i < Math.min(a.length, b.length); i++) sum += a[i] * b[i]
  return sum
}
