import { z } from 'zod'
import { config } from '../../config.js'
import { chatJson } from '../openrouter/chat.js'

const RankedSchema = z.object({
  urls: z.array(
    z.object({
      url: z.string(),
      reason: z.string().optional(),
    }),
  ),
})

const PRIORITY_PATTERNS: { rx: RegExp; weight: number }[] = [
  { rx: /\/pricing(\/|$)/i, weight: 100 },
  { rx: /\/changelog(\/|$)/i, weight: 95 },
  { rx: /\/release(s)?(\/|$)/i, weight: 90 },
  { rx: /\/whats?-?new(\/|$)/i, weight: 90 },
  { rx: /\/careers?(\/|$)/i, weight: 85 },
  { rx: /\/jobs?(\/|$)/i, weight: 85 },
  { rx: /\/product(s)?(\/|$)/i, weight: 80 },
  { rx: /\/features?(\/|$)/i, weight: 80 },
  { rx: /\/customers?(\/|$)/i, weight: 75 },
  { rx: /\/case-studies?(\/|$)/i, weight: 75 },
  { rx: /\/(blog|news)(\/|$)/i, weight: 70 },
  { rx: /\/docs?(\/|$)/i, weight: 65 },
  { rx: /\/about(\/|$)/i, weight: 60 },
  { rx: /\/security(\/|$)/i, weight: 55 },
  { rx: /\/integrations?(\/|$)/i, weight: 55 },
  { rx: /\/api(\/|$)/i, weight: 50 },
  { rx: /\/(home)?\/?$/i, weight: 90 },
]

const NEGATIVE_PATTERNS: RegExp[] = [
  /\/legal\//i,
  /\/privacy/i,
  /\/terms/i,
  /\/cookie/i,
  /\/tag\//i,
  /\/category\//i,
  /\/author\//i,
  /\/page\/\d+/i,
  /\?utm_/i,
]

export function heuristicRank(urls: string[], limit: number): string[] {
  const scored = urls.map((u) => {
    let score = 0
    for (const { rx, weight } of PRIORITY_PATTERNS) {
      if (rx.test(u)) score = Math.max(score, weight)
    }
    for (const rx of NEGATIVE_PATTERNS) if (rx.test(u)) score -= 100
    try {
      const path = new URL(u).pathname
      const depth = path.split('/').filter(Boolean).length
      score -= depth * 2
    } catch {
      score -= 50
    }
    return { url: u, score }
  })
  scored.sort((a, b) => b.score - a.score)
  return scored.slice(0, limit).map((s) => s.url)
}

export async function rankPages(opts: {
  competitorName: string
  websiteUrl: string
  candidates: string[]
  limit: number
}): Promise<string[]> {
  if (opts.candidates.length <= opts.limit) return opts.candidates

  const trimmed = opts.candidates.slice(0, 400)

  try {
    const result = await chatJson<z.infer<typeof RankedSchema>>({
      model: config.RANKER_MODEL,
      system:
        'You select the most business-meaningful pages of a competitor website for ongoing tracking. Prioritize pricing, changelog/releases, careers/jobs, product/features, customers, blog index, docs, about, security. Avoid duplicate paginated/tag/category pages. Return strict JSON.',
      user: JSON.stringify({
        competitor: opts.competitorName,
        website: opts.websiteUrl,
        limit: opts.limit,
        candidates: trimmed,
        instructions: `Pick at most ${opts.limit} URLs from candidates. Return JSON: {"urls":[{"url":"...","reason":"..."}]}. Do not invent URLs not in candidates.`,
      }),
      temperature: 0.1,
      maxTokens: 4096,
    })
    const parsed = RankedSchema.safeParse(result)
    if (!parsed.success) throw new Error('ranker returned invalid shape')
    const candidateSet = new Set(opts.candidates)
    const filtered = parsed.data.urls.map((u) => u.url).filter((u) => candidateSet.has(u))
    if (filtered.length === 0) throw new Error('ranker returned zero valid urls')
    return filtered.slice(0, opts.limit)
  } catch (err) {
    console.warn('[ranker] LLM failed, using heuristic:', err instanceof Error ? err.message : err)
    return heuristicRank(opts.candidates, opts.limit)
  }
}
