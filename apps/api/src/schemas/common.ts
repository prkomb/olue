import { z } from 'zod'

export const CategorySchema = z.enum(['pricing', 'product', 'messaging', 'hiring', 'funding', 'other'])
export type Category = z.infer<typeof CategorySchema>

export const SeveritySchema = z.enum(['low', 'medium', 'high'])
export type Severity = z.infer<typeof SeveritySchema>

export const SourceKindSchema = z.enum(['website', 'linkedin', 'other'])
export type SourceKind = z.infer<typeof SourceKindSchema>
