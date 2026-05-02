import ky from 'ky'
import * as cheerio from 'cheerio'
import { extract } from '../services/crawl/extractor.js'
import { discoverUrls } from '../services/crawl/sitemap.js'
import { heuristicRank } from '../services/crawl/page-ranker.js'
import { chunkMarkdown } from '../services/embedding/chunker.js'
import { browserHeaders } from '../services/crawl/user-agents.js'

async function fetchStatic(url: string): Promise<string> {
  const html = await ky
    .get(url, { timeout: 20_000, redirect: 'follow', headers: browserHeaders() })
    .text()
  if (!cheerio.load(html)('body').length) throw new Error('no body')
  return html
}

async function run() {
  const target = process.argv[2] ?? 'https://www.mbunity.com'
  console.log(`[dry] target = ${target}`)

  console.log('[dry] discover sitemap…')
  const { urls, robotsTxt, crawlDelayMs } = await discoverUrls(target)
  console.log(`[dry] candidates: ${urls.length}, crawl-delay: ${crawlDelayMs}ms, robots: ${robotsTxt ? 'yes' : 'no'}`)

  const top = heuristicRank(urls, 10)
  console.log(`[dry] heuristic top-10:`)
  for (const u of top) console.log(`   - ${u}`)

  console.log('\n[dry] fetching landing page (static)…')
  const html = await fetchStatic(target)
  console.log(`[dry] html bytes: ${html.length}`)

  const ext = await extract(html, target)
  console.log(`[dry] title: ${ext.title ?? '(none)'}`)
  console.log(`[dry] markdown bytes: ${ext.textLength}`)
  console.log(`[dry] markdown preview (first 600 chars):\n---\n${ext.markdown.slice(0, 600)}\n---`)

  const chunks = chunkMarkdown(ext.markdown, ext.title)
  console.log(`\n[dry] chunks: ${chunks.length}`)
  for (const c of chunks.slice(0, 3)) {
    console.log(`   #${c.idx} [${c.headingPath.join(' > ') || '(root)'}] ${c.text.length} chars`)
    console.log(`      ${c.text.slice(0, 200).replace(/\n/g, ' ')}…`)
  }
}

run().catch((err) => {
  console.error('[dry] failed:', err)
  process.exit(1)
})
