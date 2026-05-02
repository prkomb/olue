import { z } from 'zod'
import { config } from '../../config.js'
import { chatJson } from '../openrouter/chat.js'
import type { NumericDelta } from '../../utils/numeric-fingerprint.js'

const JudgementSchema = z.object({
  worthNotifying: z.boolean(),
  reason: z.string().max(200),
})

export type NumericJudgement = z.infer<typeof JudgementSchema>

export interface JudgeNumericChangeOpts {
  competitorName: string
  pageTitle: string | undefined
  url: string
  headingPath: string[]
  beforeText: string
  afterText: string
  numericDelta: NumericDelta
}

const SYSTEM_PROMPT = `You judge a SINGLE numeric change on a competitor's page. Return strict JSON: {"worthNotifying": boolean, "reason": "<=160 chars"}.

Set worthNotifying=true for: prices, plan tiers, plan limits (seats, users, GB, requests), discount percentages, funding amounts, headcount/customer counts, product version numbers, release dates, dates of upcoming events.

Set worthNotifying=false for: relative timestamps ("X minutes ago"), view/like/share counters, copyright years, ticker counters, "live now" counts, build numbers in footers, A/B test variant numbers, randomized social-proof numbers ("Joined by 1,247 teams" -> "Joined by 1,283 teams" - these jitter constantly and are not strategic signal).

Be strict. When in doubt, set worthNotifying=false - false-negatives here only mean we drop genuine noise.`

export async function judgeNumericChange(
  opts: JudgeNumericChangeOpts,
): Promise<NumericJudgement> {
  const userPayload = JSON.stringify({
    competitor: opts.competitorName,
    pageTitle: opts.pageTitle,
    url: opts.url,
    heading: opts.headingPath.join(' > '),
    before: opts.beforeText,
    after: opts.afterText,
    numericDelta: opts.numericDelta,
  })

  let raw: unknown
  try {
    raw = await chatJson({
      model: config.SUMMARIZER_MODEL,
      system: SYSTEM_PROMPT,
      user: userPayload,
      temperature: 0.1,
      maxTokens: 200,
    })
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err)
    return {
      worthNotifying: true,
      reason: `judge unavailable, deferring to summarizer: ${message.slice(0, 100)}`,
    }
  }

  const parsed = JudgementSchema.safeParse(raw)
  if (!parsed.success) {
    return { worthNotifying: false, reason: 'judge returned invalid response' }
  }
  return parsed.data
}
