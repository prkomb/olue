import { JSDOM } from 'jsdom'
import { Defuddle } from 'defuddle/node'

export interface Extracted {
  title: string | undefined
  markdown: string
  textLength: number
}

export async function extract(html: string, url: string): Promise<Extracted> {
  const dom = new JSDOM(html, { url })
  const result = await Defuddle(dom, url, { markdown: true })
  const md = (result?.content ?? '').trim()
  return {
    title: typeof result?.title === 'string' && result.title.trim().length > 0 ? result.title.trim() : undefined,
    markdown: md,
    textLength: md.length,
  }
}
