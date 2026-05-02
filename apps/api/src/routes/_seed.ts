import { randomUUID } from 'node:crypto'

export type Category = 'pricing' | 'product' | 'messaging' | 'hiring' | 'funding' | 'other'
export type Severity = 'low' | 'medium' | 'high'
export type SourceKind = 'website' | 'linkedin' | 'g2' | 'other'

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
  g2?: string
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

const now = Date.now()
const minutesAgo = (m: number) => new Date(now - m * 60_000).toISOString()
const hoursAgo = (h: number) => new Date(now - h * 3_600_000).toISOString()
const daysAgo = (d: number) => new Date(now - d * 86_400_000).toISOString()

const linearId = randomUUID()
const notionId = randomUUID()
const figmaId = randomUUID()

export const competitors: Competitor[] = [
  {
    id: linearId,
    name: 'Linear',
    website: 'https://linear.app',
    linkedin: 'https://www.linkedin.com/company/linear-app',
    g2: 'https://www.g2.com/products/linear/reviews',
    otherSources: [
      { id: randomUUID(), kind: 'other', label: 'Pricing', url: 'https://linear.app/pricing' },
      { id: randomUUID(), kind: 'other', label: 'Changelog', url: 'https://linear.app/changelog' },
      { id: randomUUID(), kind: 'other', label: 'Careers', url: 'https://linear.app/careers' },
    ],
    createdAt: daysAgo(14),
  },
  {
    id: notionId,
    name: 'Notion',
    website: 'https://www.notion.so',
    linkedin: 'https://www.linkedin.com/company/notionhq',
    g2: 'https://www.g2.com/products/notion/reviews',
    otherSources: [
      { id: randomUUID(), kind: 'other', label: 'Pricing', url: 'https://www.notion.so/pricing' },
      { id: randomUUID(), kind: 'other', label: 'What’s New', url: 'https://www.notion.so/releases' },
    ],
    createdAt: daysAgo(9),
  },
  {
    id: figmaId,
    name: 'Figma',
    website: 'https://www.figma.com',
    linkedin: 'https://www.linkedin.com/company/figma',
    g2: 'https://www.g2.com/products/figma/reviews',
    otherSources: [
      { id: randomUUID(), kind: 'other', label: 'Pricing', url: 'https://www.figma.com/pricing/' },
      { id: randomUUID(), kind: 'other', label: 'Blog', url: 'https://www.figma.com/blog/' },
    ],
    createdAt: daysAgo(4),
  },
]

