import { assertEquals, assertRejects } from 'jsr:@std/assert@^1.0.13'
import { chat, resetModels, spentToday } from '/api/llm.ts'

// What the models cost (PAM-540): a ceiling per call, little thinking, and
// a daily budget for Meta, the only one that bills

type Sent = {
  host: string
  max_completion_tokens: number
  reasoning_effort: string
}
let sent: Sent[] = []
// What each host answers: a content and the tokens used
let replies: Record<string, { content: string; prompt: number; out: number }>
const realFetch = globalThis.fetch
globalThis.fetch = (input: RequestInfo | URL, init?: RequestInit) => {
  const url = new URL(input instanceof Request ? input.url : String(input))
  const reply = replies[url.hostname]
  if (!reply) return realFetch(input, init)
  sent.push({ host: url.hostname, ...JSON.parse(String(init?.body)) })
  return Promise.resolve(
    new Response(JSON.stringify({
      choices: [{ message: { content: reply.content } }],
      usage: {
        prompt_tokens: reply.prompt,
        completion_tokens: reply.out,
        total_tokens: reply.prompt + reply.out,
      },
    })),
  )
}

const setup = () => {
  resetModels()
  sent = []
  Deno.env.delete('AI_DAILY_BUDGET')
  Deno.env.delete('GEMINI_API_KEY')
  Deno.env.set('META_API_KEY', 'test-key')
  Deno.env.set('GROQ_API_KEY', 'test-key')
  replies = {
    'api.meta.ai': { content: 'Meta', prompt: 1000, out: 100 },
    'api.groq.com': { content: 'Groq', prompt: 1000, out: 100 },
  }
}
const ask = () =>
  chat([{ role: 'user', content: 'Bonjour' }], { use: 'test', maxTokens: 400 })

Deno.test('models: a ceiling and as little thinking as each one allows', async () => {
  setup()
  assertEquals(await ask(), 'Meta')
  assertEquals(sent[0].max_completion_tokens, 400)
  assertEquals(sent[0].reasoning_effort, 'minimal')
  // 1 000 tokens in, 100 out, at the price of Muse Spark
  assertEquals(spentToday('meta'), 0.001675)
  // Groq knows no « minimal »
  Deno.env.delete('META_API_KEY')
  await ask()
  assertEquals(sent[1].reasoning_effort, 'low')
})

Deno.test('models: past its daily budget, Meta leaves the free ones answer', async () => {
  setup()
  // 0.85 $ a call: the second one passes the dollar
  replies['api.meta.ai'] = { content: 'Meta', prompt: 0, out: 200_000 }
  assertEquals(await ask(), 'Meta')
  assertEquals(await ask(), 'Meta')
  assertEquals(await ask(), 'Groq')
  assertEquals(sent.map((s) => s.host), [
    'api.meta.ai',
    'api.meta.ai',
    'api.groq.com',
  ])
  // A budget set to 0 keeps Meta out from the start
  setup()
  Deno.env.set('AI_DAILY_BUDGET', '0')
  assertEquals(await ask(), 'Groq')
  Deno.env.delete('AI_DAILY_BUDGET')
})

Deno.test('models: an answer cut at its ceiling goes to the next, without rest', async () => {
  setup()
  replies['api.meta.ai'] = { content: '', prompt: 10, out: 400 }
  assertEquals(await ask(), 'Groq')
  // The question was too long for Meta, not Meta down: tried again
  replies['api.meta.ai'].content = 'Meta'
  assertEquals(await ask(), 'Meta')
  // Nothing anywhere: the caller falls back
  replies['api.meta.ai'].content = ''
  replies['api.groq.com'].content = ''
  await assertRejects(ask)
})
