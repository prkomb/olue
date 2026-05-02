// Chrome / Edge / Safari 18+ text-fragment URL: scrolls to + highlights matching text.
// Spec: https://wicg.github.io/scroll-to-text-fragment/
// Format: <url>#:~:text=<encoded snippet>

const MAX_SNIPPET_CHARS = 90

export function buildOriginUrl(pageUrl: string, snippet: string): string {
  const cleaned = cleanSnippet(snippet)
  if (!cleaned) return pageUrl
  return `${pageUrl}#:~:text=${encodeURIComponent(cleaned)}`
}

function cleanSnippet(text: string): string {
  if (!text) return ''
  let s = text
    .replace(/!\[[^\]]*\]\([^)]*\)/g, '')
    .replace(/\[([^\]]*)\]\([^)]*\)/g, '$1')
    .replace(/\s+/g, ' ')
    .trim()
  if (s.length > MAX_SNIPPET_CHARS) {
    s = s.slice(0, MAX_SNIPPET_CHARS)
    const lastSpace = s.lastIndexOf(' ')
    if (lastSpace > MAX_SNIPPET_CHARS / 2) s = s.slice(0, lastSpace)
  }
  s = s.replace(/[.,;:!?…]+$/u, '').trim()
  return s
}
