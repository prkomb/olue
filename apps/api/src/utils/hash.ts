import { createHash } from 'node:crypto'

export const sha256 = (input: string): string =>
  createHash('sha256').update(input).digest('hex')

export const sha256Short = (input: string): string => sha256(input).slice(0, 16)
