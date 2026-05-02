import OpenAI from 'openai'
import pLimit from 'p-limit'
import { config } from '../../config.js'

const client = new OpenAI({
  apiKey: config.OPENROUTER_API_KEY,
  baseURL: config.OPENROUTER_BASE_URL,
  defaultHeaders: {
    'HTTP-Referer': 'https://github.com/olue',
    'X-Title': 'olue',
  },
})

const BATCH_SIZE = 64
const MAX_RETRIES = 4

const sleep = (ms: number) => new Promise<void>((r) => setTimeout(r, ms))

async function embedBatch(inputs: string[]): Promise<number[][]> {
  let attempt = 0
  while (true) {
    try {
      const res = await client.embeddings.create({
        model: config.EMBEDDING_MODEL,
        input: inputs,
        dimensions: config.EMBEDDING_DIMS,
      })
      return res.data.map((d) => d.embedding)
    } catch (err) {
      attempt++
      const status = (err as { status?: number })?.status
      const retryable = status === 429 || (status !== undefined && status >= 500)
      if (!retryable || attempt > MAX_RETRIES) throw err
      const delay = Math.min(2 ** attempt * 500, 8_000)
      await sleep(delay)
    }
  }
}

export async function embedAll(texts: string[]): Promise<number[][]> {
  if (texts.length === 0) return []
  const limit = pLimit(2)
  const batches: Promise<number[][]>[] = []
  for (let i = 0; i < texts.length; i += BATCH_SIZE) {
    const slice = texts.slice(i, i + BATCH_SIZE)
    batches.push(limit(() => embedBatch(slice)))
  }
  const results = await Promise.all(batches)
  return results.flat()
}

export async function embedOne(text: string): Promise<number[]> {
  const [v] = await embedBatch([text])
  return v
}
