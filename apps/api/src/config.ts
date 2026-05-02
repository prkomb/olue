import { z } from 'zod'

const Schema = z.object({
  MONGODB_URL: z.string().min(1).refine(
    (s) => s.startsWith('mongodb://') || s.startsWith('mongodb+srv://'),
    { message: 'must be a mongodb:// or mongodb+srv:// URI' },
  ),
  MONGODB_DB: z.string().default('olue'),

  OPENROUTER_API_KEY: z.string().min(10),
  OPENROUTER_BASE_URL: z.string().default('https://openrouter.ai/api/v1'),

  LIGHTPANDA_CDP: z
    .string()
    .default('ws://127.0.0.1:9222,ws://127.0.0.1:9223,ws://127.0.0.1:9224'),

  EMBEDDING_MODEL: z.string().default('openai/text-embedding-3-small'),
  EMBEDDING_DIMS: z.coerce.number().int().positive().default(1536),
  RANKER_MODEL: z.string().default('qwen/qwen3-30b-a3b-instruct-2507'),
  SUMMARIZER_MODEL: z.string().default('deepseek/deepseek-v4-pro'),
  CHAT_MODEL: z.string().default('anthropic/claude-sonnet-4.6'),

  CRAWL_CONCURRENCY: z.coerce.number().int().positive().max(16).default(3),
  MAX_PAGES_PER_RUN: z.coerce.number().int().positive().max(200).default(30),
  RUN_SKIP_IF_FRESHER_THAN_HOURS: z.coerce.number().nonnegative().default(12),

  PORT: z.coerce.number().default(3001),
  HOST: z.string().default('0.0.0.0'),
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
})

const parsed = Schema.safeParse(process.env)

if (!parsed.success) {
  console.error('[config] invalid environment:')
  for (const issue of parsed.error.issues) {
    console.error(`  ${issue.path.join('.')}: ${issue.message}`)
  }
  process.exit(1)
}

export const config = parsed.data
export type Config = typeof config
