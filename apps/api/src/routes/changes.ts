import type { FastifyInstance } from 'fastify'
import { z } from 'zod'

import * as changesRepo from '../db/repositories/changes.js'

const QuerySchema = z.object({
  competitorId: z.string().optional(),
  pageId: z.string().optional(),
  limit: z.coerce.number().int().positive().max(500).optional(),
})

const ReadBodySchema = z.object({ read: z.boolean() })

const ParamsSchema = z.object({ id: z.string().min(1) })

export async function changesRoutes(app: FastifyInstance) {
  app.get('/changes', async (req) => {
    const q = QuerySchema.parse(req.query)
    return changesRepo.list({ competitorId: q.competitorId, pageId: q.pageId, limit: q.limit })
  })

  app.patch('/changes/:id/read', async (req, reply) => {
    const { id } = ParamsSchema.parse(req.params)
    const body = ReadBodySchema.safeParse(req.body)
    if (!body.success) return reply.code(400).send({ code: 'BAD_REQUEST', message: 'read:boolean required' })
    const updated = await changesRepo.setRead(id, body.data.read)
    if (!updated) return reply.code(404).send({ code: 'NOT_FOUND', message: 'Change not found' })
    return updated
  })

  app.post('/changes/read-all', async (req) => {
    const competitorId = (req.query as { competitorId?: string })?.competitorId
    const target = ((req.body as { read?: boolean })?.read) ?? true
    const updated = await changesRepo.setReadAll(competitorId, target)
    return { updated }
  })
}
