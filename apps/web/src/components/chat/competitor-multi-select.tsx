import { Check, ChevronDown, Users } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { ScrollArea } from '@/components/ui/scroll-area'
import { CompetitorAvatar } from '@/components/competitor-avatar'
import { cn } from '@/lib/utils'
import type { Competitor } from '@/types/domain'

interface Props {
  competitors: Competitor[]
  selectedIds: string[]
  onChange: (ids: string[]) => void
  loading?: boolean
}

export function CompetitorMultiSelect({ competitors, selectedIds, onChange, loading }: Props) {
  const selected = competitors.filter((c) => selectedIds.includes(c.id))

  const toggle = (id: string) => {
    if (selectedIds.includes(id)) onChange(selectedIds.filter((x) => x !== id))
    else onChange([...selectedIds, id])
  }

  const label =
    selected.length === 0
      ? 'Select competitors'
      : selected.length === 1
        ? selected[0].name
        : `${selected[0].name} + ${selected.length - 1} more`

  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button variant="outline" className="justify-between gap-2 min-w-56">
          <span className="flex items-center gap-2 truncate">
            <Users className="h-4 w-4 text-muted-foreground" />
            <span className="truncate">{label}</span>
          </span>
          <ChevronDown className="h-4 w-4 text-muted-foreground" />
        </Button>
      </PopoverTrigger>
      <PopoverContent align="start" className="w-72 p-0">
        <div className="flex items-center justify-between border-b px-3 py-2">
          <span className="text-xs font-medium text-muted-foreground">
            {selected.length} selected
          </span>
          {selected.length > 0 && (
            <button
              type="button"
              className="text-xs text-muted-foreground hover:text-foreground"
              onClick={() => onChange([])}
            >
              Clear
            </button>
          )}
        </div>
        <ScrollArea className="max-h-72">
          <ul className="py-1">
            {loading && <li className="px-3 py-2 text-sm text-muted-foreground">Loading…</li>}
            {!loading && competitors.length === 0 && (
              <li className="px-3 py-6 text-center text-sm text-muted-foreground">
                No competitors yet
              </li>
            )}
            {competitors.map((c) => {
              const checked = selectedIds.includes(c.id)
              return (
                <li key={c.id}>
                  <button
                    type="button"
                    onClick={() => toggle(c.id)}
                    className={cn(
                      'flex w-full items-center gap-2 px-3 py-1.5 text-sm hover:bg-accent',
                      checked && 'bg-accent/50',
                    )}
                  >
                    <CompetitorAvatar name={c.name} website={c.website} size={20} />
                    <span className="flex-1 truncate text-left">{c.name}</span>
                    {checked && <Check className="h-4 w-4 text-primary" />}
                  </button>
                </li>
              )
            })}
          </ul>
        </ScrollArea>
      </PopoverContent>
    </Popover>
  )
}
