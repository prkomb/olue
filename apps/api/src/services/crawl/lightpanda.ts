import { chromium, type Browser, type BrowserContext, type Page } from 'playwright-core'
import pLimit, { type LimitFunction } from 'p-limit'
import { config } from '../../config.js'
import { browserHeaders } from './user-agents.js'

const MIN_BODY_TEXT_CHARS = 400
const READY_POLL_INTERVAL_MS = 250
const READY_POLL_TIMEOUT_MS = 6_000
const RETRY_READY_POLL_TIMEOUT_MS = 12_000

interface PoolNode {
  endpoint: string
  browser: Browser | null
  context: BrowserContext | null
  connecting: Promise<void> | null
  lock: LimitFunction
}

const parseEndpoints = (raw: string): string[] => {
  const list = raw
    .split(',')
    .map((s) => s.trim())
    .filter((s) => s.length > 0)
  return list.length > 0 ? list : ['ws://127.0.0.1:9222']
}

const nodes: PoolNode[] = parseEndpoints(config.LIGHTPANDA_CDP).map((endpoint) => ({
  endpoint,
  browser: null,
  context: null,
  connecting: null,
  lock: pLimit(1),
}))

const ensure = async (node: PoolNode): Promise<BrowserContext> => {
  if (node.browser?.isConnected() && node.context) return node.context
  if (node.connecting) {
    await node.connecting
    if (node.browser?.isConnected() && node.context) return node.context
  }
  node.connecting = (async () => {
    node.browser = await chromium.connectOverCDP(node.endpoint, { timeout: 10_000 })
    const existing = node.browser.contexts()
    node.context = existing[0] ?? (await node.browser.newContext())
  })()
  try {
    await node.connecting
  } finally {
    node.connecting = null
  }
  if (!node.context) throw new Error(`failed to connect to Lightpanda at ${node.endpoint}`)
  return node.context
}

const pickNode = (): PoolNode => {
  let best = nodes[0]
  for (const n of nodes) if (n.lock.pendingCount + n.lock.activeCount < best.lock.pendingCount + best.lock.activeCount) best = n
  return best
}

export interface FetchResult {
  html: string
  status: number
  finalUrl: string
  endpoint: string
}

const waitForBodyContent = async (page: Page, budgetMs: number): Promise<number> => {
  const deadline = Date.now() + budgetMs
  let lastLen = 0
  while (Date.now() < deadline) {
    try {
      lastLen = await page.evaluate(() => {
        const body = document.body
        if (!body) return 0
        return (body.innerText || body.textContent || '').replace(/\s+/g, ' ').trim().length
      })
      if (lastLen >= MIN_BODY_TEXT_CHARS) return lastLen
    } catch {
      // page may be navigating; retry next tick
    }
    await page.waitForTimeout(READY_POLL_INTERVAL_MS)
  }
  return lastLen
}

const attemptFetch = async (
  ctx: BrowserContext,
  url: string,
  navigationTimeoutMs: number,
  readyBudgetMs: number,
): Promise<Omit<FetchResult, 'endpoint'>> => {
  const page = await ctx.newPage()
  try {
    const response = await page.goto(url, {
      timeout: navigationTimeoutMs,
      waitUntil: 'domcontentloaded',
    })
    await page
      .waitForLoadState('networkidle', { timeout: Math.min(readyBudgetMs, 4_000) })
      .catch(() => {})
    await waitForBodyContent(page, readyBudgetMs)
    const html = await page.content()
    return {
      html,
      status: response?.status() ?? 0,
      finalUrl: page.url(),
    }
  } finally {
    await page.close().catch(() => {})
  }
}

export async function fetchPage(
  url: string,
  opts: { timeoutMs?: number } = {},
): Promise<FetchResult> {
  const node = pickNode()
  return node.lock(async () => {
    const ctx = await ensure(node)
    await ctx.setExtraHTTPHeaders(browserHeaders())
    const navTimeout = opts.timeoutMs ?? 20_000
    const first = await attemptFetch(ctx, url, navTimeout, READY_POLL_TIMEOUT_MS)
    if (first.status >= 400 && first.status !== 0) {
      return { ...first, endpoint: node.endpoint }
    }
    if (first.html.length >= 600) return { ...first, endpoint: node.endpoint }

    const second = await attemptFetch(ctx, url, navTimeout + 5_000, RETRY_READY_POLL_TIMEOUT_MS)
    const winner = second.html.length > first.html.length ? second : first
    return { ...winner, endpoint: node.endpoint }
  })
}

export async function probe(): Promise<boolean> {
  let any = false
  await Promise.all(
    nodes.map(async (n) => {
      try {
        await ensure(n)
        any = true
      } catch {
        // single node down is acceptable
      }
    }),
  )
  return any
}

export async function close(): Promise<void> {
  await Promise.all(
    nodes.map(async (n) => {
      try {
        if (n.browser?.isConnected()) await n.browser.close()
      } catch {
        // ignore
      }
      n.browser = null
      n.context = null
    }),
  )
}

export const poolSize = (): number => nodes.length
