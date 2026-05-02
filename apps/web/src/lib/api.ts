import ky, { HTTPError } from 'ky'
import type {
  Change,
  ChatMessage,
  ChatSource,
  Competitor,
  CompetitorInput,
  Page,
  RunState,
} from '@/types/domain'

export interface ChatStreamRequest {
  competitorIds: string[]
  pageIds?: string[]
  messages: Pick<ChatMessage, 'role' | 'content'>[]
}

export interface ChatStreamHandlers {
  onSource?: (sources: ChatSource[]) => void
  onToken?: (text: string) => void
  onDone?: () => void
  onError?: (message: string) => void
}

async function streamChat(
  body: ChatStreamRequest,
  handlers: ChatStreamHandlers,
  signal?: AbortSignal,
): Promise<void> {
  let res: Response
  try {
    res = await fetch('/api/chat', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
      signal,
    })
  } catch (err) {
    if ((err as { name?: string })?.name === 'AbortError') return
    handlers.onError?.((err as Error).message ?? 'network error')
    return
  }

  if (!res.ok || !res.body) {
    let message = `chat failed: ${res.status}`
    try {
      const data = (await res.json()) as { message?: string }
      if (data?.message) message = data.message
    } catch {
      // ignore
    }
    handlers.onError?.(message)
    return
  }

  const reader = res.body.getReader()
  const decoder = new TextDecoder()
  let buffer = ''

  const dispatch = (event: string, dataRaw: string) => {
    if (!dataRaw) return
    let data: unknown = null
    try {
      data = JSON.parse(dataRaw)
    } catch {
      return
    }
    switch (event) {
      case 'sources':
        handlers.onSource?.(data as ChatSource[])
        return
      case 'token':
        handlers.onToken?.((data as { text: string }).text)
        return
      case 'done':
        handlers.onDone?.()
        return
      case 'error':
        handlers.onError?.((data as { message: string }).message)
        return
    }
  }

  try {
    while (true) {
      const { value, done } = await reader.read()
      if (done) break
      buffer += decoder.decode(value, { stream: true })

      let sepIndex
      while ((sepIndex = buffer.indexOf('\n\n')) !== -1) {
        const block = buffer.slice(0, sepIndex)
        buffer = buffer.slice(sepIndex + 2)
        let event = 'message'
        const dataLines: string[] = []
        for (const line of block.split('\n')) {
          if (line.startsWith('event:')) event = line.slice(6).trim()
          else if (line.startsWith('data:')) dataLines.push(line.slice(5).trim())
        }
        dispatch(event, dataLines.join('\n'))
      }
    }
  } catch (err) {
    if ((err as { name?: string })?.name === 'AbortError') return
    handlers.onError?.((err as Error).message ?? 'stream error')
  }
}

const client = ky.create({
  prefix: '/api/',
  retry: 0,
})

export const api = {
  competitors: {
    list: () => client.get('competitors').json<Competitor[]>(),
    get: (id: string) => client.get(`competitors/${id}`).json<Competitor>(),
    create: (input: CompetitorInput) =>
      client.post('competitors', { json: input }).json<Competitor>(),
    update: (id: string, input: Partial<CompetitorInput>) =>
      client.patch(`competitors/${id}`, { json: input }).json<Competitor>(),
    remove: (id: string) =>
      client.delete(`competitors/${id}`).json<{ ok: true }>(),
    getRun: (id: string) => client.get(`competitors/${id}/run`).json<RunState>(),
    startRun: async (id: string): Promise<RunState> => {
      try {
        return await client.post(`competitors/${id}/run`).json<RunState>()
      } catch (err) {
        if (err instanceof HTTPError && err.response.status === 409) {
          return (await err.response.json()) as RunState
        }
        throw err
      }
    },
  },
  pages: {
    list: (competitorId: string) =>
      client.get(`competitors/${competitorId}/pages`).json<Page[]>(),
    add: async (competitorId: string, url: string): Promise<RunState> => {
      try {
        return await client.post(`competitors/${competitorId}/pages`, { json: { url } }).json<RunState>()
      } catch (err) {
        if (err instanceof HTTPError && err.response.status === 409) {
          return (await err.response.json()) as RunState
        }
        throw err
      }
    },
    update: async (competitorId: string, pageId: string, url: string): Promise<RunState> => {
      try {
        return await client
          .patch(`competitors/${competitorId}/pages/${pageId}`, { json: { url } })
          .json<RunState>()
      } catch (err) {
        if (err instanceof HTTPError && err.response.status === 409) {
          return (await err.response.json()) as RunState
        }
        throw err
      }
    },
    remove: (competitorId: string, pageId: string) =>
      client.delete(`competitors/${competitorId}/pages/${pageId}`).json<{ ok: true }>(),
    setIgnored: (competitorId: string, pageId: string, ignored: boolean) =>
      client
        .patch(`competitors/${competitorId}/pages/${pageId}/ignored`, { json: { ignored } })
        .json<Page>(),
    recheck: async (competitorId: string, pageId: string): Promise<RunState> => {
      try {
        return await client
          .post(`competitors/${competitorId}/pages/${pageId}/recheck`)
          .json<RunState>()
      } catch (err) {
        if (err instanceof HTTPError && err.response.status === 409) {
          return (await err.response.json()) as RunState
        }
        throw err
      }
    },
  },
  chat: {
    stream: streamChat,
  },
  changes: {
    list: (opts: { competitorId?: string; pageId?: string } = {}) => {
      const searchParams: Record<string, string> = {}
      if (opts.competitorId) searchParams.competitorId = opts.competitorId
      if (opts.pageId) searchParams.pageId = opts.pageId
      return client
        .get('changes', {
          searchParams: Object.keys(searchParams).length ? searchParams : undefined,
        })
        .json<Change[]>()
    },
    setRead: (id: string, read: boolean) =>
      client.patch(`changes/${id}/read`, { json: { read } }).json<Change>(),
    setReadAll: (read: boolean, competitorId?: string) =>
      client
        .post('changes/read-all', {
          searchParams: competitorId ? { competitorId } : undefined,
          json: { read },
        })
        .json<{ updated: number }>(),
  },
}
