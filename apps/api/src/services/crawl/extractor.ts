import { createHash } from 'node:crypto'
import { Defuddle } from 'defuddle/node'
import { JSDOM } from 'jsdom'

export interface Extracted {
  title: string | undefined
  markdown: string
  textLength: number
  bodyTextLength: number
  linkCount: number
  headingCount: number
  structuralHash: string
}

const STRIP_SELECTORS = ['script', 'style', 'noscript', 'template', 'iframe']

export async function extract(html: string, url: string): Promise<Extracted> {
  const dom = new JSDOM(html, { url })
  const doc = dom.window.document
  const result = await Defuddle(dom, url, { markdown: true })
  const defuddleMd = (result?.content ?? '').trim()

  const title =
    typeof result?.title === 'string' && result.title.trim().length > 0
      ? result.title.trim()
      : undefined

  const body = doc.body
  const cleanBody = body?.cloneNode(true) as HTMLElement | undefined
  if (cleanBody) {
    cleanBody.querySelectorAll(STRIP_SELECTORS.join(',')).forEach((el) => {
      el.remove()
    })
  }

  const bodyPlaintext = cleanBody
    ? (cleanBody.textContent ?? '').replace(/\s+/g, ' ').trim()
    : ''
  const bodyTextLength = bodyPlaintext.length
  const structuralHash = createHash('sha256')
    .update(bodyPlaintext.toLowerCase())
    .digest('hex')

  let linkCount = 0
  if (cleanBody) {
    const seen = new Set<string>()
    cleanBody.querySelectorAll('a[href]').forEach((a) => {
      const href = (a.getAttribute('href') ?? '').trim()
      const text = (a.textContent ?? '').replace(/\s+/g, ' ').trim()
      if (!href || !text) return
      const key = `${href}|${text}`
      if (seen.has(key)) return
      seen.add(key)
      linkCount++
    })
  }

  const headingNodes = cleanBody ? cleanBody.querySelectorAll('h1, h2, h3, h4') : []
  const headingCount = headingNodes.length
  const headingLines: string[] = []
  headingNodes.forEach((h) => {
    const text = (h.textContent ?? '').replace(/\s+/g, ' ').trim()
    if (text) headingLines.push(`${h.tagName.toUpperCase()}: ${text}`)
  })

  const metaLines = [
    '## Page outline',
    title ? `Title: ${title}` : null,
    `URL: ${url}`,
    ...headingLines,
    `Body fingerprint: ${structuralHash}`,
  ].filter((l): l is string => l !== null)
  const metaBlock = metaLines.join('\n')

  const markdown = defuddleMd ? `${metaBlock}\n\n---\n\n${defuddleMd}` : metaBlock

  return {
    title,
    markdown,
    textLength: markdown.length,
    bodyTextLength,
    linkCount,
    headingCount,
    structuralHash,
  }
}
