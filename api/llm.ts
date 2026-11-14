/*
 * The models of Pamoja (§11): one way to ask them, for the Assistant and for
 * the background tasks. Three providers, all compatible with OpenAI, tried in
 * order: Meta (Muse), then Gemini, then Groq. A provider that fails is skipped
 * for a few minutes; when none answers, the caller falls back to what it
 * computes without AI.
 *
 * Keys are read when asked, never in the repo (`.env-local`). A provider
 * without its key is left out; without any key, `hasModel()` is false.
 *
 * What it costs (PAM-540): every call has a ceiling of tokens and thinks as
 * little as its provider allows; Meta, the only one that bills, stops for
 * the day once its budget is spent, and the free ones take over. Each call
 * logs what it used.
 */

import { log } from '/api/lib/log.ts'

export type Provider = {
  name: string
  url: string
  // The variable that holds its key
  key: string
  model: string
  // How much the model thinks before answering: billed as output
  effort: 'minimal' | 'low'
  // Dollars per million tokens, in and out; none for a free tier
  price?: { input: number; output: number }
}

export const PROVIDERS: Provider[] = [
  {
    // The cheapest of the Muse models: fast, enough for short answers
    name: 'meta',
    url: 'https://api.meta.ai/v1',
    key: 'META_API_KEY',
    model: 'muse-ember-1.0',
    // At « low », it spent 298 tokens thinking on a two-line answer, 33 at
    // « minimal »
    effort: 'minimal',
    // The price of Muse Spark: Ember is announced cheaper, so this is a
    // ceiling
    price: { input: 1.25, output: 4.25 },
  },
  {
    name: 'gemini',
    url: 'https://generativelanguage.googleapis.com/v1beta/openai',
    key: 'GEMINI_API_KEY',
    model: 'gemini-3.5-flash',
    // 2.4 s instead of 9.9 s, the same answer
    effort: 'minimal',
  },
  {
    name: 'groq',
    url: 'https://api.groq.com/openai/v1',
    key: 'GROQ_API_KEY',
    model: 'openai/gpt-oss-120b',
    // It knows no « minimal »
    effort: 'low',
  },
]

// Embeddings come from Gemini alone: the other two have none for us
/** The model of the vectors stored: a new one means new vectors */
export const EMBEDDING_MODEL = 'gemini-embedding-001'
const EMBEDDING = { provider: 'gemini', model: EMBEDDING_MODEL }
/** The size of a vector: small, enough to compare a request and a profile */
export const DIMENSIONS = 256

// How long a provider may take, and how long it rests after failing
const TIMEOUT_MS = 20_000
const REST_MS = 5 * 60_000

/**
 * Dollars a paying provider may spend in a day (UTC), all uses together;
 * `AI_DAILY_BUDGET` changes it. Counted in memory: one instance serves
 * Pamoja (§12), and a restart starts the day again.
 */
export const DAILY_BUDGET = 1

const restUntil = new Map<string, number>()
let spent = { day: '', dollars: new Map<string, number>() }

/** Forgets which providers rest and what was spent: for the tests */
export const resetModels = () => {
  restUntil.clear()
  spent = { day: '', dollars: new Map() }
}

const keyOf = (provider: Provider) => Deno.env.get(provider.key)?.trim() ?? ''

const budget = () => {
  const set = Deno.env.get('AI_DAILY_BUDGET')?.trim()
  const dollars = Number(set)
  return set && Number.isFinite(dollars) && dollars >= 0
    ? dollars
    : DAILY_BUDGET
}

// What a paying provider spent today; a new day starts from 0
const spentBy = (name: string) => {
  const day = new Date().toISOString().slice(0, 10)
  if (spent.day !== day) spent = { day, dollars: new Map() }
  return spent.dollars.get(name) ?? 0
}

/** Dollars a provider spent today: for the tests */
export const spentToday = (name: string) => spentBy(name)

const ready = () =>
  PROVIDERS.filter((provider) =>
    keyOf(provider) && (restUntil.get(provider.name) ?? 0) <= Date.now() &&
    (!provider.price || spentBy(provider.name) < budget())
  )

type Usage = {
  prompt_tokens?: number
  completion_tokens?: number
  total_tokens?: number
  completion_tokens_details?: { reasoning_tokens?: number }
}

// Counts and logs a call. Gemini leaves its thinking out of
// completion_tokens but not out of total_tokens: everything past the prompt
// counts as output
const account = (
  provider: Provider,
  use: string,
  usage: Usage | undefined,
  ms: number,
) => {
  const input = usage?.prompt_tokens ?? 0
  const output = Math.max(
    usage?.completion_tokens ?? 0,
    (usage?.total_tokens ?? 0) - input,
  )
  const dollars = provider.price
    ? (input * provider.price.input + output * provider.price.output) / 1e6
    : 0
  const today = spentBy(provider.name) + dollars
  if (dollars) spent.dollars.set(provider.name, today)
  log.info('model-call', {
    provider: provider.name,
    use,
    input,
    output,
    reasoning: usage?.completion_tokens_details?.reasoning_tokens ?? 0,
    dollars: Math.round(dollars * 1e6) / 1e6,
    today: Math.round(today * 1e4) / 1e4,
    ms,
  })
}

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

export type ChatOptions = {
  // Who asks: in the logs
  use: string
  // The ceiling of the answer, thinking included
  maxTokens: number
  json?: boolean
  temperature?: number
}

type Completion = {
  choices?: { message?: { content?: unknown } }[]
  usage?: Usage
}

/**
 * The answer of the first provider that gives one. Throws when none does:
 * the caller shows what it has without AI.
 */
export const chat = async (
  messages: Message[],
  { use, maxTokens, json = false, temperature = 0.2 }: ChatOptions,
) => {
  for (const provider of ready()) {
    const start = Date.now()
    let body: Completion
    try {
      body = await post(provider, '/chat/completions', {
        model: provider.model,
        messages,
        stream: false,
        temperature,
        max_completion_tokens: maxTokens,
        reasoning_effort: provider.effort,
        ...(json && { response_format: { type: 'json_object' } }),
      }) as Completion
    } catch {
      // Down, refused or too slow: it rests, the next one answers
      restUntil.set(provider.name, Date.now() + REST_MS)
      continue
    }
    account(provider, use, body.usage, Date.now() - start)
    const answer = answerOf(body.choices?.[0]?.message?.content)
    if (answer) return answer
    // Cut at the ceiling, or empty: the next one tries; this one does not
    // rest, the question was the problem
  }
  throw new Error('No model answered')
}

/**
 * A JSON answer, parsed; undefined when no model gives valid JSON. The
 * caller validates its shape before writing anything (§11).
 */
export const chatJson = async (
  messages: Message[],
  options: Omit<ChatOptions, 'json'>,
) => {
  try {
    const text = await chat(messages, { ...options, json: true })
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
