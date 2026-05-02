import diffMatchPatch from 'diff-match-patch'
import type { Chunk } from '../../schemas/page.js'
import { cosine } from './cosine.js'
import {
  diffNumericFingerprints,
  type NumericDelta,
} from '../../utils/numeric-fingerprint.js'

const dmp = new diffMatchPatch.diff_match_patch()

export const SIM_UNCHANGED = 0.92
export const SIM_NEW_FLOOR = 0.7
export const MIN_CHANGED_CHARS = 40
export const MIN_NEW_OR_REMOVED_CHARS = 80
export const MIN_TOTAL_CHANGE_BYTES = 200

const BOILERPLATE_HEADINGS = [
  'cookie',
  'privacy',
  'terms',
  'legal',
  'footer',
  'navigation',
  'subscribe',
  'newsletter',
  'social',
  'follow us',
]

const isBoilerplate = (chunk: Chunk): boolean => {
  const path = chunk.headingPath.join(' ').toLowerCase()
  return BOILERPLATE_HEADINGS.some((kw) => path.includes(kw))
}

const charDelta = (a: string, b: string): number => {
  const diffs = dmp.diff_main(a, b)
  dmp.diff_cleanupSemantic(diffs)
  let delta = 0
  for (const [op, text] of diffs) {
    if (op !== 0) delta += text.length
  }
  return delta
}

export type DiffEntry =
  | { kind: 'unchanged'; oldChunk: Chunk; newChunk: Chunk; sim: number }
  | {
      kind: 'changed'
      oldChunk: Chunk
      newChunk: Chunk
      sim: number
      numericDelta?: NumericDelta
    }
  | { kind: 'new'; newChunk: Chunk }
  | { kind: 'removed'; oldChunk: Chunk }

export interface DiffResult {
  entries: DiffEntry[]
  hasChanges: boolean
  counts: { unchanged: number; changed: number; added: number; removed: number }
}

export function diffChunks(oldChunks: Chunk[], newChunks: Chunk[]): DiffResult {
  const oldFiltered = oldChunks.filter((c) => !isBoilerplate(c))
  const newFiltered = newChunks.filter((c) => !isBoilerplate(c))

  const matchedOld = new Set<string>()
  const entries: DiffEntry[] = []

  for (const nc of newFiltered) {
    let bestSim = -1
    let bestOld: Chunk | null = null
    for (const oc of oldFiltered) {
      if (matchedOld.has(oc.id)) continue
      const s = cosine(nc.embedding, oc.embedding)
      if (s > bestSim) {
        bestSim = s
        bestOld = oc
      }
    }
    if (bestOld && bestSim >= SIM_NEW_FLOOR) {
      matchedOld.add(bestOld.id)
      const numericDelta = diffNumericFingerprints(bestOld.text, nc.text)
      if (bestSim >= SIM_UNCHANGED) {
        if (numericDelta) {
          entries.push({
            kind: 'changed',
            oldChunk: bestOld,
            newChunk: nc,
            sim: bestSim,
            numericDelta,
          })
        } else {
          entries.push({ kind: 'unchanged', oldChunk: bestOld, newChunk: nc, sim: bestSim })
        }
        continue
      }
      const delta = charDelta(bestOld.text, nc.text)
      if (delta < MIN_CHANGED_CHARS && !numericDelta) {
        entries.push({ kind: 'unchanged', oldChunk: bestOld, newChunk: nc, sim: bestSim })
      } else {
        entries.push({
          kind: 'changed',
          oldChunk: bestOld,
          newChunk: nc,
          sim: bestSim,
          ...(numericDelta ? { numericDelta } : {}),
        })
      }
    } else {
      if (nc.text.length >= MIN_NEW_OR_REMOVED_CHARS) {
        entries.push({ kind: 'new', newChunk: nc })
      } else {
        entries.push({ kind: 'unchanged', oldChunk: nc, newChunk: nc, sim: 1 })
      }
    }
  }

  for (const oc of oldFiltered) {
    if (matchedOld.has(oc.id)) continue
    if (oc.text.length >= MIN_NEW_OR_REMOVED_CHARS) {
      entries.push({ kind: 'removed', oldChunk: oc })
    }
  }

  const counts = {
    unchanged: entries.filter((e) => e.kind === 'unchanged').length,
    changed: entries.filter((e) => e.kind === 'changed').length,
    added: entries.filter((e) => e.kind === 'new').length,
    removed: entries.filter((e) => e.kind === 'removed').length,
  }

  let totalDeltaBytes = 0
  for (const e of entries) {
    if (e.kind === 'changed') totalDeltaBytes += charDelta(e.oldChunk.text, e.newChunk.text)
    else if (e.kind === 'new') totalDeltaBytes += e.newChunk.text.length
    else if (e.kind === 'removed') totalDeltaBytes += e.oldChunk.text.length
  }

  const hasNumericDelta = entries.some(
    (e) => e.kind === 'changed' && e.numericDelta !== undefined,
  )
  const hasChanges =
    counts.changed + counts.added + counts.removed > 0 &&
    (totalDeltaBytes >= MIN_TOTAL_CHANGE_BYTES || hasNumericDelta)

  return { entries, hasChanges, counts }
}
