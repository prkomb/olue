import { embedOne } from '../embedding/client.js'
import * as chunksRepo from '../../db/repositories/chunks.js'
import * as pagesRepo from '../../db/repositories/pages.js'
import * as competitorsRepo from '../../db/repositories/competitors.js'
import * as changesRepo from '../../db/repositories/changes.js'
import type { Competitor } from '../../schemas/competitor.js'
import type { Page } from '../../schemas/page.js'
import type { Change } from '../../schemas/change.js'

export interface RetrievedChunk {
  pageId: string
  competitorId: string
  url: string
  title: string
  headingPath: string[]
  text: string
  score: number
}

export interface RetrievedContext {
  chunks: RetrievedChunk[]
  pages: Page[]
  competitors: Competitor[]
  changes: Change[]
}

export interface RetrieveOpts {
  query: string
  competitorIds: string[]
  pageIds?: string[]
  topK?: number
  recentChangesLimit?: number
}

export async function retrieveContext(opts: RetrieveOpts): Promise<RetrievedContext> {
  const topK = opts.topK ?? 8
  const recentChangesLimit = opts.recentChangesLimit ?? 20

  const queryVector = await embedOne(opts.query)

  const filter = {
    competitorId: opts.competitorIds,
    ...(opts.pageIds && opts.pageIds.length > 0 ? { pageId: opts.pageIds } : {}),
  }

  const [hits, competitorDocs, recentChanges] = await Promise.all([
    chunksRepo.vectorSearch(queryVector, filter, {
      numCandidates: Math.max(50, topK * 10),
      limit: topK,
    }),
    Promise.all(opts.competitorIds.map((id) => competitorsRepo.findById(id))).then((arr) =>
      arr.filter((c): c is Competitor => c !== null),
    ),
    changesRepo.list({
      competitorIds: opts.competitorIds,
      ...(opts.pageIds && opts.pageIds.length > 0 ? { pageIds: opts.pageIds } : {}),
      limit: recentChangesLimit,
    }),
  ])

  const pageIds = Array.from(new Set(hits.map((h) => h.pageId)))
  const pages = await pagesRepo.listByIds(pageIds)
  const pageById = new Map(pages.map((p) => [p.id, p]))

  const chunks: RetrievedChunk[] = hits.map((h) => {
    const page = pageById.get(h.pageId)
    return {
      pageId: h.pageId,
      competitorId: h.competitorId,
      url: page?.url ?? '',
      title: page?.title ?? page?.url ?? '(untitled)',
      headingPath: h.headingPath,
      text: h.text,
      score: h.score,
    }
  })

  return { chunks, pages, competitors: competitorDocs, changes: recentChanges }
}

export function buildSystemPrompt(ctx: RetrievedContext): string {
  const competitorBlock = ctx.competitors
    .map((c) => `- ${c.name} — ${c.website}`)
    .join('\n')

  const competitorById = new Map(ctx.competitors.map((c) => [c.id, c]))

  const chunkBlock = ctx.chunks.length
    ? ctx.chunks
        .map((c, i) => {
          const competitor = competitorById.get(c.competitorId)?.name ?? c.competitorId
          const heading = c.headingPath.length ? c.headingPath.join(' > ') : '(top)'
          return `[${i + 1}] ${competitor} — ${c.title} (${c.url})\n  heading: ${heading}\n  ${c.text.replace(/\s+/g, ' ').slice(0, 1200)}`
        })
        .join('\n\n')
    : '(no relevant page content found)'

  const changeBlock = ctx.changes.length
    ? ctx.changes
        .slice(0, 12)
        .map((ch, i) => {
          const competitor = competitorById.get(ch.competitorId)?.name ?? ch.competitorId
          const summary = ch.summary || (ch.diffAfter ?? '').slice(0, 300)
          return `(${i + 1}) ${competitor} • ${ch.category}/${ch.severity} • ${ch.detectedAt.slice(0, 10)} — ${summary}`
        })
        .join('\n')
    : '(no recent changes)'

  return [
    'You are a competitive-intelligence analyst answering questions about tracked competitors.',
    'You ground every answer in the SOURCES below — cite them inline using bracketed numbers like [1], [3].',
    'If the sources do not contain enough information, say so plainly. Do not fabricate facts.',
    'Be concise: short paragraphs, bullet lists when helpful, no filler.',
    '',
    'COMPETITORS IN SCOPE:',
    competitorBlock || '(none)',
    '',
    'SOURCES (page chunks ranked by relevance):',
    chunkBlock,
    '',
    'RECENT DETECTED CHANGES:',
    changeBlock,
  ].join('\n')
}
