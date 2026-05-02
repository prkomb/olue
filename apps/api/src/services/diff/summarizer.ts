import { z } from 'zod'
import { config } from '../../config.js'
import { chatJson } from '../openrouter/chat.js'
import { CategorySchema, SeveritySchema } from '../../schemas/common.js'
import type { DiffEntry } from './detector.js'

const SummarySchema = z.object({
  meaningful: z.boolean(),
  category: CategorySchema,
  severity: SeveritySchema,
  summary: z.string().min(1).max(400),
})

export type Summary = z.infer<typeof SummarySchema>

export async function summarize(opts: {
  competitorName: string
  url: string
  pageTitle: string | undefined
  entries: DiffEntry[]
}): Promise<Summary> {
  const hasNumeric = (e: DiffEntry): boolean =>
    e.kind === 'changed' && e.numericDelta !== undefined
  const interesting = opts.entries
    .filter((e) => e.kind !== 'unchanged')
    .sort((a, b) => Number(hasNumeric(b)) - Number(hasNumeric(a)))
    .slice(0, 6)
    .map((e) => {
      switch (e.kind) {
        case 'changed':
          return {
            kind: 'changed',
            heading: e.newChunk.headingPath.join(' > '),
            before: e.oldChunk.text.slice(0, 600),
            after: e.newChunk.text.slice(0, 600),
            numericDelta: e.numericDelta,
          }
        case 'new':
          return {
            kind: 'added',
            heading: e.newChunk.headingPath.join(' > '),
            after: e.newChunk.text.slice(0, 600),
          }
        case 'removed':
          return {
            kind: 'removed',
            heading: e.oldChunk.headingPath.join(' > '),
            before: e.oldChunk.text.slice(0, 600),
          }
        default:
          return null
      }
    })
    .filter(Boolean)

  const result = await chatJson<Summary>({
    model: config.SUMMARIZER_MODEL,
    system: `You analyze diffs of ONE specific competitor page. Return strict JSON: {"meaningful":boolean,"category":"pricing|product|messaging|hiring|funding|other","severity":"low|medium|high","summary":"<=240 chars, third person, factual"}.

meaningful=false IF the diff is purely:
- timestamps, "X minutes/hours/days ago", relative dates
- view counts, like counts, social proof counters
- carousel/list reordering with same content
- whitespace, punctuation, capitalization-only
- date stamps, version strings, build numbers
- footer/legal boilerplate
- A/B test variants of identical meaning
Set meaningful=true ONLY if a real human reviewing competitive intelligence would care.

Categories:
- pricing: tier prices, plans, billing, discounts
- product: new features, deprecations, capabilities, releases
- messaging: hero copy, positioning, taglines, value-prop
- hiring: job openings, headcount, team, roles
- funding: rounds, valuation, investors
- other: legal, security, support, integrations

Severity:
- high = clear strategic move (price change, new product, funding round, rebrand)
- medium = meaningful but localized (new role family, blog launch, copy refresh)
- low = minor copy or layout tweak still worth noting

Be conservative. Prefer meaningful=false on borderline noise. Summary must reference the specific page change, not generic terms.

Numeric changes (prices, plan limits, percentages, dates, seat counts) are almost always meaningful — set meaningful=true and severity at least medium UNLESS the number is clearly cosmetic (copyright year, view counter, "X minutes ago"). Pricing flips MUST be category="pricing" and severity="high".`,
    user: JSON.stringify({
      competitor: opts.competitorName,
      url: opts.url,
      pageTitle: opts.pageTitle,
      diffs: interesting,
    }),
    temperature: 0.2,
    maxTokens: 600,
  })

  const parsed = SummarySchema.safeParse(result)
  if (!parsed.success) {
    return {
      meaningful: false,
      category: 'other',
      severity: 'low',
      summary: 'Summary model returned an invalid response.',
    }
  }
  return parsed.data
}
