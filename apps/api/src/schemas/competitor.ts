import { z } from 'zod'
import { SourceKindSchema, type SourceKind } from './common.js'

export const SourceSchema = z.object({
  id: z.string(),
  kind: SourceKindSchema,
  label: z.string(),
  url: z.string(),
})
export type Source = z.infer<typeof SourceSchema>

export const CompetitorSchema = z.object({
  id: z.string(),
  name: z.string(),
  website: z.string(),
  otherSources: z.array(SourceSchema),
  createdAt: z.string(),
})
export type Competitor = z.infer<typeof CompetitorSchema>

export const OtherSourceInputSchema = z.object({
  id: z.string().optional(),
  label: z.string().min(1),
  url: z.string().min(1),
})

export const CompetitorInputSchema = z.object({
  name: z.string().min(1),
  website: z.string().min(1),
  otherSources: z.array(OtherSourceInputSchema).optional(),
})
export type CompetitorInput = z.infer<typeof CompetitorInputSchema>

export const CompetitorUpdateSchema = CompetitorInputSchema.partial()
export type CompetitorUpdate = z.infer<typeof CompetitorUpdateSchema>

export type CompetitorDoc = Omit<Competitor, 'id'> & { _id: string }

export const toCompetitor = (doc: CompetitorDoc): Competitor => {
  const { _id, ...rest } = doc
  return { id: _id, ...rest }
}

export const toCompetitorDoc = (c: Competitor): CompetitorDoc => {
  const { id, ...rest } = c
  return { _id: id, ...rest }
}

export type { SourceKind }