const seedChanges: Omit<Change, 'read'>[] = [
  {
    id: randomUUID(),
    competitorId: linearId,
    sourceId: 'website',
    sourceLabel: 'Pricing',
    category: 'pricing',
    severity: 'high',
    summary: 'Linear raised the Business plan from $14 to $16 per user/month and rebranded the legacy Standard tier as "Basic".',
    diffBefore: 'Business — $14 / user / month\nStandard — $8 / user / month',
    diffAfter: 'Business — $16 / user / month\nBasic — $8 / user / month',
    detectedAt: minutesAgo(35),
  },
  {
    id: randomUUID(),
    competitorId: linearId,
    sourceId: 'website',
    sourceLabel: 'Changelog',
    category: 'product',
    severity: 'medium',
    summary: 'Shipped "Initiatives" — a new top-level grouping above Projects for multi-quarter roadmaps.',
    diffBefore: 'Projects → Cycles → Issues',
    diffAfter: 'Initiatives → Projects → Cycles → Issues',
    detectedAt: hoursAgo(5),
  },
  {
    id: randomUUID(),
    competitorId: linearId,
    sourceId: 'linkedin',
    sourceLabel: 'LinkedIn',
    category: 'hiring',
    severity: 'medium',
    summary: 'Headcount grew from 142 to 158 in the past 30 days, with 9 of the 16 new roles in Engineering.',
    detectedAt: hoursAgo(11),
  },
  {
    id: randomUUID(),
    competitorId: linearId,
    sourceId: 'website',
    sourceLabel: 'Homepage',
    category: 'messaging',
    severity: 'low',
    summary: 'Headline shifted from "Linear is a better way to build products" to "The system for modern product development".',
    diffBefore: 'Linear is a better way to build products',
    diffAfter: 'The system for modern product development',
    detectedAt: daysAgo(1),
  },
  {
    id: randomUUID(),
    competitorId: linearId,
    sourceId: 'g2',
    sourceLabel: 'G2',
    category: 'other',
    severity: 'low',
    summary: 'Average rating ticked from 4.6 to 4.7 (↑ 38 new reviews this week).',
    detectedAt: daysAgo(2),
  },
  {
    id: randomUUID(),
    competitorId: notionId,
    sourceId: 'website',
    sourceLabel: 'Pricing',
    category: 'pricing',
    severity: 'high',
    summary: 'Introduced a new "Notion AI Business" add-on at $20/user/mo, separate from the base plan.',
    diffBefore: 'Notion AI — $10 / user / month (add-on)',
    diffAfter: 'Notion AI — $10 / user / month\nNotion AI Business — $20 / user / month',
    detectedAt: hoursAgo(2),
  },
  {
    id: randomUUID(),
    competitorId: notionId,
    sourceId: 'website',
    sourceLabel: 'What’s New',
    category: 'product',
    severity: 'high',
    summary: 'Launched native Forms with conditional logic and Zapier-style automations, encroaching on Typeform and Airtable.',
    detectedAt: hoursAgo(7),
  },
  {
    id: randomUUID(),
    competitorId: notionId,
    sourceId: 'linkedin',
    sourceLabel: 'LinkedIn',
    category: 'funding',
    severity: 'high',
    summary: 'Announced a $300M Series D extension at a $12B valuation; lead investor undisclosed.',
    detectedAt: daysAgo(1),
  },
  {
    id: randomUUID(),
    competitorId: notionId,
    sourceId: 'website',
    sourceLabel: 'Homepage',
    category: 'messaging',
    severity: 'medium',
    summary: 'Repositioned as "The connected workspace where AI does your busywork" — AI-first framing replaces the old wiki/notes/docs framing.',
    diffBefore: 'Write, plan, share. With AI at your side.',
    diffAfter: 'The connected workspace where AI does your busywork.',
    detectedAt: daysAgo(2),
  },
  {
    id: randomUUID(),
    competitorId: notionId,
    sourceId: 'g2',
    sourceLabel: 'G2',
    category: 'other',
    severity: 'low',
    summary: 'Picked up the "Leader — Spring 2026" badge in the Note Taking Software category.',
    detectedAt: daysAgo(3),
  },
  {
    id: randomUUID(),
    competitorId: figmaId,
    sourceId: 'website',
    sourceLabel: 'Pricing',
    category: 'pricing',
    severity: 'medium',
    summary: 'Introduced annual-only discounting on the Organization plan; monthly pricing removed from the table.',
    detectedAt: minutesAgo(90),
  },
  {
    id: randomUUID(),
    competitorId: figmaId,
    sourceId: 'website',
    sourceLabel: 'Blog',
    category: 'product',
    severity: 'high',
    summary: 'Shipped "Figma Sites" GA — publish responsive marketing pages directly from a Figma file.',
    detectedAt: hoursAgo(3),
  },
  {
    id: randomUUID(),
    competitorId: figmaId,
    sourceId: 'linkedin',
    sourceLabel: 'LinkedIn',
    category: 'hiring',
    severity: 'medium',
    summary: 'Opened 24 new EU roles, mostly in Sales and Solutions Engineering — signal of EMEA expansion push.',
    detectedAt: hoursAgo(9),
  },
  {
    id: randomUUID(),
    competitorId: figmaId,
    sourceId: 'website',
    sourceLabel: 'Homepage',
    category: 'messaging',
    severity: 'low',
    summary: 'Hero CTA changed from "Get started for free" to "Start designing with AI".',
    diffBefore: 'Get started for free',
    diffAfter: 'Start designing with AI',
    detectedAt: daysAgo(1),
  },
  {
    id: randomUUID(),
    competitorId: figmaId,
    sourceId: 'g2',
    sourceLabel: 'G2',
    category: 'other',
    severity: 'low',
    summary: 'Three competitor mentions appeared in fresh reviews comparing Figma to Penpot and Sketch.',
    detectedAt: daysAgo(2),
  },
  {
    id: randomUUID(),
    competitorId: figmaId,
    sourceId: 'website',
    sourceLabel: 'Pricing',
    category: 'product',
    severity: 'medium',
    summary: 'Added a "Dev Mode seats" line item to the pricing comparison table — now sold separately from full editor seats.',
    detectedAt: daysAgo(3),
  },
  {
    id: randomUUID(),
    competitorId: linearId,
    sourceId: 'website',
    sourceLabel: 'Careers',
    category: 'hiring',
    severity: 'low',
    summary: 'New "AI Research" job family appeared on the careers page with two open senior roles.',
    detectedAt: daysAgo(4),
  },
]

const oneDayAgo = now - 86_400_000
export const changes: Change[] = seedChanges.map((c) => ({
  ...c,
  read: new Date(c.detectedAt).getTime() < oneDayAgo,
}))

changes.sort((a, b) => (a.detectedAt < b.detectedAt ? 1 : -1))
