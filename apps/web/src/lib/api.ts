import ky, { HTTPError } from 'ky'
import type { Change, Competitor, CompetitorInput, Page, RunState } from '@/types/domain'

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
