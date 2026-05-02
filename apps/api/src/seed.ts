import { close, connect } from './db/mongo.js'
import { ensureIndexes } from './db/indexes.js'
import * as competitorsRepo from './db/repositories/competitors.js'
import * as changesRepo from './db/repositories/changes.js'
import * as chunksRepo from './db/repositories/chunks.js'
import * as pagesRepo from './db/repositories/pages.js'
import * as runsRepo from './db/repositories/runs.js'
import type { Competitor } from './schemas/competitor.js'

const mbunityId = '44444444-4444-4444-4444-444444444444'

const competitors: Competitor[] = [
  {
    id: mbunityId,
    name: 'Mbunity',
    website: 'https://www.mbunity.com',
    otherSources: [],
    createdAt: new Date().toISOString(),
  },
]

const STALE_IDS = [
  '11111111-1111-1111-1111-111111111111',
  '22222222-2222-2222-2222-222222222222',
  '33333333-3333-3333-3333-333333333333',
]

async function main() {
  await connect()
  await ensureIndexes()

  for (const staleId of STALE_IDS) {
    if (await competitorsRepo.findById(staleId)) {
      await Promise.all([
        competitorsRepo.remove(staleId),
        runsRepo.remove(staleId),
        chunksRepo.deleteByCompetitor(staleId),
        pagesRepo.deleteByCompetitor(staleId),
        changesRepo.deleteByCompetitor(staleId),
      ])
      console.log(`[seed] removed stale competitor ${staleId}`)
    }
  }

  let upserted = 0
  for (const c of competitors) {
    await competitorsRepo.upsert(c)
    upserted++
  }
  console.log(`[seed] competitors upserted: ${upserted}`)

  await close()
  console.log('[seed] done')
}

main().catch((err) => {
  console.error('[seed] failed:', err)
  process.exit(1)
})
