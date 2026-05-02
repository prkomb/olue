# Rules

0. Use always pnpm please, don't use npm.
1. Node JS version 24.
2. It's a monorepo with React as a Frontend and Fastify as a Backend.
3. Always verify your code and changes.
4. Use conventional commits for commit names.
5. This project for Mongodb hosted Hackaton and we need to use Opensource libraries as one of the rules.
6. Always verify the latest API and settings of the library you use.
7. Use lucide-react for ALL icons. No inline SVG, no hand-drawn paths.
8. Use shadcn/ui defaults — do not add custom CSS or restyle primitives. The user re-themes via tweakcn afterwards.
9. Make sure not to create snapshots from Playwritght in root folder and put them into .playwright-mcp
10. Make sure to close your own running process if you created one, so user can run it's own dev env on original 3000, 3001 ports.

# TLDR

**olue** — open-source competitive intelligence tool ("OSS Klue alternative"). Tracks competitor surfaces (corporate site, LinkedIn, pricing, changelog, blog, careers, etc.) daily, diffs them, and surfaces meaningful changes with AI summaries while ignoring noise. Built for a MongoDB hackathon.

## Monorepo

```
apps/
  web/   @olue/web — React 19 + Vite 8 frontend  (port 3000)
  api/   @olue/api — Fastify 5 + tsx backend     (port 3001)
```

Vite proxies `/api` → `:3001`, so the frontend hits real HTTP in dev.

## Stack

- **Frontend:** React 19, Vite 8, TypeScript, Tailwind v4 (`@tailwindcss/vite`), shadcn/ui (style "new-york", baseColor "neutral"), react-router-dom v7, @tanstack/react-query v5, **ky** for HTTP (replaced `got` — pulled Node-only deps in browser), react-hook-form + zod + @hookform/resolvers, lucide-react v1 (brand icons removed in v1 — use `BriefcaseBusiness` for LinkedIn, `Globe` for website, `Link2` for misc), date-fns, sonner toasts.
- **Backend:** Fastify 5, @fastify/cors, tsx watch in dev. In-memory seed (`apps/api/src/routes/_seed.ts`) — MongoDB swap is the next milestone.

## Domain

Three types — `Competitor`, `Source`, `Change` — defined identically in `apps/web/src/types/domain.ts` and `apps/api/src/routes/_seed.ts`. Categories: pricing | product | messaging | hiring | funding | other. Severities: low | medium | high.

## API contract (stub)

| Method | Path                       |            |
| ------ | -------------------------- | ---------- |
| GET    | /api/competitors           | list       |
| POST   | /api/competitors           | create     |
| GET    | /api/competitors/:id       | one        |
| PATCH  | /api/competitors/:id       | update     |
| DELETE | /api/competitors/:id       | remove     |
| GET    | /api/changes?competitorId= | feed       |
| GET    | /api/health                | { ok, ts } |

## UX / UI principles (load-bearing — keep applying)

The change feed is consumed daily like an inbox. Unread MUST pop, read MUST recede. Bare opacity is not enough — desaturate, mute, shrink the visual weight of read items so the eye skips them.

### Read vs unread card

**Unread** — full visual weight, demands attention:

- `bg-card` + default shadow + `border-border`
- Competitor name `font-semibold text-foreground`
- Summary `text-foreground`
- Avatar at full saturation
- Category badge + severity dot + source pill at full opacity
- "Mark read" action button always visible
- (No left-side accent ribbon — distinction is carried by background, weight, saturation.)

**Read** — recedes into the background:

- `bg-muted/40`, `border-muted-foreground/10`, no shadow
- Competitor name `font-normal text-muted-foreground`
- Summary `text-muted-foreground/80`
- Avatar `grayscale opacity-60`
- Category badge + severity dot + source pill at `opacity-50`
- "Mark unread" action button hidden until `group-hover/card`

### Layout grouping (Gmail / Linear style)

- On the "All" tab render two sections — `UNREAD` (count) then `EARLIER` (count). Skip grouping when only one bucket has items, and on the dedicated Unread / Read tabs.
- Section header: `text-[11px] font-semibold tracking-wider uppercase` with the count beside it.

### Auto-mark-read on engagement

- Expanding "View diff" on an unread card schedules `setRead({read:true})` after `AUTO_READ_DELAY_MS` (600ms). Manual "Mark read" cancels any pending auto-timer before mutating.
- DO NOT auto-mark-read on viewport intersection or hover — too aggressive, the feed would self-clear while scanning.
- DO NOT auto-mark-read when the user navigates to a competitor detail page — they may just be scanning competitor names.

### Optimistic mutations

- `useSetChangeRead` patches every cached `['changes', ...]` query optimistically and rolls back on error. UX must feel instant; never wait for the network.

### Filter pills

- Multi-select category and severity rows MUST start with an "All" pill that is preselected and visually highlighted (`variant="default"`) when no specific value is chosen.
- Use [filter-pills.tsx](apps/web/src/components/filter-pills.tsx) — do not roll new variants per call site.
- EVERY individual filter option must carry a lucide icon. Conventions in this repo:
  - Categories: `DollarSign` (Pricing), `Package` (Product), `Megaphone` (Messaging), `Users` (Hiring), `Banknote` (Funding), `Boxes` (Other)
  - Severities: `ArrowDown` (Low), `Equal` (Medium), `ArrowUp` (High)
  - The "All" pill itself stays icon-less to read as a clean reset
