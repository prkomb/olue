import type { FastifyInstance } from 'fastify'
import { randomUUID } from 'node:crypto'
import { z } from 'zod'
import * as competitorsRepo from '../db/repositories/competitors.js'
import * as runsRepo from '../db/repositories/runs.js'
import * as pagesRepo from '../db/repositories/pages.js'
import * as chunksRepo from '../db/repositories/chunks.js'
import * as changesRepo from '../db/repositories/changes.js'
import {
  CompetitorInputSchema,
  CompetitorUpdateSchema,
  type Competitor,
  type Source,
} from '../schemas/competitor.js'
import { runCrawl } from '../services/pipeline/run-crawl.js'

const ParamsSchema = z.object({ id: z.string().min(1) })

const normalizeSources = (input?: { id?: string; label: string; url: string }[]): Source[] =>
  (input ?? [])
    .filter((s) => s.label?.trim() && s.url?.trim())
    .map((s) => ({
      id: s.id ?? randomUUID(),
      kind: 'other' as const,
      label: s.label.trim(),
      url: s.url.trim(),
    }))

const cleanString = (v: unknown): string | undefined => {
  if (typeof v !== 'string') return undefined
  const t = v.trim()
  return t.length > 0 ? t : undefined
}

export async function competitorsRoutes(app: FastifyInstance) {
  app.get('/competitors', async () => competitorsRepo.listAll())

  app.get('/competitors/:id', async (req, reply) => {
    const { id } = ParamsSchema.parse(req.params)
    const found = await competitorsRepo.findById(id)
    if (!found) return reply.code(404).send({ code: 'NOT_FOUND', message: 'Competitor not found' })
    return found
  })

  app.post('/competitors', async (req, reply) => {
    const parsed = CompetitorInputSchema.safeParse(req.body)
    if (!parsed.success) {
      return reply.code(400).send({
        code: 'BAD_REQUEST',
        message: parsed.error.issues.map((i) => `${i.path.join('.')}: ${i.message}`).join('; '),
      })
    }
    const input = parsed.data
    const created: Competitor = {
      id: randomUUID(),
      name: input.name.trim(),
      website: input.website.trim(),
      otherSources: normalizeSources(input.otherSources),
      createdAt: new Date().toISOString(),
    }
    await competitorsRepo.create(created)
    await runsRepo.start(created.id)
    void runCrawl(created.id).catch((err) => {
      app.log.error({ err, competitorId: created.id }, 'auto-discover crashed')
    })
    return reply.code(201).send(created)
  })

  app.patch('/competitors/:id', async (req, reply) => {
    const { id } = ParamsSchema.parse(req.params)
    const parsed = CompetitorUpdateSchema.safeParse(req.body)
    if (!parsed.success) {
      return reply.code(400).send({
        code: 'BAD_REQUEST',
        message: parsed.error.issues.map((i) => `${i.path.join('.')}: ${i.message}`).join('; '),
      })
    }
    const current = await competitorsRepo.findById(id)
    if (!current) return reply.code(404).send({ code: 'NOT_FOUND', message: 'Competitor not found' })

    const body = parsed.data
    const next: Competitor = {
      ...current,
      name: cleanString(body.name) ?? current.name,
      website: cleanString(body.website) ?? current.website,
      otherSources:
        'otherSources' in body ? normalizeSources(body.otherSources) : current.otherSources,
    }
    await competitorsRepo.update(id, next)
    return next
  })

  app.delete('/competitors/:id', async (req, reply) => {
    const { id } = ParamsSchema.parse(req.params)
    const removed = await competitorsRepo.remove(id)
    if (!removed) return reply.code(404).send({ code: 'NOT_FOUND', message: 'Competitor not found' })
    await Promise.all([
      runsRepo.remove(id),
      chunksRepo.deleteByCompetitor(id),
      pagesRepo.deleteByCompetitor(id),
      changesRepo.deleteByCompetitor(id),
    ])
    return { ok: true }
  })

  app.get('/competitors/:id/run', async (req, reply) => {
    const { id } = ParamsSchema.parse(req.params)
    if (!(await competitorsRepo.exists(id))) {
      return reply.code(404).send({ code: 'NOT_FOUND', message: 'Competitor not found' })
    }
    return runsRepo.get(id)
  })

  app.post('/competitors/:id/run', async (req, reply) => {
    const { id } = ParamsSchema.parse(req.params)
    if (!(await competitorsRepo.exists(id))) {
      return reply.code(404).send({ code: 'NOT_FOUND', message: 'Competitor not found' })
    }
    const current = await runsRepo.get(id)
    if (current.running) {
      return reply.code(409).send({ code: 'CONFLICT', message: 'Already running', ...current })
    }
    const started = await runsRepo.start(id)
    void runCrawl(id).catch((err) => {
      app.log.error({ err, competitorId: id }, 'pipeline crashed')
    })
    return reply.code(202).send(started)
  })
}
