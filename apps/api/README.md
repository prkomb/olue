# @olue/api

Fastify backend for olue. Persists to MongoDB Atlas. Crawls competitor sites
via Lightpanda (CDP, driven by Playwright). Embeds chunks via OpenRouter.
Diffs new vs prior snapshots in-memory using cosine similarity. Summarizes
meaningful changes via an open-weight LLM. Surfaces them as `Change` rows.

## Bring-up

### 1. MongoDB Atlas

Cluster must be M0+ on Atlas (Vector Search supported on free tier as of 2024).
Add your dev IP under **Network Access → Add IP Address**. Without this every
connection times out.

`.env` at repo root:

```
MONGODB_URL=mongodb+srv://<user>:<password>@<cluster>/olue?retryWrites=true&w=majority
MONGODB_DB=olue
OPENROUTER_API_KEY=sk-or-v1-...
```

### 2. Lightpanda

```bash
cd apps/api
docker compose up -d
curl -fsS http://127.0.0.1:9222/json/version    # CDP probe
```

### 3. Seed + run

```bash
pnpm install
pnpm --filter @olue/api seed   # idempotent upsert of demo competitors + changes
pnpm --filter @olue/api dev    # boots Fastify on :3001
```

Health check:

```bash
curl http://localhost:3001/api/health
# { ok: true, mongo: true, lightpanda: true, ts: ... }
```

## Pipeline

```
sitemap discovery (robots-parser + sitemapper)
   │
   ▼
URL ranker (OpenRouter, qwen3-30b) → top N pages
   │  fallback: heuristic regex priority
   ▼
fetcher (Lightpanda CDP via Playwright)
   │  fallback: ky + cheerio static fetch
   ▼
defuddle/node → markdown + title
   │
   ▼
heading-aware chunker (~500 token chunks)
   │
   ▼
embeddings (OpenRouter, openai/text-embedding-3-small @ 1536d)
   │
   ▼
in-memory cosine diff vs prior chunks
   │
   ▼
summarizer (OpenRouter, DeepSeek V4 Pro) → meaningful? + category + severity + summary
   │
   ▼
Change row + visual diff (diff-match-patch)
```

## Environment

| Var | Purpose | Default |
|-----|---------|---------|
| `MONGODB_URL` | Atlas SRV URI | required |
| `MONGODB_DB` | database name | `olue` |
| `OPENROUTER_API_KEY` | OpenRouter API key | required |
| `OPENROUTER_BASE_URL` | OpenRouter base | `https://openrouter.ai/api/v1` |
| `LIGHTPANDA_CDP` | Lightpanda CDP WS | `ws://127.0.0.1:9222` |
| `EMBEDDING_MODEL` | embedding model id | `openai/text-embedding-3-small` |
| `EMBEDDING_DIMS` | vector dimensions | `1536` |
| `RANKER_MODEL` | URL ranker LLM | `qwen/qwen3-30b-a3b-instruct-2507` |
| `SUMMARIZER_MODEL` | change summarizer LLM | `deepseek/deepseek-v4-pro` |
| `CRAWL_CONCURRENCY` | parallel page fetches | `3` |
| `MAX_PAGES_PER_RUN` | pages per competitor per run | `30` |
| `RUN_SKIP_IF_FRESHER_THAN_HOURS` | cron freshness gate | `12` |

## Routes

```
GET    /api/health
GET    /api/competitors
POST   /api/competitors
GET    /api/competitors/:id
PATCH  /api/competitors/:id
DELETE /api/competitors/:id
GET    /api/competitors/:id/run
POST   /api/competitors/:id/run
GET    /api/changes?competitorId=&limit=
PATCH  /api/changes/:id/read
POST   /api/changes/read-all?competitorId=
```

## Schedule

Daily at 03:15 UTC, the scheduler iterates competitors and runs the pipeline
for any competitor whose last run finished more than `RUN_SKIP_IF_FRESHER_THAN_HOURS`
ago. Concurrent runs are blocked by the `runs` collection acting as a lock.

## Collections

- `competitors` — one doc per tracked competitor
- `pages` — one doc per (competitorId, url) latest snapshot
- `chunks` — heading-aware text + 1536-d embedding
- `changes` — emitted Change rows
- `runs` — per-competitor run state (lock + progress)

Vector Search index `chunks_vector_idx` on `chunks.embedding` is
created automatically at boot via `db.collection.createSearchIndex`.
Reserved for the future chat-over-changes RAG endpoint.

## Security

- Outbound HTTP wrapped via `request-filtering-agent`: blocks RFC1918,
  loopback, link-local, AWS metadata, IPv6 ULA. Scheme allowlist `[http, https]`.
- Browser fingerprints rotate per request (Chrome / Firefox / Safari / Edge,
  recent versions, matching Sec-CH-UA hints, varied Accept-Language).
- Robots.txt is fetched and respected (`isAllowed`, `crawl-delay`).
- `.env` is gitignored — rotate any leaked keys before pushing.

## Tear-down

```bash
docker compose down
```
