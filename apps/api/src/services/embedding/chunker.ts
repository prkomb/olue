export interface RawChunk {
  idx: number
  headingPath: string[]
  text: string
}

const TARGET_CHARS = 2_000
const OVERLAP_CHARS = 200
const MIN_CHARS = 80

export function chunkMarkdown(markdown: string, title?: string): RawChunk[] {
  const lines = markdown.split('\n')
  const out: RawChunk[] = []
  let headingPath: string[] = title ? [title] : []
  let buf: string[] = []

  const flush = () => {
    const text = buf.join('\n').trim()
    if (text.length < MIN_CHARS) {
      buf = []
      return
    }
    let cursor = 0
    while (cursor < text.length) {
      const end = Math.min(cursor + TARGET_CHARS, text.length)
      const slice = text.slice(cursor, end).trim()
      if (slice.length >= MIN_CHARS) {
        out.push({ idx: out.length, headingPath: [...headingPath], text: slice })
      }
      if (end >= text.length) break
      cursor = Math.max(cursor + TARGET_CHARS - OVERLAP_CHARS, cursor + 1)
    }
    buf = []
  }

  for (const line of lines) {
    const m = /^(#{1,3})\s+(.+?)\s*#*$/.exec(line)
    if (m) {
      flush()
      const level = m[1].length
      const heading = m[2].trim()
      headingPath = headingPath.slice(0, level - 1)
      headingPath[level - 1] = heading
      headingPath = headingPath.filter((s) => typeof s === 'string')
      continue
    }
    buf.push(line)
    const accumulated = buf.join('\n').length
    if (accumulated > TARGET_CHARS * 1.5) flush()
  }
  flush()

  return out
}
