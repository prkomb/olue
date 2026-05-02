import OpenAI from 'openai'
import { config } from '../../config.js'

const client = new OpenAI({
  apiKey: config.OPENROUTER_API_KEY,
  baseURL: config.OPENROUTER_BASE_URL,
  defaultHeaders: {
    'HTTP-Referer': 'https://github.com/olue',
    'X-Title': 'olue',
  },
})

const MAX_RETRIES = 3

const sleep = (ms: number) => new Promise<void>((r) => setTimeout(r, ms))

export interface ChatJsonOpts {
  model: string
  system: string
  user: string
  temperature?: number
  maxTokens?: number
}

export async function chatJson<T>(opts: ChatJsonOpts): Promise<T> {
  let attempt = 0
  while (true) {
    try {
      const res = await client.chat.completions.create({
        model: opts.model,
        temperature: opts.temperature ?? 0.1,
        max_tokens: opts.maxTokens ?? 4096,
        response_format: { type: 'json_object' },
        messages: [
          { role: 'system', content: opts.system },
          { role: 'user', content: opts.user },
        ],
      })
      const raw = res.choices[0]?.message?.content
      if (!raw) throw new Error('empty completion')
      return JSON.parse(raw) as T
    } catch (err) {
      attempt++
      const status = (err as { status?: number })?.status
      const retryable = status === 429 || (status !== undefined && status >= 500)
      if (!retryable || attempt > MAX_RETRIES) throw err
      await sleep(2 ** attempt * 500)
    }
  }
}
