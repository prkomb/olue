import type { FastifyInstance } from 'fastify'
import { randomUUID } from 'node:crypto'
import {
  changes,
  competitors,
  type Category,
  type Change,
  type Competitor,
  type Severity,
  type Source,
  type SourceKind,
} from './_seed.js'

type RunState = {
  running: boolean
  startedAt: string | null
  finishedAt: string | null
}

const runs = new Map<string, RunState>()
const RUN_DURATION_MS = 3500

const getRunState = (id: string): RunState =>
  runs.get(id) ?? { running: false, startedAt: null, finishedAt: null }

const synthesizeChange = (competitorId: string): Change => {
  const samples: Array<{ category: Category; severity: Severity; summary: string }> = [
    { category: 'product', severity: 'medium', summary: 'New "What\'s new" entry detected on the changelog page.' },
    { category: 'pricing', severity: 'high', summary: 'Pricing table reordered — Enterprise tier moved to first position.' },
    { category: 'messaging', severity: 'low', summary: 'Hero subheadline tweaked; CTA copy unchanged.' },
    { category: 'hiring', severity: 'medium', summary: 'Three new senior engineering roles added to the careers page.' },
  ]
  const pick = samples[Math.floor(Math.random() * samples.length)]
  return {
    id: randomUUID(),
    competitorId,
    sourceId: 'manual-run',
    sourceLabel: 'Manual run',
    category: pick.category,
    severity: pick.severity,
    summary: pick.summary,
    detectedAt: new Date().toISOString(),
    read: false,
  }
}

interface OtherSourceInput {
  id?: string
  label: string
  url: string
}

interface CompetitorInput {
  name: string
  website: string
  linkedin?: string
  otherSources?: OtherSourceInput[]
}

const normalizeOtherSources = (input?: OtherSourceInput[]): Source[] =>
  (input ?? [])
    .filter((s) => s.label?.trim() && s.url?.trim())
    .map((s) => ({
      id: s.id ?? randomUUID(),
      kind: 'other' as SourceKind,
      label: s.label.trim(),
      url: s.url.trim(),
    }))

const cleanString = (v: unknown): string | undefined => {
  if (typeof v !== 'string') return undefined
  const t = v.trim()
  return t.length > 0 ? t : undefined
}

export async function competitorsRoutes(app: FastifyInstance) {
  app.get('/competitors', async () => competitors)

  app.get<{ Params: { id: string } }>('/competitors/:id', async (req, reply) => {
    const found = competitors.find((c) => c.id === req.params.id)
    if (!found) return reply.code(404).send({ error: 'Not found' })
    return found
  })

  app.post<{ Body: CompetitorInput }>('/competitors', async (req, reply) => {
    const { name, website } = req.body ?? ({} as CompetitorInput)
    if (!name?.trim() || !website?.trim()) {
      return reply.code(400).send({ error: 'name and website are required' })
    }
    const created: Competitor = {
      id: randomUUID(),
      name: name.trim(),
      website: website.trim(),
      linkedin: cleanString(req.body.linkedin),
      otherSources: normalizeOtherSources(req.body.otherSources),
      createdAt: new Date().toISOString(),
    }
    competitors.unshift(created)
    return reply.code(201).send(created)
  })

  app.patch<{ Params: { id: string }; Body: Partial<CompetitorInput> }>(
    '/competitors/:id',
    async (req, reply) => {
      const idx = competitors.findIndex((c) => c.id === req.params.id)
      if (idx === -1) return reply.code(404).send({ error: 'Not found' })
      const current = competitors[idx]
      const next: Competitor = {
        ...current,
        name: cleanString(req.body.name) ?? current.name,
        website: cleanString(req.body.website) ?? current.website,
        linkedin: 'linkedin' in req.body ? cleanString(req.body.linkedin) : current.linkedin,
        otherSources:
          'otherSources' in req.body
            ? normalizeOtherSources(req.body.otherSources)
            : current.otherSources,
      }
      competitors[idx] = next
      return next
    },
  )

  app.delete<{ Params: { id: string } }>('/competitors/:id', async (req, reply) => {
    const idx = competitors.findIndex((c) => c.id === req.params.id)
    if (idx === -1) return reply.code(404).send({ error: 'Not found' })
    competitors.splice(idx, 1)
    runs.delete(req.params.id)
    return { ok: true }
  })

  app.get<{ Params: { id: string } }>('/competitors/:id/run', async (req, reply) => {
    const exists = competitors.some((c) => c.id === req.params.id)
    if (!exists) return reply.code(404).send({ error: 'Not found' })
    return getRunState(req.params.id)
  })

  app.post<{ Params: { id: string } }>('/competitors/:id/run', async (req, reply) => {
    const { id } = req.params
    const exists = competitors.some((c) => c.id === id)
    if (!exists) return reply.code(404).send({ error: 'Not found' })

    const current = getRunState(id)
    if (current.running) return reply.code(409).send({ error: 'Already running', ...current })

    const next: RunState = {
      running: true,
      startedAt: new Date().toISOString(),
      finishedAt: null,
    }
    runs.set(id, next)

    setTimeout(() => {
      if (Math.random() < 0.6) {
        const change = synthesizeChange(id)
        changes.unshift(change)
      }
      runs.set(id, {
        running: false,
        startedAt: next.startedAt,
        finishedAt: new Date().toISOString(),
      })
    }, RUN_DURATION_MS)

    return reply.code(202).send(next)
  })
}
