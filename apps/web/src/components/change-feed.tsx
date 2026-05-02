import { useMemo, useState } from 'react'
import {
  ArrowDown,
  ArrowUp,
  Banknote,
  Boxes,
  CheckCheck,
  DollarSign,
  Equal,
  Inbox,
  Megaphone,
  Package,
  Users,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { ChangeCard } from '@/components/change-card'
import { EmptyState } from '@/components/empty-state'
import { FilterPills, type FilterOption } from '@/components/filter-pills'
import { cn } from '@/lib/utils'
import { useChanges, useSetAllRead } from '@/hooks/use-changes'
import { useCompetitors } from '@/hooks/use-competitors'
import type { Category, Competitor, Severity } from '@/types/domain'

const CATEGORY_OPTIONS: FilterOption<Category>[] = [
  { value: 'pricing', label: 'Pricing', icon: DollarSign },
  { value: 'product', label: 'Product', icon: Package },
  { value: 'messaging', label: 'Messaging', icon: Megaphone },
  { value: 'hiring', label: 'Hiring', icon: Users },
  { value: 'funding', label: 'Funding', icon: Banknote },
  { value: 'other', label: 'Other', icon: Boxes },
]

const SEVERITY_OPTIONS: FilterOption<Severity>[] = [
  { value: 'low', label: 'Low', icon: ArrowDown },
  { value: 'medium', label: 'Medium', icon: Equal },
  { value: 'high', label: 'High', icon: ArrowUp },
]

type ReadMode = 'all' | 'unread' | 'read'

const READ_MODES: { value: ReadMode; label: string }[] = [
  { value: 'all', label: 'All' },
  { value: 'unread', label: 'Unread' },
  { value: 'read', label: 'Read' },
]

interface Props {
  competitorId?: string
  title?: string
}

export function ChangeFeed({ competitorId, title }: Props) {
  const { data: changes, isLoading } = useChanges(competitorId)
  const { data: competitors } = useCompetitors()
  const setAllRead = useSetAllRead()
  const [categoryFilter, setCategoryFilter] = useState<Category[]>([])
  const [severityFilter, setSeverityFilter] = useState<Severity[]>([])
  const [readMode, setReadMode] = useState<ReadMode>('all')

  const competitorMap = useMemo(() => {
    const m = new Map<string, Competitor>()
    competitors?.forEach((c) => {
      m.set(c.id, c)
    })
    return m
  }, [competitors])

  const counts = useMemo(() => {
    const all = changes?.length ?? 0
    const unread = changes?.filter((c) => !c.read).length ?? 0
    return { all, unread, read: all - unread }
  }, [changes])

  const filtered = useMemo(() => {
    if (!changes) return []
    return changes.filter((c) => {
      if (readMode === 'unread' && c.read) return false
      if (readMode === 'read' && !c.read) return false
      if (categoryFilter.length && !categoryFilter.includes(c.category)) return false
      if (severityFilter.length && !severityFilter.includes(c.severity)) return false
      return true
    })
  }, [changes, readMode, categoryFilter, severityFilter])

  const grouped = useMemo(() => {
    const unread = filtered.filter((c) => !c.read)
    const read = filtered.filter((c) => c.read)
    return { unread, read }
  }, [filtered])

  const showMarkAll = counts.unread > 0 && (readMode === 'all' || readMode === 'unread')

  return (
    <div className="space-y-5">
      <div className="space-y-4">
        <FilterGroup label="Category">
          <FilterPills
            ariaLabel="Filter by category"
            options={CATEGORY_OPTIONS}
            value={categoryFilter}
            onChange={setCategoryFilter}
          />
        </FilterGroup>
        <FilterGroup label="Severity">
          <FilterPills
            ariaLabel="Filter by severity"
            options={SEVERITY_OPTIONS}
            value={severityFilter}
            onChange={setSeverityFilter}
          />
        </FilterGroup>
      </div>

      <div className="flex flex-wrap items-center justify-between gap-3">
        <div
          role="tablist"
          aria-label="Read status"
          className="inline-flex items-center rounded-full border bg-card p-1"
        >
          {READ_MODES.map((m) => {
            const active = readMode === m.value
            const count =
              m.value === 'all' ? counts.all : m.value === 'unread' ? counts.unread : counts.read
            return (
              <button
                key={m.value}
                type="button"
                role="tab"
                aria-selected={active}
                onClick={() => setReadMode(m.value)}
                className={cn(
                  'inline-flex h-7 items-center gap-2 rounded-full px-3 text-xs font-medium transition-colors',
                  active
                    ? 'bg-primary text-primary-foreground'
                    : 'text-muted-foreground hover:text-foreground',
                )}
              >
                {m.label}
                <span
                  className={cn(
                    'inline-flex min-w-5 justify-center rounded-full px-1.5 text-[10px] tabular-nums',
                    active ? 'bg-primary-foreground/20' : 'bg-muted',
                  )}
                >
                  {count}
                </span>
              </button>
            )
          })}
        </div>

        {showMarkAll && (
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="h-8 text-xs text-muted-foreground hover:text-foreground"
            onClick={() => setAllRead.mutate({ read: true, competitorId })}
            disabled={setAllRead.isPending}
          >
            <CheckCheck className="h-3.5 w-3.5" />
            Mark all as read
          </Button>
        )}
      </div>

      {title && (
        <h2 className="px-1 text-[11px] font-semibold tracking-wider text-muted-foreground uppercase">
          {title}
        </h2>
      )}

      {isLoading && (
        <div className="space-y-3">
          {['s1', 's2', 's3', 's4'].map((k) => (
            <Skeleton key={k} className="h-32 w-full" />
          ))}
        </div>
      )}

      {!isLoading && filtered.length === 0 && (
        <EmptyState
          icon={<Inbox className="h-8 w-8" />}
          title={readMode === 'unread' ? "You're all caught up" : 'No changes match your filters'}
          description={
            readMode === 'unread'
              ? 'No unread changes right now. Switch to All to see everything.'
              : 'Try removing a filter or adding more competitors to track.'
          }
        />
      )}

      {!isLoading && filtered.length > 0 && (
        <div className="space-y-6">
          {readMode === 'all' && grouped.unread.length > 0 && grouped.read.length > 0 ? (
            <>
              <FeedSection
                title="Unread"
                count={grouped.unread.length}
                items={grouped.unread}
                competitorMap={competitorMap}
              />
              <FeedSection
                title="Earlier"
                count={grouped.read.length}
                items={grouped.read}
                competitorMap={competitorMap}
                muted
              />
            </>
          ) : (
            <div className="space-y-3">
              {filtered.map((change) => (
                <ChangeCard
                  key={change.id}
                  change={change}
                  competitor={competitorMap.get(change.competitorId)}
                />
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  )
}

function FilterGroup({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="space-y-2">
      <span className="block px-1 text-[11px] font-semibold tracking-wider text-muted-foreground uppercase">
        {label}
      </span>
      {children}
    </div>
  )
}

interface FeedSectionProps {
  title: string
  count: number
  items: ReturnType<typeof useChanges>['data']
  competitorMap: Map<string, Competitor>
  muted?: boolean
}

function FeedSection({ title, count, items, competitorMap, muted }: FeedSectionProps) {
  if (!items?.length) return null
  return (
    <section className="space-y-3">
      <div className="flex items-baseline gap-2 px-1">
        <h2
          className={cn(
            'text-[11px] font-semibold tracking-wider uppercase',
            muted ? 'text-muted-foreground/70' : 'text-foreground',
          )}
        >
          {title}
        </h2>
        <span className="text-[11px] tabular-nums text-muted-foreground">{count}</span>
      </div>
      <div className="space-y-3">
        {items.map((change) => (
          <ChangeCard
            key={change.id}
            change={change}
            competitor={competitorMap.get(change.competitorId)}
          />
        ))}
      </div>
    </section>
  )
}