- Pills are pill-shaped (`rounded-full h-8 text-xs font-medium`).

### Tabs ("All / Unread / Read")

- Render as a segmented control inside `rounded-full border bg-card p-1`. Active tab uses `bg-primary text-primary-foreground`.
- Each tab carries a count chip — counts must always be visible so the user feels the inbox state at a glance.
- Default tab is `All` — never auto-select another mode without an explicit user reason.
- "Mark all as read" button sits on the same row, right-aligned, ghost variant — visible only when on All/Unread AND `unread > 0`. Scoped to current competitor on the detail page.

### Padding rhythm (do not improvise)

- Routes: `mx-auto w-full max-w-5xl space-y-6 px-6 py-8 lg:px-8`. Both Dashboard and Detail share this shell — keep them parallel.
- Page header → `<Separator />` → content. Always.
- Card body uses shadcn `<Card><CardContent>` defaults (24px) — do not override.
- Section gap inside the feed: `space-y-5` between the toolbar (tabs + filters) and the cards; `space-y-3` between cards inside a section; `space-y-6` between Unread and Earlier sections.
- Section header for "Sources" / "Change feed" / "Unread" / "Earlier" uses the same uppercase 11px style with `px-1` for visual alignment with the cards beneath.

### Notification badges (iPhone-style)

- Show unread counts as small red pills next to anything that aggregates changes (sidebar competitor rows, the Dashboard nav item).
- Use shadcn `<Badge>` (no variant — override directly) styled `h-4.5 min-w-4.5 rounded-full border-0 bg-[#FF3B30] px-1.5 text-[10px] font-bold leading-none tabular-nums text-white shadow-sm ring-2 ring-sidebar`. The hard-coded `#FF3B30` is iOS notification red — do not swap it for `destructive` (it goes neutral in light mode and stops feeling like a notification). The `ring-2 ring-sidebar` (or `ring-background` on non-sidebar surfaces) gives the iOS "sticker" halo so the bubble lifts off the surface.
- Cap display at `99+`. Always set `aria-label` like `"3 unread changes"`.
- Hide the badge when the count is 0 — never render an empty pill.
- Source the count from the same `useChanges()` query that the feed uses, so the badge stays in sync with optimistic mark-read mutations for free.
- When a row already has a hover-revealed action (e.g. trash on a sidebar item), the badge fades out via `transition-opacity group-hover:opacity-0` so the action can occupy the same slot. Use `-ml-5` on the action to overlap the badge's reserved width.
- Bold the row label (`font-medium`) when its count > 0 so the row reads as "needs attention" even before the eye finds the pill.

### Other invariants

- Competitor name in any card or row is a `<Link to="/competitors/:id">` wrapping avatar + name together — generous click target.
- Empty states use [empty-state.tsx](apps/web/src/components/empty-state.tsx) with a lucide icon + title + description + optional action. Never an empty area.
- Toasts via Sonner for every successful create/update/delete and every mutation error. No silent failures.
- All icons MUST come from `lucide-react`. Never inline SVG. (See Rules.)
- Never override shadcn primitives in `components/ui/*`. Re-theming happens via tweakcn's CSS variables in [apps/web/src/index.css](apps/web/src/index.css) — that file is the user's surface area, not ours.

## Frontend layout

- `App.tsx` — sidebar + `<Outlet />`
- `routes/dashboard.tsx` — `/` global change feed
- `routes/competitor-detail.tsx` — `/competitors/:id`
- `components/app-sidebar.tsx` — competitor list, add button, delete on hover
- `components/change-card.tsx` — favicon + name + source pill + AI summary + category + severity + expandable before/after diff
- `components/competitor-form.tsx` — RHF + zod, repeatable "Other sources" via `useFieldArray`. Use `useForm<T, unknown, T>(...)` with `resolver: zodResolver(schema) as never` — RHF v8 + zodResolver have a generic mismatch.
- `components/competitor-avatar.tsx` — google favicon service (`s2/favicons`) with initials fallback
- All shadcn primitives in `components/ui/*` — do not modify.

## Commands

```bash
pnpm install
pnpm --filter @olue/api dev    # :3001
pnpm --filter @olue/web dev    # :3000
pnpm -w build                  # both workspaces
```

## Watch-points / gotchas

- **lucide-react v1** removed brand icons (Linkedin, Github, Twitter, etc.) due to trademark — substitute generic icons.
- **ky over got** — `got` works in Node only. If you need fetching in the browser, use `ky` (same API shape, browser-native).
- **Tailwind v4** uses `@import "tailwindcss"` + `@theme inline`, not `tailwind.config.js`. PostCSS isn't used; `@tailwindcss/vite` handles it. IDE may flag `@apply` / `@custom-variant` — ignore.
- **TS path alias**: `paths: { "@/*": ["./src/*"] }` without `baseUrl` (deprecated in TS 6).
- **Backend seed** is in-memory and resets on restart. Mongo persistence is the next milestone.
- **Out of scope today:** Mongo, real crawling, real AI summaries, auth, custom theming, tests.
