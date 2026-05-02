import type { FastifyInstance } from 'fastify'
import { z } from 'zod'

import * as chunksRepo from '../db/repositories/chunks.js'
import * as competitorsRepo from '../db/repositories/competitors.js'
import * as pagesRepo from '../db/repositories/pages.js'
import * as runsRepo from '../db/repositories/runs.js'
import { isUrlSafe } from '../security/ssrf.js'
import { runSingleUrl } from '../services/pipeline/run-single.js'

const ParamsSchema = z.object({ id: z.string().min(1) })
const PageParamsSchema = z.object({ id: z.string().min(1), pageId: z.string().min(1) })
const AddBodySchema = z.object({ url: z.string().min(1) })
const IgnoreBodySchema = z.object({ ignored: z.boolean() })

export async function pagesRoutes(app: FastifyInstance) {
  app.get('/pages', async () => pagesRepo.listAll())

  app.get('/competitors/:id/pages', async (req, reply) => {
    const { id } = ParamsSchema.parse(req.params)
    if (!(await competitorsRepo.exists(id))) {
      return reply.code(404).send({ code: 'NOT_FOUND', message: 'Competitor not found' })
    }
    return pagesRepo.listByCompetitor(id)
  })

  app.post('/competitors/:id/pages', async (req, reply) => {
    const { id } = ParamsSchema.parse(req.params)
    const body = AddBodySchema.safeParse(req.body)
    if (!body.success) {
      return reply.code(400).send({ code: 'BAD_REQUEST', message: 'url required' })
    }
    if (!isUrlSafe(body.data.url)) {
      return reply.code(400).send({ code: 'BAD_REQUEST', message: 'unsafe or invalid url' })
    }
    if (!(await competitorsRepo.exists(id))) {
      return reply.code(404).send({ code: 'NOT_FOUND', message: 'Competitor not found' })
    }
    const current = await runsRepo.get(id)
    if (current.running) {
      return reply.code(409).send({ code: 'CONFLICT', message: 'Run already in progress', ...current })
    }
    const { sha256Short } = await import('../utils/hash.js')
    const urlHash = sha256Short(body.data.url)
    const existing = await pagesRepo.findByCompetitorAndUrlHash(id, urlHash)
    if (existing) {
      if (!existing.pinned) {
        await pagesRepo.upsert({ ...existing, pinned: true })
      }
    } else {
      const { randomUUID } = await import('node:crypto')
      await pagesRepo.upsert({
        id: randomUUID(),
        competitorId: id,
        url: body.data.url,
        urlHash,
        markdown: '',
        contentHash: '',
        fetchedAt: new Date().toISOString(),
        status: 'ok',
        pinned: true,
      })
    }
    const started = await runsRepo.start(id)
    void runSingleUrl(id, body.data.url).catch((err) => {
      app.log.error({ err, id, url: body.data.url }, 'add-page run crashed')
    })
    return reply.code(202).send(started)
  })

  app.patch('/competitors/:id/pages/:pageId', async (req, reply) => {
    const { id, pageId } = PageParamsSchema.parse(req.params)
    const body = AddBodySchema.safeParse(req.body)
    if (!body.success) return reply.code(400).send({ code: 'BAD_REQUEST', message: 'url required' })
    if (!isUrlSafe(body.data.url)) {
      return reply.code(400).send({ code: 'BAD_REQUEST', message: 'unsafe or invalid url' })
    }
    const page = await pagesRepo.findById(pageId)
    if (!page || page.competitorId !== id) {
      return reply.code(404).send({ code: 'NOT_FOUND', message: 'Page not found' })
    }
    const current = await runsRepo.get(id)
    if (current.running) {
      return reply.code(409).send({ code: 'CONFLICT', message: 'Run already in progress', ...current })
    }
    const { sha256Short } = await import('../utils/hash.js')
    const newHash = sha256Short(body.data.url)
    await chunksRepo.deleteByPage(pageId)
    await pagesRepo.updateUrl(pageId, body.data.url, newHash)
    const started = await runsRepo.start(id)
    void runSingleUrl(id, body.data.url).catch((err) => {
      app.log.error({ err, id, pageId }, 'edit-url run crashed')
    })
    return reply.code(202).send(started)
  })

  app.delete('/competitors/:id/pages/:pageId', async (req, reply) => {
    const { id, pageId } = PageParamsSchema.parse(req.params)
    const page = await pagesRepo.findById(pageId)
    if (!page || page.competitorId !== id) {
      return reply.code(404).send({ code: 'NOT_FOUND', message: 'Page not found' })
    }
    await chunksRepo.deleteByPage(pageId)
    await pagesRepo.deleteById(pageId)
    return { ok: true }
  })

  app.patch('/competitors/:id/pages/:pageId/ignored', async (req, reply) => {
    const { id, pageId } = PageParamsSchema.parse(req.params)
    const body = IgnoreBodySchema.safeParse(req.body)
    if (!body.success) {
      return reply.code(400).send({ code: 'BAD_REQUEST', message: 'ignored:boolean required' })
    }
    const page = await pagesRepo.findById(pageId)
    if (!page || page.competitorId !== id) {
      return reply.code(404).send({ code: 'NOT_FOUND', message: 'Page not found' })
    }
    const updated = await pagesRepo.setIgnored(pageId, body.data.ignored)
    if (!updated) return reply.code(404).send({ code: 'NOT_FOUND', message: 'Page not found' })
    return updated
  })

  app.post('/competitors/:id/pages/:pageId/recheck', async (req, reply) => {
    const { id, pageId } = PageParamsSchema.parse(req.params)
    const page = await pagesRepo.findById(pageId)
    if (!page || page.competitorId !== id) {
      return reply.code(404).send({ code: 'NOT_FOUND', message: 'Page not found' })
    }
    const current = await runsRepo.get(id)
    if (current.running) {
      return reply.code(409).send({ code: 'CONFLICT', message: 'Run already in progress', ...current })
    }
    const started = await runsRepo.start(id)
    void runSingleUrl(id, page.url).catch((err) => {
      app.log.error({ err, id, pageId }, 'recheck run crashed')
    })
    return reply.code(202).send(started)
  })
}
