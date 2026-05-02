import { createRequire } from 'node:module'
import Sitemapper from 'sitemapper'
import * as cheerio from 'cheerio'
import { safeFetch, assertUrlSafe } from '../../security/ssrf.js'
import { browserHeaders } from './user-agents.js'

const require = createRequire(import.meta.url)
type RobotsResult = {
  isAllowed(url: string, ua: string): boolean | undefined
  getSitemaps(): string[]
  getCrawlDelay(ua: string): number | undefined
}
const robotsParser = require('robots-parser') as (url: string, contents: string) => RobotsResult

const USER_AGENT_TOKEN = 'olue-bot'

export interface DiscoveredUrls {
  urls: string[]
  robotsTxt: string | null
  crawlDelayMs: number
}

const SITEMAP_TIMEOUT_MS = 15_000
const PER_SITEMAP_LIMIT = 5_000
const TOTAL_LIMIT = 1_000

export async function discoverUrls(websiteUrl: string): Promise<DiscoveredUrls> {
  const origin = new URL(assertUrlSafe(websiteUrl).origin)
  const robotsUrl = new URL('/robots.txt', origin).toString()

  let robotsTxt: string | null = null
  let robots: RobotsResult | null = null
  let sitemapUrls: string[] = []
  let crawlDelayMs = 200

  try {
    const res = await safeFetch(robotsUrl, {
      headers: browserHeaders(),
      redirect: 'follow',
    })
    if (res.ok) {
      robotsTxt = await res.text()
      robots = robotsParser(robotsUrl, robotsTxt)
      sitemapUrls = robots.getSitemaps() ?? []
      const delay = robots.getCrawlDelay(USER_AGENT_TOKEN)
      if (typeof delay === 'number' && delay > 0) crawlDelayMs = Math.min(delay * 1000, 5_000)
    }
  } catch {
    // ignore robots failure; fall back to default sitemap
  }

  if (sitemapUrls.length === 0) {
    sitemapUrls = [new URL('/sitemap.xml', origin).toString()]
  }

  const collected = new Set<string>()
  collected.add(websiteUrl)

  for (const sm of sitemapUrls) {
    if (collected.size >= TOTAL_LIMIT) break
    try {
      const m = new Sitemapper({
        url: sm,
        timeout: SITEMAP_TIMEOUT_MS,
        requestHeaders: browserHeaders(),
      } as ConstructorParameters<typeof Sitemapper>[0])
      const { sites } = await m.fetch()
      for (const u of sites.slice(0, PER_SITEMAP_LIMIT)) {
        if (collected.size >= TOTAL_LIMIT) break
        if (sameOrigin(u, origin) && (!robots || robots.isAllowed(u, USER_AGENT_TOKEN) !== false)) {
          collected.add(u)
        }
      }
    } catch {
      // some sites have malformed sitemaps — skip silently
    }
  }

  if (collected.size <= 1) {
    try {
      const more = await discoverFromHomepage(websiteUrl)
      for (const u of more) {
        if (collected.size >= TOTAL_LIMIT) break
        if (!robots || robots.isAllowed(u, USER_AGENT_TOKEN) !== false) collected.add(u)
      }
    } catch {
      // homepage discovery is best-effort
    }
  }

  return {
    urls: Array.from(collected),
    robotsTxt,
    crawlDelayMs,
  }
}

const SKIP_PATH_PATTERNS = [
  /\/cdn-cgi\//i,
  /\/wp-admin\//i,
  /\/wp-json\//i,
  /\.(jpg|jpeg|png|gif|svg|webp|ico|pdf|zip|mp4|mp3)$/i,
  /^mailto:/i,
  /^tel:/i,
  /^javascript:/i,
]

const stripWww = (h: string) => h.replace(/^www\./i, '')

async function discoverFromHomepage(websiteUrl: string): Promise<string[]> {
  const homepageHost = stripWww(assertUrlSafe(websiteUrl).hostname)
  const res = await safeFetch(websiteUrl, { headers: browserHeaders(), redirect: 'follow' })
  if (!res.ok) return []
  const html = await res.text()
  const $ = cheerio.load(html)
  const found = new Set<string>()
  $('a[href]').each((_, el) => {
    const href = $(el).attr('href')
    if (!href) return
    if (SKIP_PATH_PATTERNS.some((rx) => rx.test(href))) return
    let abs: string
    try {
      abs = new URL(href, websiteUrl).toString()
    } catch {
      return
    }
    if (SKIP_PATH_PATTERNS.some((rx) => rx.test(abs))) return
    let u: URL
    try {
      u = new URL(abs)
    } catch {
      return
    }
    if (stripWww(u.hostname) !== homepageHost) return
    if (u.protocol !== 'http:' && u.protocol !== 'https:') return
    u.hash = ''
    u.search = ''
    let p = u.pathname.replace(/\/+$/, '')
    if (p === '') p = '/'
    u.pathname = p
    found.add(u.toString())
  })
  return Array.from(found)
}

function sameOrigin(url: string, origin: URL): boolean {
  try {
    const u = new URL(url)
    return u.origin === origin.origin
  } catch {
    return false
  }
}
