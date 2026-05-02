export type Category = 'pricing' | 'product' | 'messaging' | 'hiring' | 'funding' | 'other'
export type Severity = 'low' | 'medium' | 'high'
export type SourceKind = 'website' | 'linkedin' | 'other'
export type PageStatus = 'ok' | 'degraded' | 'failed'
export type PageVia = 'lightpanda' | 'chromium' | 'static' | 'none'

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
  otherSources: Source[]
  createdAt: string
}

export interface Change {
  id: string
  competitorId: string
  pageId?: string
  url?: string
  originUrl?: string
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
  otherSources: { id?: string; label: string; url: string }[]
}

export interface RunProgress {
  stage:
    | 'idle'
    | 'queued'
    | 'discover'
    | 'rank'
    | 'fetch'
    | 'extract'
    | 'embed'
    | 'diff'
    | 'summarize'
    | 'finished'
    | 'error'
  done: number
  total: number
}

export interface RunState {
  running: boolean
  startedAt: string | null
  finishedAt: string | null
  progress?: RunProgress
  error?: string
  changesEmitted?: number
}

export interface ChatSource {
  pageId: string
  competitorId: string
  url: string
  title: string
  headingPath: string[]
  score: number
}

export interface ChatMessage {
  id: string
  role: 'user' | 'assistant'
  content: string
  sources?: ChatSource[]
  stopped?: boolean
}

export interface Page {
  id: string
  competitorId: string
  url: string
  urlHash: string
  title?: string
  markdown: string
  contentHash: string
  fetchedAt: string
  status: PageStatus
  httpStatus?: number
  degradedReason?: string
  via?: PageVia
  pinned?: boolean
  ignored?: boolean
}
