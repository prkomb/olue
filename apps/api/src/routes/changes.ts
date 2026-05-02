import type { FastifyInstance } from 'fastify'
import { changes } from './_seed.js'

interface Query {
  competitorId?: string
  limit?: string
}

interface ReadBody {
  read: boolean
}

export async function changesRoutes(app: FastifyInstance) {
  app.get<{ Querystring: Query }>('/changes', async (req) => {
    const { competitorId, limit } = req.query
    let result = changes
    if (competitorId) result = result.filter((c) => c.competitorId === competitorId)
    if (limit) {
      const n = Number.parseInt(limit, 10)
      if (Number.isFinite(n) && n > 0) result = result.slice(0, n)
    }
    return result
  })

  app.patch<{ Params: { id: string }; Body: ReadBody }>(
    '/changes/:id/read',
    async (req, reply) => {
      const change = changes.find((c) => c.id === req.params.id)
      if (!change) return reply.code(404).send({ error: 'Not found' })
      change.read = !!req.body?.read
      return change
    },
  )

  app.post<{ Querystring: { competitorId?: string }; Body?: ReadBody }>(
    '/changes/read-all',
    async (req) => {
      const competitorId = req.query.competitorId
      const target = req.body?.read ?? true
      let updated = 0
      for (const c of changes) {
        if (competitorId && c.competitorId !== competitorId) continue
        if (c.read !== target) {
          c.read = target
          updated++
        }
      }
      return { updated }
    },
  )
}
