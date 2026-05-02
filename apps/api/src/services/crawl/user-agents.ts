// Generates realistic, varied browser fingerprints. Each call returns a different
// UA + matching Sec-CH-UA hints. Pool reshuffles so the same UA isn't reused
// back-to-back. Versions kept current for 2026.

interface UAProfile {
  ua: string
  brand: string
  brandVersion: string
  platform: '"macOS"' | '"Windows"' | '"Linux"'
  mobile: '?0'
}

// Keep these versions close to "latest stable" for the family. Update periodically.
const CHROME_VERSIONS = ['131.0.0.0', '130.0.0.0', '129.0.0.0', '128.0.0.0']
const FIREFOX_VERSIONS = ['132.0', '131.0', '130.0']
const SAFARI_FAMILIES = [
  { ver: '17.6', webkit: '605.1.15' },
  { ver: '17.5', webkit: '605.1.15' },
  { ver: '17.4', webkit: '605.1.15' },
]
const EDGE_VERSIONS = ['131.0.0.0', '130.0.0.0']
const MAC_VERS = ['14_6_0', '14_5_0', '13_6_0', '10_15_7']
const WIN_VER = '10.0; Win64; x64'

function pick<T>(arr: readonly T[]): T {
  return arr[Math.floor(Math.random() * arr.length)]
}

function chromeMac(): UAProfile {
  const v = pick(CHROME_VERSIONS)
  const macv = pick(MAC_VERS)
  return {
    ua: `Mozilla/5.0 (Macintosh; Intel Mac OS X ${macv}) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/${v} Safari/537.36`,
    brand: 'Google Chrome',
    brandVersion: v.split('.')[0],
    platform: '"macOS"',
    mobile: '?0',
  }
}

function chromeWin(): UAProfile {
  const v = pick(CHROME_VERSIONS)
  return {
    ua: `Mozilla/5.0 (Windows NT ${WIN_VER}) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/${v} Safari/537.36`,
    brand: 'Google Chrome',
    brandVersion: v.split('.')[0],
    platform: '"Windows"',
    mobile: '?0',
  }
}

function chromeLinux(): UAProfile {
  const v = pick(CHROME_VERSIONS)
  return {
    ua: `Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/${v} Safari/537.36`,
    brand: 'Google Chrome',
    brandVersion: v.split('.')[0],
    platform: '"Linux"',
    mobile: '?0',
  }
}

function firefoxMac(): UAProfile {
  const v = pick(FIREFOX_VERSIONS)
  return {
    ua: `Mozilla/5.0 (Macintosh; Intel Mac OS X 10.15; rv:${v}) Gecko/20100101 Firefox/${v}`,
    brand: 'Firefox',
    brandVersion: v.split('.')[0],
    platform: '"macOS"',
    mobile: '?0',
  }
}

function firefoxWin(): UAProfile {
  const v = pick(FIREFOX_VERSIONS)
  return {
    ua: `Mozilla/5.0 (Windows NT ${WIN_VER}; rv:${v}) Gecko/20100101 Firefox/${v}`,
    brand: 'Firefox',
    brandVersion: v.split('.')[0],
    platform: '"Windows"',
    mobile: '?0',
  }
}

function safariMac(): UAProfile {
  const sf = pick(SAFARI_FAMILIES)
  const macv = pick(MAC_VERS)
  return {
    ua: `Mozilla/5.0 (Macintosh; Intel Mac OS X ${macv}) AppleWebKit/${sf.webkit} (KHTML, like Gecko) Version/${sf.ver} Safari/${sf.webkit}`,
    brand: 'Safari',
    brandVersion: sf.ver.split('.')[0],
    platform: '"macOS"',
    mobile: '?0',
  }
}

function edgeWin(): UAProfile {
  const v = pick(EDGE_VERSIONS)
  return {
    ua: `Mozilla/5.0 (Windows NT ${WIN_VER}) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/${v} Safari/537.36 Edg/${v}`,
    brand: 'Microsoft Edge',
    brandVersion: v.split('.')[0],
    platform: '"Windows"',
    mobile: '?0',
  }
}

const GENERATORS: Array<() => UAProfile> = [
  chromeMac,
  chromeMac,
  chromeWin,
  chromeWin,
  chromeLinux,
  firefoxMac,
  firefoxWin,
  safariMac,
  safariMac,
  edgeWin,
]

let lastUA: string | null = null

export function randomProfile(): UAProfile {
  let p = pick(GENERATORS)()
  let guard = 0
  while (p.ua === lastUA && guard++ < 6) p = pick(GENERATORS)()
  lastUA = p.ua
  return p
}

const ACCEPT_LANGUAGES = [
  'en-US,en;q=0.9',
  'en-GB,en;q=0.9',
  'en-US,en;q=0.8,fr;q=0.6',
  'en-US,en;q=0.9,de;q=0.7',
  'en-US,en;q=0.9,es;q=0.7',
]

export function browserHeaders(): Record<string, string> {
  const p = randomProfile()
  const headers: Record<string, string> = {
    'user-agent': p.ua,
    'accept':
      'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8',
    'accept-language': pick(ACCEPT_LANGUAGES),
    'accept-encoding': 'gzip, deflate, br',
    'sec-fetch-dest': 'document',
    'sec-fetch-mode': 'navigate',
    'sec-fetch-site': 'none',
    'sec-fetch-user': '?1',
    'upgrade-insecure-requests': '1',
    'cache-control': 'no-cache',
    'pragma': 'no-cache',
  }
  if (p.brand === 'Google Chrome' || p.brand === 'Microsoft Edge') {
    const v = p.brandVersion
    const brandList =
      p.brand === 'Microsoft Edge'
        ? `"Chromium";v="${v}", "Microsoft Edge";v="${v}", "Not_A Brand";v="24"`
        : `"Chromium";v="${v}", "Google Chrome";v="${v}", "Not_A Brand";v="24"`
    headers['sec-ch-ua'] = brandList
    headers['sec-ch-ua-mobile'] = p.mobile
    headers['sec-ch-ua-platform'] = p.platform
  }
  return headers
}

export function randomUserAgent(): string {
  return randomProfile().ua
}
