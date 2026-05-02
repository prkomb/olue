import { z } from 'zod'
import { CategorySchema, SeveritySchema } from './common.js'

export const ChangeSchema = z.object({
  id: z.string(),
  competitorId: z.string(),
  pageId: z.string().optional(),
  url: z.string().optional(),
  originUrl: z.string().optional(),
  sourceId: z.string(),
  sourceLabel: z.string(),
  category: CategorySchema,
  severity: SeveritySchema,
  summary: z.string(),
  diffBefore: z.string().optional(),
  diffAfter: z.string().optional(),
  detectedAt: z.string(),
  read: z.boolean(),
  contentHash: z.string().optional(),
})
export type Change = z.infer<typeof ChangeSchema>

export type ChangeDoc = Omit<Change, 'id'> & { _id: string }

export const toChange = (doc: ChangeDoc): Change => {
  const { _id, ...rest } = doc
  return { id: _id, ...rest }
}

export const toChangeDoc = (c: Change): ChangeDoc => {
  const { id, ...rest } = c
  return { _id: id, ...rest }
}
