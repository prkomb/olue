import { openrouter } from './client.js'

export interface ChatStreamMessage {
  role: 'user' | 'assistant'
  content: string
}

export interface ChatStreamOpts {
  model: string
  system: string
  messages: ChatStreamMessage[]
  temperature?: number
  maxTokens?: number
  signal?: AbortSignal
}

export async function* chatStream(opts: ChatStreamOpts): AsyncIterable<string> {
  const stream = await openrouter.chat.completions.create(
    {
      model: opts.model,
      temperature: opts.temperature ?? 0.3,
      max_tokens: opts.maxTokens ?? 1024,
      stream: true,
      messages: [
        { role: 'system', content: opts.system },
        ...opts.messages,
      ],
    },
    { signal: opts.signal },
  )

  for await (const chunk of stream) {
    const delta = chunk.choices[0]?.delta?.content
    if (delta) yield delta
  }
}
