import * as competitorsRepo from '../../db/repositories/competitors.js'
import * as runsRepo from '../../db/repositories/runs.js'
import { processUrl } from './run-crawl.js'

export async function runSingleUrl(competitorId: string, url: string): Promise<void> {
  const competitor = await competitorsRepo.findById(competitorId)
  if (!competitor) {
    await runsRepo.fail(competitorId, 'competitor not found')
    return
  }
  try {
    await runsRepo.setProgress(competitorId, { stage: 'fetch', done: 0, total: 1 })
    const outcome = await processUrl(competitor, url)
    await runsRepo.setProgress(competitorId, { stage: 'finished', done: 1, total: 1 })
    await runsRepo.finish(competitorId, {
      changesEmitted: outcome.status === 'changed' ? 1 : 0,
    })
  } catch (err) {
    await runsRepo.fail(competitorId, err instanceof Error ? err.message : String(err))
  }
}
