# Olue

Open-source alternative to Klue AI.

## Stack

pnpm workspaces monorepo.

- `apps/web` — Vite + React + TypeScript (port `3000`)
- `apps/api` — Fastify + TypeScript (port `3001`)

In dev, web proxies `/api/*` to the api so the frontend just calls `fetch('/api/...')`.

## Prereqs

- Node `>=24` (`.nvmrc` pins `v24`)
- pnpm `>=10`

## Quickstart

```sh
pnpm install
pnpm dev          # web on :3000, api on :3001
```

Sanity check: `curl http://localhost:3001/api/health`.

## Scripts (root)

| Script       | Does                                |
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
