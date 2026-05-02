import * as cheerio from 'cheerio'

export type RejectReason =
  | 'too-short'
  | 'thin-text'
  | 'js-app-shell'
  | 'cloudflare-challenge'
  | 'captcha'
  | 'soft-error-page'
  | 'lightpanda-empty-shell'

export interface QualityResult {
  ok: boolean
  reason?: RejectReason
  detail?: string
  textLength: number
}

const MIN_HTML_BYTES = 200
const MIN_TEXT_BYTES = 400

const CLOUDFLARE_NEEDLES = [
  'just a moment',
  'checking your browser',
  'cf-browser-verification',
  'attention required! | cloudflare',
  'cf-chl-bypass',
  'enable javascript and cookies to continue',
]

const CAPTCHA_NEEDLES = [
  'g-recaptcha',
  'h-captcha',
  'hcaptcha.com',
  'recaptcha/api.js',
  'please verify you are a human',
  'are you a robot',
]

const SOFT_ERROR_TITLE = /\b(404|403|500|forbidden|not\s+found|access\s+denied|page\s+(not\s+)?found|something\s+went\s+wrong|server\s+error)\b/i

const JS_APP_SHELL_IDS = ['root', 'app', '__next', '__nuxt', 'svelte']

const haystack = (s: string): string => s.toLowerCase()

const containsAny = (hay: string, needles: string[]): string | null => {
  for (const n of needles) if (hay.includes(n)) return n
  return null
}

export function inspectContent(html: string): QualityResult {
  if (!html || html.length < MIN_HTML_BYTES) {
    return { ok: false, reason: 'too-short', textLength: 0 }
  }

  let $: cheerio.CheerioAPI
  try {
    $ = cheerio.load(html)
  } catch (err) {
    return {
      ok: false,
      reason: 'too-short',
      detail: err instanceof Error ? err.message : String(err),
      textLength: 0,
    }
  }

  const bodyHtml = $('body').html() ?? ''
  const bodyText = $('body').text().replace(/\s+/g, ' ').trim()
  const title = $('title').text().trim()
  const lower = haystack(bodyText + ' ' + title)

  if (bodyText.length === 0 && bodyHtml.replace(/\s+/g, '').length === 0) {
    return { ok: false, reason: 'lightpanda-empty-shell', textLength: 0 }
  }

  const cf = containsAny(lower, CLOUDFLARE_NEEDLES)
  if (cf) return { ok: false, reason: 'cloudflare-challenge', detail: cf, textLength: bodyText.length }

  const captchaInLower = containsAny(lower, CAPTCHA_NEEDLES)
  const captchaInHtml = containsAny(haystack(html), CAPTCHA_NEEDLES)
  const captchaHit = captchaInLower ?? captchaInHtml
  if (captchaHit && bodyText.length < MIN_TEXT_BYTES) {
    return { ok: false, reason: 'captcha', detail: captchaHit, textLength: bodyText.length }
  }

  if (title && SOFT_ERROR_TITLE.test(title) && bodyText.length < MIN_TEXT_BYTES) {
    return { ok: false, reason: 'soft-error-page', detail: title, textLength: bodyText.length }
  }

  if (bodyText.length < MIN_TEXT_BYTES) {
    for (const id of JS_APP_SHELL_IDS) {
      const el = $(`#${id}`)
      if (el.length > 0) {
        const inner = el.text().replace(/\s+/g, ' ').trim()
        if (inner.length < 80) {
          return { ok: false, reason: 'js-app-shell', detail: `#${id}`, textLength: bodyText.length }
        }
      }
    }
    return { ok: false, reason: 'thin-text', textLength: bodyText.length }
  }

  return { ok: true, textLength: bodyText.length }
}

export interface ExtractionSignals {
  textLength: number
  bodyTextLength: number
  linkCount: number
  headingCount: number
}

export type DegradeVerdict = { degraded: boolean; reason?: string }

export function classifyExtraction(e: ExtractionSignals): DegradeVerdict {
  if (e.bodyTextLength < 200 && e.linkCount < 3 && e.headingCount < 1) {
    return { degraded: true, reason: 'empty page' }
  }
  if (e.linkCount >= 5 || e.headingCount >= 3) {
    return { degraded: false }
  }
  if (e.textLength < 80 && e.bodyTextLength < 400) {
    return { degraded: true, reason: 'extracted text too short' }
  }
  return { degraded: false }
}
