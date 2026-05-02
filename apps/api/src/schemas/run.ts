import { z } from 'zod'

export const RunStageSchema = z.enum([
  'idle',
  'queued',
  'discover',
  'rank',
  'fetch',
  'extract',
  'embed',
  'diff',
  'summarize',
  'finished',
  'error',
])
export type RunStage = z.infer<typeof RunStageSchema>

export const RunProgressSchema = z.object({
  stage: RunStageSchema,
  done: z.number().int().nonnegative(),
  total: z.number().int().nonnegative(),
})
export type RunProgress = z.infer<typeof RunProgressSchema>

export const RunStateSchema = z.object({
  running: z.boolean(),
  startedAt: z.string().nullable(),
  finishedAt: z.string().nullable(),
  progress: RunProgressSchema.optional(),
  error: z.string().optional(),
  changesEmitted: z.number().int().nonnegative().optional(),
})
export type RunState = z.infer<typeof RunStateSchema>

export const IDLE: RunState = { running: false, startedAt: null, finishedAt: null }

export type RunDoc = RunState & { _id: string }
