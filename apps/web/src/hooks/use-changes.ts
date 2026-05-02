import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { api } from '@/lib/api'
import type { Change } from '@/types/domain'

const CHANGES_ROOT = ['changes'] as const
const changesKey = (competitorId?: string) =>
  [...CHANGES_ROOT, competitorId ?? 'all'] as const

export function useChanges(competitorId?: string) {
  return useQuery({
    queryKey: changesKey(competitorId),
    queryFn: () => api.changes.list({ competitorId }),
  })
}

export function useSetChangeRead() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, read }: { id: string; read: boolean }) =>
      api.changes.setRead(id, read),
    onMutate: async ({ id, read }) => {
      await qc.cancelQueries({ queryKey: CHANGES_ROOT })
      const snapshots = qc.getQueriesData<Change[]>({ queryKey: CHANGES_ROOT })
      for (const [key, data] of snapshots) {
        if (!data) continue
        qc.setQueryData<Change[]>(
          key,
          data.map((c) => (c.id === id ? { ...c, read } : c)),
        )
      }
      return { snapshots }
    },
    onError: (_err, _vars, ctx) => {
      ctx?.snapshots.forEach(([key, data]) => {
        qc.setQueryData(key, data)
      })
    },
    onSettled: () => {
      qc.invalidateQueries({ queryKey: CHANGES_ROOT })
    },
  })
}

export function useSetAllRead() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ read, competitorId }: { read: boolean; competitorId?: string }) =>
      api.changes.setReadAll(read, competitorId),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: CHANGES_ROOT })
    },
  })
}
