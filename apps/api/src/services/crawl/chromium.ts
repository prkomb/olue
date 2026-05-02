import { chromium, type Browser } from 'playwright'
import pLimit from 'p-limit'
import { browserHeaders } from './user-agents.js'

let browser: Browser | null = null
let launching: Promise<void> | null = null

const lock = pLimit(2)

async function ensure(): Promise<Browser> {
  if (browser?.isConnected()) return browser
  if (launching) {
    await launching
    if (browser?.isConnected()) return browser
  }
  launching = (async () => {
    browser = await chromium.launch({
      headless: true,
      args: ['--no-sandbox', '--disable-blink-features=AutomationControlled'],
    })
  })()
  try {
    await launching
  } finally {
    launching = null
  }
  if (!browser) throw new Error('failed to launch chromium')
  return browser
}

export interface FetchResult {
  html: string
  status: number
  finalUrl: string
}

export async function fetchPage(url: string, opts: { timeoutMs?: number } = {}): Promise<FetchResult> {
  return lock(async () => {
    const b = await ensure()
    const ctx = await b.newContext({
      extraHTTPHeaders: browserHeaders(),
      viewport: { width: 1280, height: 800 },
      userAgent: browserHeaders()['user-agent'],
    })
    const page = await ctx.newPage()
    try {
      const response = await page.goto(url, {
        timeout: opts.timeoutMs ?? 25_000,
        waitUntil: 'domcontentloaded',
      })
      await page.waitForLoadState('networkidle', { timeout: 8_000 }).catch(() => {})
      const html = await page.content()
      return {
        html,
        status: response?.status() ?? 0,
        finalUrl: page.url(),
      }
    } finally {
      await page.close().catch(() => {})
      await ctx.close().catch(() => {})
    }
  })
}

export async function close(): Promise<void> {
  try {
    if (browser?.isConnected()) await browser.close()
  } catch {
    // ignore
  }
  browser = null
}
