import type { Collection } from 'mongodb'
import { db } from '../mongo.js'
import {
  toCompetitor,
  toCompetitorDoc,
  type Competitor,
  type CompetitorDoc,
} from '../../schemas/competitor.js'

const col = (): Collection<CompetitorDoc> => db().collection<CompetitorDoc>('competitors')

export async function listAll(): Promise<Competitor[]> {
  const docs = await col().find({}).sort({ createdAt: -1 }).toArray()
  return docs.map(toCompetitor)
}

export async function findById(id: string): Promise<Competitor | null> {
  const doc = await col().findOne({ _id: id })
  return doc ? toCompetitor(doc) : null
}

export async function exists(id: string): Promise<boolean> {
  const count = await col().countDocuments({ _id: id }, { limit: 1 })
  return count > 0
}

export async function create(c: Competitor): Promise<Competitor> {
  await col().insertOne(toCompetitorDoc(c))
  return c
}

export async function update(id: string, patch: Partial<Competitor>): Promise<Competitor | null> {
  const { id: _ignore, ...rest } = patch
  void _ignore
  const result = await col().findOneAndUpdate(
    { _id: id },
    { $set: rest },
    { returnDocument: 'after' },
  )
  return result ? toCompetitor(result) : null
}

export async function remove(id: string): Promise<boolean> {
  const r = await col().deleteOne({ _id: id })
  return r.deletedCount === 1
}

export async function upsert(c: Competitor): Promise<void> {
  const doc = toCompetitorDoc(c)
  const { _id, ...rest } = doc
  await col().updateOne({ _id }, { $set: rest, $setOnInsert: { _id } }, { upsert: true })
}
