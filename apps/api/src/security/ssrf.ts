import { useAgent } from 'request-filtering-agent'
import http from 'node:http'
import https from 'node:https'

const ALLOWED_PROTOCOLS = new Set(['http:', 'https:'])

export function isUrlSafe(rawUrl: string): boolean {
  try {
    const u = new URL(rawUrl)
    return ALLOWED_PROTOCOLS.has(u.protocol)
  } catch {
    return false
  }
}

export function assertUrlSafe(rawUrl: string): URL {
  const u = new URL(rawUrl)
  if (!ALLOWED_PROTOCOLS.has(u.protocol)) {
    throw new Error(`unsafe protocol: ${u.protocol}`)
  }
  return u
}

export function safeAgent(url: string): http.Agent | https.Agent {
  return useAgent(url, { allowIPAddressList: [], denyIPAddressList: ['169.254.0.0/16'] })
}

export async function safeFetch(url: string, init: RequestInit = {}): Promise<Response> {
  assertUrlSafe(url)
  const agent = safeAgent(url)
  const dispatcher = (init as { dispatcher?: unknown }).dispatcher
  void dispatcher
  return fetch(url, {
    ...init,
    // @ts-expect-error node fetch supports `agent`
    agent,
    redirect: init.redirect ?? 'follow',
  })
}
