import type { Collection } from 'mongodb'
import { db } from '../mongo.js'
import type { Chunk, ChunkDoc } from '../../schemas/page.js'

const col = (): Collection<ChunkDoc> => db().collection<ChunkDoc>('chunks')

const toChunk = (doc: ChunkDoc): Chunk => {
  const { _id, ...rest } = doc
  return { id: _id, ...rest }
}

const toDoc = (c: Chunk): ChunkDoc => {
  const { id, ...rest } = c
  return { _id: id, ...rest }
}

export async function listByPage(pageId: string): Promise<Chunk[]> {
  const docs = await col().find({ pageId }).sort({ idx: 1 }).toArray()
  return docs.map(toChunk)
}

export async function deleteByPage(pageId: string): Promise<number> {
  const r = await col().deleteMany({ pageId })
  return r.deletedCount
}

export async function deleteByCompetitor(competitorId: string): Promise<number> {
  const r = await col().deleteMany({ competitorId })
  return r.deletedCount
}

export async function insertMany(chunks: Chunk[]): Promise<number> {
  if (chunks.length === 0) return 0
  const r = await col().insertMany(chunks.map(toDoc))
  return r.insertedCount
}

export async function vectorSearch(
  queryVector: number[],
  filter: { competitorId?: string; pageId?: string },
  opts: { numCandidates?: number; limit?: number } = {},
): Promise<Array<Chunk & { score: number }>> {
  const stage = {
    $vectorSearch: {
      index: 'chunks_vector_idx',
      path: 'embedding',
      queryVector,
      numCandidates: opts.numCandidates ?? 50,
      limit: opts.limit ?? 5,
      filter,
    },
  }
  const docs = await col()
    .aggregate<ChunkDoc & { score: number }>([
      stage,
      { $addFields: { score: { $meta: 'vectorSearchScore' } } },
    ])
    .toArray()
  return docs.map((d) => {
    const { _id, score, ...rest } = d
    return { id: _id, score, ...rest }
  })
}
