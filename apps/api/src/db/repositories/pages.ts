import type { Collection } from 'mongodb'
import { db } from '../mongo.js'
import type { Page, PageDoc } from '../../schemas/page.js'

const col = (): Collection<PageDoc> => db().collection<PageDoc>('pages')

const toPage = (doc: PageDoc): Page => {
  const { _id, ...rest } = doc
  return { id: _id, ...rest }
}

const toDoc = (p: Page): PageDoc => {
  const { id, ...rest } = p
  return { _id: id, ...rest }
}

export async function findByCompetitorAndUrlHash(
  competitorId: string,
  urlHash: string,
): Promise<Page | null> {
  const doc = await col().findOne({ competitorId, urlHash })
  return doc ? toPage(doc) : null
}

export async function findById(pageId: string): Promise<Page | null> {
  const doc = await col().findOne({ _id: pageId })
  return doc ? toPage(doc) : null
}

export async function listByIds(pageIds: string[]): Promise<Page[]> {
  if (pageIds.length === 0) return []
  const docs = await col().find({ _id: { $in: pageIds } }).toArray()
  return docs.map(toPage)
}

export async function listByCompetitor(competitorId: string): Promise<Page[]> {
  const docs = await col().find({ competitorId }).sort({ fetchedAt: -1 }).toArray()
  return docs.map(toPage)
}

export async function listAll(): Promise<Page[]> {
  const docs = await col().find({}).sort({ fetchedAt: -1 }).toArray()
  return docs.map(toPage)
}

export async function deleteById(pageId: string): Promise<boolean> {
  const r = await col().deleteOne({ _id: pageId })
  return r.deletedCount === 1
}

export async function updateUrl(pageId: string, newUrl: string, newUrlHash: string): Promise<boolean> {
  const r = await col().updateOne(
    { _id: pageId },
    {
      $set: {
        url: newUrl,
        urlHash: newUrlHash,
        markdown: '',
        contentHash: '',
        title: undefined,
        status: 'ok',
        fetchedAt: new Date().toISOString(),
      },
      $unset: { httpStatus: '', degradedReason: '', via: '', structuralHash: '' },
    },
  )
  return r.matchedCount === 1
}

export async function upsert(p: Page): Promise<void> {
  const doc = toDoc(p)
  const { _id, ...rest } = doc
  await col().updateOne(
    { competitorId: p.competitorId, urlHash: p.urlHash },
    { $set: rest, $setOnInsert: { _id } },
    { upsert: true },
  )
}

export async function deleteByCompetitor(competitorId: string): Promise<number> {
  const r = await col().deleteMany({ competitorId })
  return r.deletedCount
}

export async function setIgnored(pageId: string, ignored: boolean): Promise<Page | null> {
  const r = await col().findOneAndUpdate(
    { _id: pageId },
    ignored ? { $set: { ignored: true } } : { $unset: { ignored: '' } },
    { returnDocument: 'after' },
  )
  return r ? toPage(r) : null
}

export async function listIgnoredPageIds(competitorId?: string): Promise<string[]> {
  const filter: Record<string, unknown> = { ignored: true }
  if (competitorId) filter.competitorId = competitorId
  const docs = await col().find(filter, { projection: { _id: 1 } }).toArray()
  return docs.map((d) => d._id)
}
