import { Cron } from 'croner'
import type { FastifyBaseLogger } from 'fastify'
import { config } from '../config.js'
import * as competitorsRepo from '../db/repositories/competitors.js'
import * as runsRepo from '../db/repositories/runs.js'
import { runCrawl } from '../services/pipeline/run-crawl.js'

const DAILY_AT_03_15 = '15 3 * * *'

export function startScheduler(log: FastifyBaseLogger): Cron {
  const job = new Cron(DAILY_AT_03_15, { timezone: 'UTC', name: 'olue-daily-crawl' }, async () => {
    await tickAll(log)
  })
  log.info({ next: job.nextRun()?.toISOString() }, 'crawl scheduler started')
  return job
}

export async function tickAll(log: FastifyBaseLogger): Promise<void> {
  log.info('cron tick: scanning competitors')
  const freshCutoff = config.RUN_SKIP_IF_FRESHER_THAN_HOURS * 3_600_000
  const competitors = await competitorsRepo.listAll()
  for (const c of competitors) {
    const state = await runsRepo.get(c.id)
    if (state.running) {
      log.info({ id: c.id, name: c.name }, 'cron: skip (already running)')
      continue
    }
    const finishedAt = state.finishedAt ? Date.parse(state.finishedAt) : 0
    if (finishedAt > 0 && Date.now() - finishedAt < freshCutoff) {
      log.info({ id: c.id, name: c.name }, 'cron: skip (fresh)')
      continue
    }
    log.info({ id: c.id, name: c.name }, 'cron: starting run')
    await runsRepo.start(c.id)
    try {
      await runCrawl(c.id)
    } catch (err) {
      log.error({ err, id: c.id }, 'cron run crashed')
    }
  }
  log.info('cron tick: done')
}
