import { randomUUID } from 'node:crypto'
import pLimit from 'p-limit'
import { config } from '../../config.js'
import * as changesRepo from '../../db/repositories/changes.js'
import * as chunksRepo from '../../db/repositories/chunks.js'
import * as competitorsRepo from '../../db/repositories/competitors.js'
import * as pagesRepo from '../../db/repositories/pages.js'
import * as runsRepo from '../../db/repositories/runs.js'
import type { Change } from '../../schemas/change.js'
import type { Competitor } from '../../schemas/competitor.js'
import type { Chunk, Page } from '../../schemas/page.js'
import { sha256, sha256Short } from '../../utils/hash.js'
import { extract } from '../crawl/extractor.js'
import { fetchHtml } from '../crawl/fetcher.js'
import { rankPages } from '../crawl/page-ranker.js'
import { discoverUrls } from '../crawl/sitemap.js'
import { diffChunks, type DiffEntry } from '../diff/detector.js'
import { judgeNumericChange } from '../diff/numeric-judge.js'
import { summarize, type Summary } from '../diff/summarizer.js'
import { buildOriginUrl } from '../diff/text-fragment.js'
import { buildVisualDiff } from '../diff/visual-diff.js'
import { chunkMarkdown } from '../embedding/chunker.js'
import { embedAll } from '../embedding/client.js'

interface ProcessOutcome {
  url: string
  pageId: string
  changedChange?: Change
  status: 'unchanged' | 'first-snapshot' | 'changed' | 'failed'
  reason?: string
}

export async function runCrawl(competitorId: string): Promise<void> {
  const competitor = await competitorsRepo.findById(competitorId)
  if (!competitor) {
    await runsRepo.fail(competitorId, 'competitor not found')
    return
  }

  try {
    await runsRepo.setProgress(competitorId, { stage: 'discover', done: 0, total: 0 })
    const { urls } = await discoverUrls(competitor.website)

    const existingPages = await pagesRepo.listByCompetitor(competitorId)
    const pinnedUrls = existingPages.filter((p) => p.pinned).map((p) => p.url)

    const explicit = uniqueUrls([
      competitor.website,
      ...(competitor.otherSources ?? []).map((s) => s.url).filter(isHttp),
      ...pinnedUrls,
    ])
    const candidates = uniqueUrls([...explicit, ...urls])

    await runsRepo.setProgress(competitorId, { stage: 'rank', done: 0, total: candidates.length })
    const picked = await rankPages({
      competitorName: competitor.name,
      websiteUrl: competitor.website,
      candidates,
      limit: config.MAX_PAGES_PER_RUN,
    })
    const targets = uniqueUrls([...explicit, ...picked]).slice(0, config.MAX_PAGES_PER_RUN)

    if (targets.length === 0) {
      await runsRepo.finish(competitorId, { changesEmitted: 0 })
      return
    }

    const total = targets.length
    let done = 0
    let changesEmitted = 0
    const limit = pLimit(config.CRAWL_CONCURRENCY)

    const tasks = targets.map((url) =>
      limit(async () => {
        const outcome = await processUrl(competitor, url).catch(
          (err): ProcessOutcome => ({
            url,
            pageId: '',
            status: 'failed',
            reason: err instanceof Error ? err.message : String(err),
          }),
        )
        if (outcome.status === 'changed' && outcome.changedChange) {
          changesEmitted++
        }
        done++
        await runsRepo.setProgress(competitorId, { stage: 'fetch', done, total })
        return outcome
      }),
    )

    await Promise.all(tasks)

    await runsRepo.finish(competitorId, { changesEmitted })
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err)
    await runsRepo.fail(competitorId, message)
  }
}

