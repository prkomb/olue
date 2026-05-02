import { useQueries } from '@tanstack/react-query'
import { Check, ChevronDown, FileText } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Skeleton } from '@/components/ui/skeleton'
import { api } from '@/lib/api'
import { cn } from '@/lib/utils'
import type { Competitor, Page } from '@/types/domain'

interface Props {
  competitors: Competitor[]
  selectedIds: string[]
  onChange: (ids: string[]) => void
}

export function PageMultiSelect({ competitors, selectedIds, onChange }: Props) {
  const enabled = competitors.length > 0

  const queries = useQueries({
    queries: competitors.map((c) => ({
      queryKey: ['competitors', c.id, 'pages'] as const,
      queryFn: () => api.pages.list(c.id),
      enabled,
    })),
  })

  const isLoading = queries.some((q) => q.isLoading)

  const grouped: Array<{ competitor: Competitor; pages: Page[] }> = competitors.map((c, i) => ({
    competitor: c,
    pages: (queries[i]?.data ?? []).filter((p) => !p.ignored && p.status !== 'failed'),
  }))

  const toggle = (id: string) => {
    if (selectedIds.includes(id)) onChange(selectedIds.filter((x) => x !== id))
    else onChange([...selectedIds, id])
  }

  const label =
    selectedIds.length === 0
      ? 'All pages'
      : `${selectedIds.length} page${selectedIds.length === 1 ? '' : 's'}`

  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          disabled={!enabled}
          className="justify-between gap-2 min-w-44"
        >
          <span className="flex items-center gap-2 truncate">
            <FileText className="h-4 w-4 text-muted-foreground" />
            <span className="truncate">{label}</span>
          </span>
          <ChevronDown className="h-4 w-4 text-muted-foreground" />
        </Button>
      </PopoverTrigger>
      <PopoverContent align="start" className="w-80 p-0">
        <div className="flex items-center justify-between border-b px-3 py-2">
          <span className="text-xs font-medium text-muted-foreground">
            {selectedIds.length === 0
              ? 'Empty selection = all pages'
              : `${selectedIds.length} selected`}
          </span>
          {selectedIds.length > 0 && (
            <button
              type="button"
              className="text-xs text-muted-foreground hover:text-foreground"
              onClick={() => onChange([])}
            >
              Clear
            </button>
          )}
        </div>
        <ScrollArea className="max-h-80">
          <div className="py-1">
            {isLoading && (
              <div className="space-y-2 px-3 py-2">
                <Skeleton className="h-4 w-3/4" />
                <Skeleton className="h-4 w-1/2" />
              </div>
            )}
            {!isLoading &&
              grouped.map(({ competitor, pages }) => (
                <div key={competitor.id}>
                  <div className="px-3 pt-2 pb-1 text-[11px] font-semibold tracking-wider text-muted-foreground uppercase">
                    {competitor.name}
                  </div>
                  {pages.length === 0 ? (
                    <div className="px-3 pb-2 text-xs text-muted-foreground">
                      No pages crawled
                    </div>
                  ) : (
                    <ul>
                      {pages.map((p) => {
                        const checked = selectedIds.includes(p.id)
                        return (
                          <li key={p.id}>
                            <button
                              type="button"
                              onClick={() => toggle(p.id)}
                              className={cn(
                                'flex w-full items-center gap-2 px-3 py-1.5 text-left text-sm hover:bg-accent',
                                checked && 'bg-accent/50',
                              )}
                            >
                              <span className="flex-1 truncate">
                                {p.title || p.url}
                              </span>
                              {checked && <Check className="h-4 w-4 text-primary" />}
                            </button>
                          </li>
                        )
                      })}
                    </ul>
                  )}
                </div>
              ))}
          </div>
        </ScrollArea>
      </PopoverContent>
    </Popover>
  )
}
