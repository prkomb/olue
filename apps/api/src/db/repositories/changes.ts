import type { Collection } from 'mongodb'
import { db } from '../mongo.js'
import { toChange, toChangeDoc, type Change, type ChangeDoc } from '../../schemas/change.js'

const col = (): Collection<ChangeDoc> => db().collection<ChangeDoc>('changes')

export async function list(
  opts: { competitorId?: string; pageId?: string; limit?: number } = {},
): Promise<Change[]> {
  const filter: Record<string, unknown> = {}
  if (opts.competitorId) filter.competitorId = opts.competitorId
  if (opts.pageId) filter.pageId = opts.pageId
  let cursor = col().find(filter).sort({ detectedAt: -1 })
  if (opts.limit && opts.limit > 0) cursor = cursor.limit(opts.limit)
  const docs = await cursor.toArray()
  return docs.map(toChange)
}

export async function findById(id: string): Promise<Change | null> {
  const doc = await col().findOne({ _id: id })
  return doc ? toChange(doc) : null
}

export async function findRecentByHash(opts: {
  pageId: string
  contentHash: string
  sinceDays: number
}): Promise<Change | null> {
  const cutoff = new Date(Date.now() - opts.sinceDays * 24 * 60 * 60 * 1000).toISOString()
  const doc = await col().findOne({
    pageId: opts.pageId,
    contentHash: opts.contentHash,
    detectedAt: { $gte: cutoff },
  })
  return doc ? toChange(doc) : null
}

export async function setRead(id: string, read: boolean): Promise<Change | null> {
  const result = await col().findOneAndUpdate(
    { _id: id },
    { $set: { read } },
    { returnDocument: 'after' },
  )
  return result ? toChange(result) : null
}

export async function setReadAll(competitorId: string | undefined, read: boolean): Promise<number> {
  const filter: Record<string, unknown> = { read: { $ne: read } }
  if (competitorId) filter.competitorId = competitorId
  const r = await col().updateMany(filter, { $set: { read } })
  return r.modifiedCount
}

export async function insert(c: Change): Promise<Change> {
  await col().insertOne(toChangeDoc(c))
  return c
}

export async function insertMany(items: Change[]): Promise<number> {
  if (items.length === 0) return 0
  const r = await col().insertMany(items.map(toChangeDoc))
  return r.insertedCount
}

export async function deleteByCompetitor(competitorId: string): Promise<number> {
  const r = await col().deleteMany({ competitorId })
  return r.deletedCount
}

export async function upsert(c: Change): Promise<void> {
  const doc = toChangeDoc(c)
  const { _id, ...rest } = doc
  await col().updateOne({ _id }, { $set: rest, $setOnInsert: { _id } }, { upsert: true })
}
