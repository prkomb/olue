import diffMatchPatch from 'diff-match-patch'

const DMP = new diffMatchPatch.diff_match_patch()

export interface VisualDiff {
  before: string
  after: string
  unifiedHtml: string
}

const truncate = (s: string, max = 1_500) =>
  s.length > max ? `${s.slice(0, max - 1)}…` : s

export function buildVisualDiff(oldText: string, newText: string): VisualDiff {
  const a = truncate(oldText)
  const b = truncate(newText)
  const diffs = DMP.diff_main(a, b)
  DMP.diff_cleanupSemantic(diffs)
  return {
    before: a,
    after: b,
    unifiedHtml: DMP.diff_prettyHtml(diffs),
  }
}
