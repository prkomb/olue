import { useMemo, useState } from 'react'
import { NavLink } from 'react-router-dom'
import { LayoutDashboard, Plus, Trash2 } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Separator } from '@/components/ui/separator'
import { Skeleton } from '@/components/ui/skeleton'
import { cn } from '@/lib/utils'
import { useChanges } from '@/hooks/use-changes'
import { useCompetitors } from '@/hooks/use-competitors'
import { CompetitorAvatar } from '@/components/competitor-avatar'
import { CompetitorDialog } from '@/components/competitor-dialog'
import { DeleteCompetitorDialog } from '@/components/delete-competitor-dialog'
import type { Competitor } from '@/types/domain'

export function AppSidebar() {
  const { data: competitors, isLoading } = useCompetitors()
  const { data: changes } = useChanges()
  const [addOpen, setAddOpen] = useState(false)
  const [deleting, setDeleting] = useState<Competitor | null>(null)

  const unreadByCompetitor = useMemo(() => {
    const m = new Map<string, number>()
    if (!changes) return m
    for (const c of changes) {
      if (c.read) continue
      m.set(c.competitorId, (m.get(c.competitorId) ?? 0) + 1)
    }
    return m
  }, [changes])

  return (
    <aside className="flex h-screen w-64 shrink-0 flex-col border-r bg-sidebar text-sidebar-foreground">
      <div className="flex items-center gap-2 px-4 py-4">
        <img src="/favicon.svg" alt="" aria-hidden className="h-8 w-8" />
        <div className="leading-tight">
          <div className="text-sm font-semibold">Olue</div>
          <div className="text-[11px] text-muted-foreground">Competitive Intelligence</div>
        </div>
      </div>

      <Separator />

      <nav className="px-2 py-2">
        <NavLink
          to="/"
          end
          className={({ isActive }) =>
            cn(
              'flex items-center gap-2 rounded-md px-2 py-1.5 text-sm transition-colors',
              isActive
                ? 'bg-sidebar-accent text-sidebar-accent-foreground'
                : 'text-muted-foreground hover:bg-sidebar-accent/60 hover:text-sidebar-accent-foreground',
            )
          }
        >
          <LayoutDashboard className="h-4 w-4" />
          Dashboard
        </NavLink>
      </nav>

      <Separator />

      <div className="flex items-center justify-between px-4 pt-3 pb-1">
        <span className="text-[11px] font-medium tracking-wide text-muted-foreground uppercase">
          Competitors
        </span>
        <span className="text-[11px] text-muted-foreground">
          {competitors?.length ?? 0}
        </span>
      </div>

      <ScrollArea className="flex-1">
        <ul className="space-y-0.5 px-2 pb-2">
          {isLoading &&
            ['s1', 's2', 's3'].map((k) => (
              <li key={k} className="flex items-center gap-2 px-2 py-1.5">
                <Skeleton className="h-5 w-5 rounded-md" />
                <Skeleton className="h-4 flex-1" />
              </li>
            ))}
          {competitors?.map((c) => {
            const unread = unreadByCompetitor.get(c.id) ?? 0
            const hasUnread = unread > 0
            return (
              <li key={c.id} className="group">
                <NavLink
                  to={`/competitors/${c.id}`}
                  className={({ isActive }) =>
                    cn(
                      'flex items-center gap-2 rounded-md px-2 py-1.5 text-sm transition-colors',
                      isActive
                        ? 'bg-sidebar-accent text-sidebar-accent-foreground'
                        : 'text-foreground/80 hover:bg-sidebar-accent/60',
                    )
                  }
                >
                  <CompetitorAvatar name={c.name} website={c.website} size={20} />
                  <span className={cn('truncate', hasUnread && 'font-medium')}>{c.name}</span>
                  <div className="ml-auto flex shrink-0 items-center">
                    {hasUnread && (
                      <Badge
                        aria-label={`${unread} unread changes`}
                        className="h-4.5 min-w-4.5 rounded-full border-0 bg-[#FF3B30] px-1.5 text-[10px] font-bold leading-none tabular-nums text-white shadow-sm ring-2 ring-sidebar transition-opacity group-hover:opacity-0"
                      >
                        {unread > 99 ? '99+' : unread}
                      </Badge>
                    )}
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      className={cn(
                        'h-6 w-6 text-muted-foreground opacity-0 transition-opacity group-hover:opacity-100 hover:bg-destructive/10 hover:text-destructive',
                        hasUnread && '-ml-5',
                      )}
                      onClick={(e) => {
                        e.preventDefault()
                        e.stopPropagation()
                        setDeleting(c)
                      }}
                      aria-label={`Remove ${c.name}`}
                    >
                      <Trash2 className="h-3 w-3" />
                    </Button>
                  </div>
                </NavLink>
              </li>
            )
          })}
        </ul>
      </ScrollArea>

      <div className="border-t p-3">
        <Button
          variant="outline"
          className="w-full justify-start"
          onClick={() => setAddOpen(true)}
        >
          <Plus className="h-4 w-4" />
          Add competitor
        </Button>
      </div>

      <CompetitorDialog open={addOpen} onOpenChange={setAddOpen} />
      <DeleteCompetitorDialog
        competitor={deleting}
        onOpenChange={(open) => !open && setDeleting(null)}
      />
    </aside>
  )
}
