import { useEffect, useRef } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { api } from '@/lib/api'
import type { CompetitorInput, RunState } from '@/types/domain'

export const competitorsKey = ['competitors'] as const
export const competitorKey = (id: string) => ['competitors', id] as const
export const competitorRunKey = (id: string) => ['competitors', id, 'run'] as const

export function useCompetitors() {
  return useQuery({ queryKey: competitorsKey, queryFn: api.competitors.list })
}

export function useCompetitor(id: string | undefined) {
  return useQuery({
    queryKey: id ? competitorKey(id) : ['competitors', 'none'],
    queryFn: () => api.competitors.get(id!),
    enabled: !!id,
  })
}

export function useCreateCompetitor() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (input: CompetitorInput) => api.competitors.create(input),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: competitorsKey })
    },
  })
}

export function useUpdateCompetitor(id: string) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (input: Partial<CompetitorInput>) => api.competitors.update(id, input),
    onSuccess: (data) => {
      qc.setQueryData(competitorKey(id), data)
      qc.invalidateQueries({ queryKey: competitorsKey })
    },
  })
}

export function useDeleteCompetitor() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id: string) => api.competitors.remove(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: competitorsKey })
      qc.invalidateQueries({ queryKey: ['changes'] })
    },
  })
}

export function useCompetitorRun(id: string | undefined) {
  const qc = useQueryClient()
  const wasRunning = useRef(false)
  const query = useQuery({
    queryKey: id ? competitorRunKey(id) : ['competitors', 'none', 'run'],
    queryFn: () => api.competitors.getRun(id!),
    enabled: !!id,
    refetchInterval: (q) => ((q.state.data as RunState | undefined)?.running ? 1000 : false),
  })

  useEffect(() => {
    const running = query.data?.running ?? false
    if (wasRunning.current && !running) {
      qc.invalidateQueries({ queryKey: ['changes'] })
    }
    wasRunning.current = running
  }, [query.data?.running, qc])

  return query
}

export function useStartCompetitorRun(id: string) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: () => api.competitors.startRun(id),
    onSuccess: (data) => {
      qc.setQueryData(competitorRunKey(id), data)
    },
  })
}
