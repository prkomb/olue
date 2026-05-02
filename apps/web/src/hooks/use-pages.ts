import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { api } from '@/lib/api'
import { competitorRunKey } from '@/hooks/use-competitors'
import type { Change } from '@/types/domain'

export const pagesKey = (competitorId: string) => ['competitors', competitorId, 'pages'] as const
export const pageChangesKey = (pageId: string) => ['changes', 'page', pageId] as const

export function useCompetitorPages(competitorId: string | undefined) {
  return useQuery({
    queryKey: competitorId ? pagesKey(competitorId) : ['competitors', 'none', 'pages'],
    queryFn: () => api.pages.list(competitorId!),
    enabled: !!competitorId,
  })
}

export function usePageChanges(competitorId: string | undefined, pageId: string | undefined) {
  return useQuery<Change[]>({
    queryKey: pageId ? pageChangesKey(pageId) : ['changes', 'page', 'none'],
    queryFn: () => api.changes.list({ competitorId, pageId: pageId! }),
    enabled: !!pageId,
  })
}

export function useAddPage(competitorId: string) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (url: string) => api.pages.add(competitorId, url),
    onSuccess: (data) => {
      qc.setQueryData(competitorRunKey(competitorId), data)
      qc.invalidateQueries({ queryKey: pagesKey(competitorId) })
    },
  })
}

export function useUpdatePageUrl(competitorId: string) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ pageId, url }: { pageId: string; url: string }) =>
      api.pages.update(competitorId, pageId, url),
    onSuccess: (data) => {
      qc.setQueryData(competitorRunKey(competitorId), data)
      qc.invalidateQueries({ queryKey: pagesKey(competitorId) })
    },
  })
}

export function useRemovePage(competitorId: string) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (pageId: string) => api.pages.remove(competitorId, pageId),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: pagesKey(competitorId) })
      qc.invalidateQueries({ queryKey: ['changes'] })
    },
  })
}

export function useRecheckPage(competitorId: string) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (pageId: string) => api.pages.recheck(competitorId, pageId),
    onSuccess: (data) => {
      qc.setQueryData(competitorRunKey(competitorId), data)
      qc.invalidateQueries({ queryKey: pagesKey(competitorId) })
    },
  })
}

export function useTogglePageIgnored(competitorId: string) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ pageId, ignored }: { pageId: string; ignored: boolean }) =>
      api.pages.setIgnored(competitorId, pageId, ignored),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: pagesKey(competitorId) })
      qc.invalidateQueries({ queryKey: ['changes'] })
    },
  })
}
