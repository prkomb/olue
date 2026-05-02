import type { Collection } from 'mongodb'
import { db } from '../mongo.js'
import { IDLE, type RunDoc, type RunProgress, type RunState } from '../../schemas/run.js'

const col = (): Collection<RunDoc> => db().collection<RunDoc>('runs')

const toState = (doc: RunDoc | null): RunState => {
  if (!doc) return IDLE
  const { _id: _ignore, ...rest } = doc
  void _ignore
  return rest
}

export async function get(competitorId: string): Promise<RunState> {
  return toState(await col().findOne({ _id: competitorId }))
}

export async function start(competitorId: string): Promise<RunState> {
  const startedAt = new Date().toISOString()
  const state: RunState = {
    running: true,
    startedAt,
    finishedAt: null,
    progress: { stage: 'queued', done: 0, total: 0 },
  }
  await col().updateOne(
    { _id: competitorId },
    { $set: state, $setOnInsert: { _id: competitorId } },
    { upsert: true },
  )
  return state
}

export async function setProgress(competitorId: string, progress: RunProgress): Promise<void> {
  await col().updateOne({ _id: competitorId }, { $set: { progress } })
}

export async function finish(
  competitorId: string,
  result: { changesEmitted: number },
): Promise<void> {
  await col().updateOne(
    { _id: competitorId },
    {
      $set: {
        running: false,
        finishedAt: new Date().toISOString(),
        progress: { stage: 'finished', done: 0, total: 0 },
        changesEmitted: result.changesEmitted,
      },
      $unset: { error: '' },
    },
  )
}

export async function fail(competitorId: string, error: string): Promise<void> {
  await col().updateOne(
    { _id: competitorId },
    {
      $set: {
        running: false,
        finishedAt: new Date().toISOString(),
        progress: { stage: 'error', done: 0, total: 0 },
        error,
      },
    },
  )
}

export async function remove(competitorId: string): Promise<void> {
  await col().deleteOne({ _id: competitorId })
}
