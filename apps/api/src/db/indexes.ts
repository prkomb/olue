import { db } from './mongo.js'
import { config } from '../config.js'

export const VECTOR_INDEX_NAME = 'chunks_vector_idx'

export async function ensureIndexes(): Promise<void> {
  const d = db()

  await d.collection('competitors').createIndex({ createdAt: -1 })

  await d.collection('changes').createIndex({ competitorId: 1, detectedAt: -1 })
  await d.collection('changes').createIndex({ pageId: 1, detectedAt: -1 })
  await d.collection('changes').createIndex({ pageId: 1, contentHash: 1, detectedAt: -1 })

  await d.collection('pages').createIndex(
    { competitorId: 1, urlHash: 1 },
    { unique: true },
  )
  await d.collection('pages').createIndex({ competitorId: 1, fetchedAt: -1 })

  await d.collection('chunks').createIndex({ pageId: 1, idx: 1 })
  await d.collection('chunks').createIndex({ competitorId: 1 })

  await ensureVectorIndex()
}

export async function ensureVectorIndex(): Promise<void> {
  const chunks = db().collection('chunks')
  try {
    const existing = await chunks.listSearchIndexes(VECTOR_INDEX_NAME).toArray()
    if (existing.length > 0) return
  } catch {
    // listSearchIndexes can throw on tiers without Atlas Search; treat as "not present"
  }

  try {
    await chunks.createSearchIndex({
      name: VECTOR_INDEX_NAME,
      type: 'vectorSearch',
      definition: {
        fields: [
          {
            type: 'vector',
            path: 'embedding',
            numDimensions: config.EMBEDDING_DIMS,
            similarity: 'cosine',
          },
          { type: 'filter', path: 'competitorId' },
          { type: 'filter', path: 'pageId' },
        ],
      },
    })
    console.log(`[indexes] ${VECTOR_INDEX_NAME} created (will take a minute to come online)`)
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err)
    console.warn(`[indexes] vector index create skipped: ${msg}`)
  }
}
