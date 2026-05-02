import ky from 'ky'
import { assertUrlSafe } from '../../security/ssrf.js'
import { fetchPage as fetchViaChromium } from './chromium.js'
import { inspectContent, type QualityResult, type RejectReason } from './content-quality.js'
import { fetchPage as fetchViaLightpanda } from './lightpanda.js'
import { browserHeaders } from './user-agents.js'

export type FetchOutcome =
  | {
      ok: true
      html: string
      finalUrl: string
      via: 'lightpanda' | 'chromium' | 'static'
      httpStatus: number
      degraded: boolean
      reason?: string
    }
  | { ok: false; reason: string; httpStatus?: number }

const describeReject = (q: QualityResult, source: string): string => {
  const reason: RejectReason = q.reason ?? 'thin-text'
  const detail = q.detail ? ` (${q.detail})` : ''
  return `${source} ${reason}${detail}, body=${q.textLength} chars`
}

export async function fetchHtml(url: string): Promise<FetchOutcome> {
  try {
    assertUrlSafe(url)
  } catch (err) {
    return { ok: false, reason: `unsafe url: ${err instanceof Error ? err.message : err}` }
  }

  let lpErr: string | undefined
  let lpStatus: number | undefined
  try {
    const r = await fetchViaLightpanda(url)
    lpStatus = r.status || lpStatus
    const q = inspectContent(r.html)
    if (q.ok) {
      return {
        ok: true,
        html: r.html,
        finalUrl: r.finalUrl,
        via: 'lightpanda',
        httpStatus: r.status || 200,
        degraded: false,
      }
    }
    lpErr = describeReject(q, 'lightpanda')
  } catch (err) {
    lpErr = err instanceof Error ? err.message : String(err)
  }

  let chErr: string | undefined
  try {
    const r = await fetchViaChromium(url)
    const q = inspectContent(r.html)
    if (q.ok) {
      return {
        ok: true,
        html: r.html,
        finalUrl: r.finalUrl,
        via: 'chromium',
        httpStatus: r.status || 200,
        degraded: false,
      }
    }
    chErr = describeReject(q, 'chromium')
  } catch (err) {
    chErr = err instanceof Error ? err.message : String(err)
  }

  try {
    const res = await ky.get(url, {
      timeout: 15_000,
      redirect: 'follow',
      headers: browserHeaders(),
      throwHttpErrors: false,
    })
    const status = res.status
    if (status >= 400) return { ok: false, reason: `HTTP ${status}`, httpStatus: status }
    const html = await res.text()
    const q = inspectContent(html)
    if (!q.ok) {
      return {
        ok: false,
        reason: chErr ?? lpErr ?? describeReject(q, 'static'),
        httpStatus: status,
      }
    }
    return {
      ok: true,
      html,
      finalUrl: url,
      via: 'static',
      httpStatus: status,
      degraded: true,
      reason: [lpErr, chErr].filter(Boolean).join(' · ') || 'static fallback used',
    }
  } catch (err) {
    return {
      ok: false,
      reason: `all fetchers failed: ${err instanceof Error ? err.message : err}`,
      httpStatus: lpStatus,
    }
  }
}
