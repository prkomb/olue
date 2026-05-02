export interface NumericDelta {
  added: string[]
  removed: string[]
}

const CURRENCY_SYMBOL_TO_CODE: Record<string, string> = {
  $: 'USD',
  '€': 'EUR',
  '£': 'GBP',
  '¥': 'JPY',
}

const MONTH_TO_NUM: Record<string, string> = {
  jan: '01', january: '01',
  feb: '02', february: '02',
  mar: '03', march: '03',
  apr: '04', april: '04',
  may: '05',
  jun: '06', june: '06',
  jul: '07', july: '07',
  aug: '08', august: '08',
  sep: '09', sept: '09', september: '09',
  oct: '10', october: '10',
  nov: '11', november: '11',
  dec: '12', december: '12',
}

const QTY_UNITS = [
  'seat', 'seats',
  'user', 'users',
  'project', 'projects',
  'gb', 'tb', 'mb',
  'request', 'requests',
  'call', 'calls',
  'member', 'members',
]

const normalizeAmount = (raw: string): string => {
  const cleaned = raw.replace(/,/g, '')
  const num = Number.parseFloat(cleaned)
  if (!Number.isFinite(num)) return raw
  return num.toFixed(2)
}

const extractCurrency = (text: string, out: Set<string>): void => {
  const symbolFirst = /([$€£¥])\s?(\d{1,3}(?:,\d{3})*(?:\.\d+)?|\d+(?:\.\d+)?)/g
  for (const m of text.matchAll(symbolFirst)) {
    const code = CURRENCY_SYMBOL_TO_CODE[m[1]]
    if (code) out.add(`cur:${code}:${normalizeAmount(m[2])}`)
  }
  const symbolLast = /(\d{1,3}(?:,\d{3})*(?:\.\d+)?|\d+(?:\.\d+)?)\s?([$€£¥])/g
  for (const m of text.matchAll(symbolLast)) {
    const code = CURRENCY_SYMBOL_TO_CODE[m[2]]
    if (code) out.add(`cur:${code}:${normalizeAmount(m[1])}`)
  }
}

const extractPercent = (text: string, out: Set<string>): void => {
  const re = /(\d+(?:\.\d+)?)\s?%/g
  for (const m of text.matchAll(re)) out.add(`pct:${m[1]}`)
}

const extractQty = (text: string, out: Set<string>): void => {
  const re = new RegExp(`\\b(\\d+)\\s+(${QTY_UNITS.join('|')})\\b`, 'gi')
  for (const m of text.matchAll(re)) {
    out.add(`qty:${m[1]}:${m[2].toLowerCase()}`)
  }
  const apiCalls = /\b(\d+)\s+API\s+calls?\b/gi
  for (const m of text.matchAll(apiCalls)) out.add(`qty:${m[1]}:api_calls`)
}

const extractDates = (text: string, out: Set<string>): void => {
  const yearOnly = /\b(19|20)\d{2}\b/g
  for (const m of text.matchAll(yearOnly)) out.add(`date:${m[0]}`)

  const quarter = /\b(Q[1-4])\s?(\d{4})\b/gi
  for (const m of text.matchAll(quarter)) out.add(`date:${m[2]}-${m[1].toUpperCase()}`)

  const monthYear = /\b(jan|january|feb|february|mar|march|apr|april|may|jun|june|jul|july|aug|august|sep|sept|september|oct|october|nov|november|dec|december)\s+(\d{4})\b/gi
  for (const m of text.matchAll(monthYear)) {
    const mm = MONTH_TO_NUM[m[1].toLowerCase()]
    if (mm) out.add(`date:${m[2]}-${mm}`)
  }
}

const extractCounts = (text: string, out: Set<string>): void => {
  const re = /\b(?:over\s+|more\s+than\s+)?(\d{1,3}(?:,\d{3})+)\b/gi
  for (const m of text.matchAll(re)) {
    const n = Number.parseInt(m[1].replace(/,/g, ''), 10)
    if (Number.isFinite(n)) out.add(`count:${n}`)
  }
}

export function extractNumericFingerprint(text: string): Set<string> {
  const out = new Set<string>()
  extractCurrency(text, out)
  extractPercent(text, out)
  extractQty(text, out)
  extractDates(text, out)
  extractCounts(text, out)
  return out
}

export function diffNumericFingerprints(
  oldText: string,
  newText: string,
): NumericDelta | null {
  const oldSet = extractNumericFingerprint(oldText)
  const newSet = extractNumericFingerprint(newText)
  const added: string[] = []
  const removed: string[] = []
  for (const t of newSet) if (!oldSet.has(t)) added.push(t)
  for (const t of oldSet) if (!newSet.has(t)) removed.push(t)
  if (added.length === 0 && removed.length === 0) return null
  added.sort()
  removed.sort()
  return { added, removed }
}
