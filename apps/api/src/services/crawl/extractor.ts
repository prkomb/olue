import { Defuddle } from 'defuddle/node'
import { JSDOM } from 'jsdom'

export interface Extracted {
  title: string | undefined
  markdown: string
  textLength: number
  bodyTextLength: number
  linkCount: number
  headingCount: number
}

export async function extract(html: string, url: string): Promise<Extracted> {
  const dom = new JSDOM(html, { url })
  const doc = dom.window.document
  const result = await Defuddle(dom, url, { markdown: true })
  const md = (result?.content ?? '').trim()

  const body = doc.body
  const bodyTextLength = body
    ? (body.textContent ?? '').replace(/\s+/g, ' ').trim().length
    : 0

  let linkCount = 0
  if (body) {
    const seen = new Set<string>()
    body.querySelectorAll('a[href]').forEach((a) => {
      const href = (a.getAttribute('href') ?? '').trim()
      const text = (a.textContent ?? '').replace(/\s+/g, ' ').trim()
      if (!href || !text) return
      const key = `${href}|${text}`
      if (seen.has(key)) return
      seen.add(key)
      linkCount++
    })
  }

  const headingCount = body ? body.querySelectorAll('h1, h2, h3, h4').length : 0

  return {
    title:
      typeof result?.title === 'string' && result.title.trim().length > 0
        ? result.title.trim()
        : undefined,
    markdown: md,
    textLength: md.length,
    bodyTextLength,
    linkCount,
    headingCount,
  }
}
