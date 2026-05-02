export type Category = 'pricing' | 'product' | 'messaging' | 'hiring' | 'funding' | 'other'
export type Severity = 'low' | 'medium' | 'high'
export type SourceKind = 'website' | 'linkedin' | 'other'

export interface Source {
  id: string
  kind: SourceKind
  label: string
  url: string
}

export interface Competitor {
  id: string
  name: string
  website: string
  linkedin?: string
  otherSources: Source[]
  createdAt: string
}

export interface Change {
  id: string
  competitorId: string
  sourceId: string
  sourceLabel: string
  category: Category
  severity: Severity
  summary: string
  diffBefore?: string
  diffAfter?: string
  detectedAt: string
  read: boolean
}

export interface CompetitorInput {
  name: string
  website: string
  linkedin?: string
  otherSources: { id?: string; label: string; url: string }[]
}

export interface RunState {
  running: boolean
  startedAt: string | null
  finishedAt: string | null
}
