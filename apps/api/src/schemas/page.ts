import { z } from 'zod'

export const PageStatusSchema = z.enum(['ok', 'degraded', 'failed'])
export type PageStatus = z.infer<typeof PageStatusSchema>

export const PageSchema = z.object({
  id: z.string(),
  competitorId: z.string(),
  url: z.string(),
  urlHash: z.string(),
  title: z.string().optional(),
  markdown: z.string(),
  contentHash: z.string(),
  fetchedAt: z.string(),
  status: PageStatusSchema,
  httpStatus: z.number().int().optional(),
  degradedReason: z.string().optional(),
  via: z.enum(['lightpanda', 'chromium', 'static', 'none']).optional(),
  pinned: z.boolean().optional(),
})
export type Page = z.infer<typeof PageSchema>

export type PageDoc = Omit<Page, 'id'> & { _id: string }

export const ChunkSchema = z.object({
  id: z.string(),
  pageId: z.string(),
  competitorId: z.string(),
  idx: z.number().int().nonnegative(),
  headingPath: z.array(z.string()),
  text: z.string(),
  embedding: z.array(z.number()),
})
export type Chunk = z.infer<typeof ChunkSchema>

export type ChunkDoc = Omit<Chunk, 'id'> & { _id: string }