export async function processUrl(competitor: Competitor, url: string): Promise<ProcessOutcome> {
  const urlHash = sha256Short(url)
  const fetched = await fetchHtml(url)
  if (!fetched.ok) {
    const existing = await pagesRepo.findByCompetitorAndUrlHash(competitor.id, urlHash)
    const failedPage: Page = {
      id: existing?.id ?? randomUUID(),
      competitorId: competitor.id,
      url,
      urlHash,
      title: existing?.title,
      markdown: existing?.markdown ?? '',
      contentHash: existing?.contentHash ?? '',
      fetchedAt: new Date().toISOString(),
      status: 'failed',
      httpStatus: fetched.httpStatus,
      degradedReason: fetched.reason,
      via: 'none',
    }
    await pagesRepo.upsert(failedPage)
    return { url, pageId: failedPage.id, status: 'failed', reason: fetched.reason }
  }

  const extracted = await extract(fetched.html, fetched.finalUrl)
  if (extracted.textLength < 200) {
    const degraded: Page = {
      id: randomUUID(),
      competitorId: competitor.id,
      url,
      urlHash,
      title: extracted.title,
      markdown: extracted.markdown,
      contentHash: sha256(extracted.markdown),
      fetchedAt: new Date().toISOString(),
      status: 'degraded',
      httpStatus: fetched.httpStatus,
      degradedReason: 'extracted text too short',
      via: fetched.via,
    }
    await pagesRepo.upsert(degraded)
    return { url, pageId: degraded.id, status: 'failed', reason: 'thin extraction' }
  }

  const newContentHash = sha256(extracted.markdown)
  const existing = await pagesRepo.findByCompetitorAndUrlHash(competitor.id, urlHash)
  const isFirstSnapshot = !existing

  if (existing && existing.contentHash === newContentHash && existing.contentHash !== '') {
    await pagesRepo.upsert({
      ...existing,
      title: extracted.title,
      fetchedAt: new Date().toISOString(),
      status: extracted.textLength < 800 ? 'degraded' : 'ok',
      httpStatus: fetched.httpStatus,
      degradedReason: fetched.reason,
      via: fetched.via,
    })
    return { url, pageId: existing.id, status: 'unchanged' }
  }

  const pageId = existing?.id ?? randomUUID()

  const rawChunks = chunkMarkdown(extracted.markdown, extracted.title)
  if (rawChunks.length === 0) {
    const noChunkPage: Page = {
      id: pageId,
      competitorId: competitor.id,
      url,
      urlHash,
      title: extracted.title,
      markdown: extracted.markdown,
      contentHash: newContentHash,
      fetchedAt: new Date().toISOString(),
      status: 'degraded',
      httpStatus: fetched.httpStatus,
      degradedReason: 'no chunks produced',
      via: fetched.via,
    }
    await pagesRepo.upsert(noChunkPage)
    return { url, pageId, status: 'failed', reason: 'no chunks' }
  }

  const embeddings = await embedAll(rawChunks.map((c) => c.text))
  const newChunks: Chunk[] = rawChunks.map((c, i) => ({
    id: randomUUID(),
    pageId,
    competitorId: competitor.id,
    idx: c.idx,
    headingPath: c.headingPath,
    text: c.text,
    embedding: embeddings[i],
  }))

  const newPage: Page = {
    id: pageId,
    competitorId: competitor.id,
    url,
    urlHash,
    title: extracted.title,
    markdown: extracted.markdown,
    contentHash: newContentHash,
    fetchedAt: new Date().toISOString(),
    status: extracted.textLength < 800 ? 'degraded' : 'ok',
    httpStatus: fetched.httpStatus,
    degradedReason: fetched.reason,
    via: fetched.via,
    pinned: existing?.pinned,
  }

  const oldChunks = existing ? await chunksRepo.listByPage(pageId) : []

  if (isFirstSnapshot || oldChunks.length === 0) {
    await pagesRepo.upsert(newPage)
    await chunksRepo.deleteByPage(pageId)
    await chunksRepo.insertMany(newChunks)
    return { url, pageId, status: 'first-snapshot' }
  }

  const diff = diffChunks(oldChunks, newChunks)

  await chunksRepo.deleteByPage(pageId)
  await chunksRepo.insertMany(newChunks)
  await pagesRepo.upsert(newPage)

  if (!diff.hasChanges) {
    return { url, pageId, status: 'unchanged' }
  }

  const numericEntries = diff.entries.filter(
    (e): e is Extract<DiffEntry, { kind: 'changed' }> =>
      e.kind === 'changed' && e.numericDelta !== undefined,
  )
  let entriesAfterJudge = diff.entries
  if (numericEntries.length > 0) {
    const judgements = await Promise.all(
      numericEntries.map((e) => {
        const numericDelta = e.numericDelta
        if (!numericDelta) {
          return Promise.resolve({ worthNotifying: true, reason: 'no delta' })
        }
        return judgeNumericChange({
          competitorName: competitor.name,
          pageTitle: extracted.title,
          url,
          headingPath: e.newChunk.headingPath,
          beforeText: e.oldChunk.text.slice(0, 600),
          afterText: e.newChunk.text.slice(0, 600),
          numericDelta,
        })
      }),
    )
    const rejectedIds = new Set<string>()
    numericEntries.forEach((e, i) => {
      if (!judgements[i].worthNotifying) rejectedIds.add(e.newChunk.id)
    })
    if (rejectedIds.size > 0) {
      entriesAfterJudge = diff.entries.filter(
        (e) => !(e.kind === 'changed' && rejectedIds.has(e.newChunk.id)),
      )
      if (!entriesAfterJudge.some((e) => e.kind !== 'unchanged')) {
        return {
          url,
          pageId,
          status: 'unchanged',
          reason: 'numeric judge rejected all changes',
        }
      }
    }
  }

  let summary: Summary
  try {
    summary = await summarize({
      competitorName: competitor.name,
      url,
      pageTitle: extracted.title,
      entries: entriesAfterJudge,
    })
  } catch (err) {
    return {
      url,
      pageId,
      status: 'unchanged',
      reason: `summarizer failed silently: ${err instanceof Error ? err.message : err}`,
    }
  }

  if (!summary.meaningful) {
    return { url, pageId, status: 'unchanged', reason: 'summarizer flagged noise-only change' }
  }

  const changedExample = entriesAfterJudge.find((e) => e.kind === 'changed')
  const addedExample = entriesAfterJudge.find((e) => e.kind === 'new')
  const visual = changedExample
    ? buildVisualDiff(
        changedExample.kind === 'changed' ? changedExample.oldChunk.text : '',
        changedExample.kind === 'changed' ? changedExample.newChunk.text : '',
      )
    : undefined

  const highlightSource =
    changedExample?.kind === 'changed'
      ? changedExample.newChunk.text
      : addedExample?.kind === 'new'
        ? addedExample.newChunk.text
        : ''
  const originUrl = highlightSource ? buildOriginUrl(url, highlightSource) : url

  const numericForHash = entriesAfterJudge.find(
    (e): e is Extract<DiffEntry, { kind: 'changed' }> =>
      e.kind === 'changed' && e.numericDelta !== undefined,
  )
  const normalize = (s: string | undefined): string =>
    (s ?? '').replace(/\s+/g, ' ').trim()
  const hashSeed = numericForHash?.numericDelta
    ? `num|${pageId}|${[...numericForHash.numericDelta.added].sort().join(',')}|${[...numericForHash.numericDelta.removed].sort().join(',')}`
    : `txt|${pageId}|${normalize(visual?.before)}|${normalize(visual?.after)}`
  const contentHash = sha256(hashSeed)

  const dupExisting = await changesRepo.findRecentByHash({
    pageId,
    contentHash,
    sinceDays: 14,
  })
  if (dupExisting) {
    return {
      url,
      pageId,
      status: 'unchanged',
      reason: `dedup: repeat of ${dupExisting.id}`,
    }
  }

  const change: Change = {
    id: randomUUID(),
    competitorId: competitor.id,
    pageId,
    url,
    originUrl,
    sourceId: 'website',
    sourceLabel: extracted.title ?? new URL(url).hostname,
    category: summary.category,
    severity: summary.severity,
    summary: summary.summary,
    diffBefore: visual?.before,
    diffAfter: visual?.after,
    detectedAt: new Date().toISOString(),
    read: false,
    contentHash,
  }
  await changesRepo.insert(change)
  return { url, pageId, status: 'changed', changedChange: change }
}

const isHttp = (s: string) => /^https?:\/\//i.test(s)

const uniqueUrls = (urls: string[]): string[] => {
  const seen = new Set<string>()
  const out: string[] = []
  for (const u of urls) {
    if (!u || !isHttp(u)) continue
    const norm = normalize(u)
    if (seen.has(norm)) continue
    seen.add(norm)
    out.push(u)
  }
  return out
}

const normalize = (u: string): string => {
  try {
    const x = new URL(u)
    x.hash = ''
    x.hostname = x.hostname.replace(/^www\./i, '')
    let p = x.pathname.replace(/\/+$/, '')
    if (p === '') p = '/'
    x.pathname = p
    return x.toString()
  } catch {
    return u
  }
}
