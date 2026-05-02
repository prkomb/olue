# Olue

Open-source competitive intelligence — keep an eye on what your competitors are shipping.

## Stack

pnpm workspaces monorepo.

- `apps/web` — Vite + React + TypeScript (port `3000`)
- `apps/api` — Fastify + TypeScript (port `3001`)

In dev, the web app proxies `/api/*` to the API, so the frontend just calls `fetch('/api/...')`.

## Prerequisites

- Node `>=24` (`.nvmrc` pins `v24`)
- pnpm `>=10`

## Quickstart

```sh
pnpm install
pnpm dev          # web on :3000, api on :3001
```

Sanity check: `curl http://localhost:3001/api/health`.

## Scripts (root)

| Script       | What it does                        |
| ------------ | ----------------------------------- |
| `pnpm dev`   | Run web + api in parallel           |
| `pnpm build` | Build both apps                     |
| `pnpm start` | Run the built api (`apps/api/dist`) |
| `pnpm lint`  | Lint web                            |

Per-app scripts: `pnpm --filter @olue/web <script>` or `pnpm --filter @olue/api <script>`.

## Layout

```text
apps/
  web/   # Vite app
  api/   # Fastify server, routes under /api
```

