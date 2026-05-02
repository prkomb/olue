import type { FastifyInstance } from 'fastify'
import { z } from 'zod'
import { config } from '../config.js'
import { retrieveContext, buildSystemPrompt } from '../services/rag/retrieve.js'
import { chatStream } from '../services/openrouter/chat-stream.js'

const MessageSchema = z.object({
  role: z.enum(['user', 'assistant']),
  content: z.string().min(1),
})

const BodySchema = z.object({
  competitorIds: z.array(z.string().min(1)).min(1),
  pageIds: z.array(z.string().min(1)).optional(),
  messages: z.array(MessageSchema).min(1),
})

const writeEvent = (raw: NodeJS.WritableStream, event: string, data: unknown) => {
  raw.write(`event: ${event}\n`)
  raw.write(`data: ${JSON.stringify(data)}\n\n`)
}

export async function chatRoutes(app: FastifyInstance) {
  app.post('/chat', async (req, reply) => {
    const parsed = BodySchema.safeParse(req.body)
    if (!parsed.success) {
      return reply
        .code(400)
        .send({ code: 'BAD_REQUEST', message: parsed.error.issues[0]?.message ?? 'invalid body' })
    }

    const { competitorIds, pageIds, messages } = parsed.data
    const lastUser = [...messages].reverse().find((m) => m.role === 'user')
    if (!lastUser) {
      return reply
        .code(400)
        .send({ code: 'BAD_REQUEST', message: 'messages must contain at least one user message' })
    }

    reply.raw.writeHead(200, {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache, no-transform',
      Connection: 'keep-alive',
      'X-Accel-Buffering': 'no',
    })
    reply.hijack()

    const ac = new AbortController()
    const onSocketClose = () => ac.abort()
    reply.raw.on('close', onSocketClose)

    try {
      const ctx = await retrieveContext({
        query: lastUser.content,
        competitorIds,
        pageIds,
        topK: 8,
      })

      const sources = ctx.chunks.map((c) => ({
        pageId: c.pageId,
        competitorId: c.competitorId,
        url: c.url,
        title: c.title,
        headingPath: c.headingPath,
        score: c.score,
      }))
      writeEvent(reply.raw, 'sources', sources)

      const system = buildSystemPrompt(ctx)

      for await (const token of chatStream({
        model: config.CHAT_MODEL,
        system,
        messages,
        signal: ac.signal,
      })) {
        writeEvent(reply.raw, 'token', { text: token })
      }

      writeEvent(reply.raw, 'done', {})
    } catch (err) {
      if (ac.signal.aborted) {
        // client disconnected or pressed stop — quiet exit
      } else {
        const message = err instanceof Error ? err.message : 'chat failed'
        app.log.error({ err }, 'chat stream error')
        try {
          writeEvent(reply.raw, 'error', { message })
        } catch {
          // socket already closed
        }
      }
    } finally {
      reply.raw.off('close', onSocketClose)
      try {
        reply.raw.end()
      } catch {
        // already ended
      }
    }
  })
}
