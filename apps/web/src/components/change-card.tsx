import { useEffect, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { formatDistanceToNow } from 'date-fns'
import { ChevronDown, ChevronRight, Circle, CircleDot } from 'lucide-react'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { CompetitorAvatar } from '@/components/competitor-avatar'
import { CategoryBadge } from '@/components/category-badge'
import { SeverityDot } from '@/components/severity-dot'
import { SourcePill } from '@/components/source-pill'
import { cn } from '@/lib/utils'
import { useSetChangeRead } from '@/hooks/use-changes'
import type { Change, Competitor } from '@/types/domain'

interface Props {
  change: Change
  competitor: Competitor | undefined
}

const AUTO_READ_DELAY_MS = 600

export function ChangeCard({ change, competitor }: Props) {
  const [open, setOpen] = useState(false)
  const setRead = useSetChangeRead()
  const hasDiff = !!(change.diffBefore || change.diffAfter)
  const competitorName = competitor?.name ?? 'Unknown competitor'
  const relative = formatDistanceToNow(new Date(change.detectedAt), { addSuffix: true })
  const unread = !change.read
  const autoReadTimer = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => {
    return () => {
      if (autoReadTimer.current) clearTimeout(autoReadTimer.current)
    }
  }, [])

  const toggleRead = () => {
    if (autoReadTimer.current) {
      clearTimeout(autoReadTimer.current)
      autoReadTimer.current = null
    }
    setRead.mutate({ id: change.id, read: unread })
  }

  const toggleDiff = () => {
    setOpen((next) => {
      const opening = !next
      if (opening && unread && !setRead.isPending) {
        autoReadTimer.current = setTimeout(() => {
          setRead.mutate({ id: change.id, read: true })
          autoReadTimer.current = null
        }, AUTO_READ_DELAY_MS)
      }
      return opening
    })
  }

  return (
    <Card
      data-state={unread ? 'unread' : 'read'}
      className={cn(
        'group/card relative overflow-hidden transition-colors',
        unread
          ? 'border-border bg-card shadow-sm hover:bg-accent/30'
          : 'border-muted-foreground/10 bg-muted/40 shadow-none hover:bg-muted/60',
      )}
    >
      <CardContent className="space-y-3">
        <div className="flex flex-wrap items-center gap-2 text-sm">
          {competitor ? (
            <Link
              to={`/competitors/${competitor.id}`}
              className="inline-flex items-center gap-2 rounded-md underline-offset-4 hover:underline"
            >
              <span
                className={cn(
                  'inline-flex transition-[filter,opacity]',
                  !unread && 'opacity-60 grayscale',
                )}
              >
                <CompetitorAvatar name={competitorName} website={competitor.website} size={20} />
              </span>
              <span
                className={cn(
                  unread
                    ? 'font-semibold text-foreground'
                    : 'font-normal text-muted-foreground',
                )}
              >
                {competitorName}
              </span>
            </Link>
          ) : (
            <span className="inline-flex items-center gap-2">
              <CompetitorAvatar name={competitorName} size={20} />
              <span className={cn(unread ? 'font-semibold' : 'font-normal text-muted-foreground')}>
                {competitorName}
              </span>
            </span>
          )}
          <span className={cn(unread ? 'text-muted-foreground' : 'text-muted-foreground/40')}>
            ·
          </span>
          <span className={cn(!unread && 'opacity-60')}>
            <SourcePill sourceId={change.sourceId} label={change.sourceLabel} />
          </span>
          <span
            className={cn(
              'ml-auto text-xs',
              unread ? 'text-muted-foreground' : 'text-muted-foreground/60',
            )}
          >
            {relative}
          </span>
        </div>

        <p
          className={cn(
            'text-sm leading-relaxed',
            unread ? 'text-foreground' : 'text-muted-foreground/80',
          )}
        >
          {change.summary}
        </p>

        <div className="flex flex-wrap items-center gap-2">
          <span className={cn(!unread && 'opacity-50')}>
            <CategoryBadge category={change.category} />
          </span>
          <span className={cn(!unread && 'opacity-50')}>
            <SeverityDot severity={change.severity} withLabel />
          </span>
          <div className="ml-auto flex items-center gap-1">
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className={cn(
                'h-7 px-2 text-xs',
                !unread &&
                  'text-muted-foreground opacity-0 transition-opacity group-hover/card:opacity-100 focus-visible:opacity-100',
              )}
              onClick={toggleRead}
              disabled={setRead.isPending}
              aria-label={unread ? 'Mark as read' : 'Mark as unread'}
            >
              {unread ? (
                <>
                  <CircleDot className="h-3 w-3" />
                  Mark read
                </>
              ) : (
                <>
                  <Circle className="h-3 w-3" />
                  Mark unread
                </>
              )}
            </Button>
            {hasDiff && (
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className={cn('h-7 px-2 text-xs', !unread && 'text-muted-foreground')}
                onClick={toggleDiff}
              >
                {open ? <ChevronDown className="h-3 w-3" /> : <ChevronRight className="h-3 w-3" />}
                {open ? 'Hide diff' : 'View diff'}
              </Button>
            )}
          </div>
        </div>

        {open && hasDiff && (
          <div className="grid gap-2 pt-1 sm:grid-cols-2">
            <DiffBlock label="Before" tone="before" content={change.diffBefore} />
            <DiffBlock label="After" tone="after" content={change.diffAfter} />
          </div>
        )}
      </CardContent>
    </Card>
  )
}

function DiffBlock({
  label,
  tone,
  content,
}: {
  label: string
  tone: 'before' | 'after'
  content?: string
}) {
  const ring =
    tone === 'before'
      ? 'border-rose-200 bg-rose-50/60 dark:border-rose-900/40 dark:bg-rose-950/30'
      : 'border-emerald-200 bg-emerald-50/60 dark:border-emerald-900/40 dark:bg-emerald-950/30'
  return (
    <div className={`rounded-md border ${ring} p-3`}>
      <div className="mb-1 text-[10px] font-medium tracking-wide text-muted-foreground uppercase">
        {label}
      </div>
      <pre className="whitespace-pre-wrap text-xs leading-relaxed text-foreground/90">
        {content ?? '—'}
      </pre>
    </div>
  )
}
