import { useEffect, useRef, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import {
  BriefcaseBusiness,
  ExternalLink,
  Globe,
  Pencil,
  RefreshCw,
  Star,
  Trash2,
} from 'lucide-react'
import type { LucideIcon } from 'lucide-react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { Separator } from '@/components/ui/separator'
import { Badge } from '@/components/ui/badge'
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip'
import { CompetitorAvatar } from '@/components/competitor-avatar'
import { ChangeFeed } from '@/components/change-feed'
import { CompetitorDialog } from '@/components/competitor-dialog'
import { DeleteCompetitorDialog } from '@/components/delete-competitor-dialog'
import { EmptyState } from '@/components/empty-state'
import { useChanges } from '@/hooks/use-changes'
import {
  useCompetitor,
  useCompetitorRun,
  useStartCompetitorRun,
} from '@/hooks/use-competitors'
import { cn } from '@/lib/utils'
import type { Source } from '@/types/domain'

interface SourceRow {
  key: string
  icon: LucideIcon
  label: string
  url: string
}

export function CompetitorDetailRoute() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const { data: competitor, isLoading, isError } = useCompetitor(id)
  const { data: changes } = useChanges(id)
  const unreadCount = changes?.filter((c) => !c.read).length ?? 0
  const [editOpen, setEditOpen] = useState(false)
  const [deleting, setDeleting] = useState<typeof competitor | null>(null)
  const { data: runState } = useCompetitorRun(id)
  const startRun = useStartCompetitorRun(id ?? '')
  const wasRunning = useRef(false)
  const isRunning = !!runState?.running || startRun.isPending
  const runDisabled = !id || isRunning

  useEffect(() => {
    const running = runState?.running ?? false
    if (wasRunning.current && !running && runState?.finishedAt) {
      toast.success('Run complete', {
        description: 'Sources checked. New changes (if any) appear in the feed.',
      })
    }
    wasRunning.current = running
  }, [runState?.running, runState?.finishedAt])

  const handleRun = () => {
    if (!id || isRunning) return
    startRun.mutate(undefined, {
      onError: () => toast.error('Could not start run'),
    })
  }

  if (isLoading) {
    return (
      <div className="mx-auto w-full max-w-5xl space-y-6 px-6 py-8 lg:px-8">
        <Skeleton className="h-16 w-full" />
        <div className="grid gap-6 lg:grid-cols-[280px_1fr]">
          <Skeleton className="h-64 w-full" />
          <Skeleton className="h-96 w-full" />
        </div>
      </div>
    )
  }

  if (isError || !competitor) {
    return (
      <div className="mx-auto w-full max-w-5xl px-6 py-16 lg:px-8">
        <EmptyState
          title="Competitor not found"
          description="It may have been deleted. Pick another from the sidebar."
          action={<Button onClick={() => navigate('/')}>Back to dashboard</Button>}
        />
      </div>
    )
  }

  const sources: SourceRow[] = [
    { key: 'website', icon: Globe, label: 'Website', url: competitor.website },
    ...(competitor.linkedin
      ? [{ key: 'linkedin', icon: BriefcaseBusiness, label: 'LinkedIn', url: competitor.linkedin }]
      : []),
    ...(competitor.g2 ? [{ key: 'g2', icon: Star, label: 'G2', url: competitor.g2 }] : []),
    ...competitor.otherSources.map((s: Source) => ({
      key: `other:${s.id}`,
      icon: ExternalLink,
      label: s.label,
      url: s.url,
    })),
  ]

  return (
    <div className="mx-auto w-full max-w-5xl space-y-6 px-6 py-8 lg:px-8">
      <header className="flex flex-wrap items-center gap-4">
        <div className="relative">
          <CompetitorAvatar name={competitor.name} website={competitor.website} size={48} />
          {unreadCount > 0 && (
            <Badge
              aria-label={`${unreadCount} unread changes`}
              className="absolute -top-1.5 -right-1.5 h-5 min-w-5 rounded-full border-0 bg-[#FF3B30] px-1.5 text-[10px] font-bold leading-none tabular-nums text-white shadow-sm ring-2 ring-background"
            >
              {unreadCount > 99 ? '99+' : unreadCount}
            </Badge>
          )}
        </div>
        <div className="flex-1 space-y-1">
          <h1 className="text-2xl font-semibold tracking-tight">{competitor.name}</h1>
          <a
            href={competitor.website}
            target="_blank"
            rel="noreferrer"
            className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
          >
            {competitor.website}
            <ExternalLink className="h-3 w-3" />
          </a>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            onClick={handleRun}
            disabled={runDisabled}
            aria-busy={isRunning}
          >
            <RefreshCw className={cn('h-4 w-4', isRunning && 'animate-spin')} />
            {isRunning ? 'Running…' : 'Run now'}
          </Button>
          <Button variant="outline" onClick={() => setEditOpen(true)}>
            <Pencil className="h-4 w-4" />
            Edit
          </Button>
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="ghost"
                onClick={() => setDeleting(competitor)}
                className="text-muted-foreground hover:bg-destructive/10 hover:text-destructive"
              >
                <Trash2 className="h-4 w-4" />
                Remove
              </Button>
            </TooltipTrigger>
            <TooltipContent
              side="bottom"
              sideOffset={6}
              className="bg-destructive text-destructive-foreground [&>span]:bg-destructive! [&>span]:fill-destructive!"
            >
              Danger zone — removes this competitor and stops tracking it
            </TooltipContent>
          </Tooltip>
        </div>
      </header>

      <Separator />

      <div className="grid gap-8 lg:grid-cols-[260px_1fr]">
        <aside className="space-y-3">
          <h2 className="px-1 text-[11px] font-semibold tracking-wider text-muted-foreground uppercase">
            Sources
          </h2>
          <Card>
            <CardContent className="p-2">
              <ul className="space-y-0.5">
                {sources.map(({ key, icon: Icon, label, url }) => (
                  <li key={key}>
                    <a
                      href={url}
                      target="_blank"
                      rel="noreferrer"
                      className="group flex items-center gap-2 rounded-md px-2 py-1.5 text-sm hover:bg-accent"
                    >
                      <Icon className="h-3.5 w-3.5 text-muted-foreground" />
                      <span className="truncate">{label}</span>
                      <ExternalLink className="ml-auto h-3 w-3 text-muted-foreground opacity-0 transition-opacity group-hover:opacity-100" />
                    </a>
                  </li>
                ))}
              </ul>
            </CardContent>
          </Card>
        </aside>

        <section className="space-y-3">
          <h2 className="px-1 text-[11px] font-semibold tracking-wider text-muted-foreground uppercase">
            Change feed
          </h2>
          <ChangeFeed competitorId={competitor.id} />
        </section>
      </div>

      <CompetitorDialog open={editOpen} onOpenChange={setEditOpen} competitor={competitor} />
      <DeleteCompetitorDialog
        competitor={deleting ?? null}
        onOpenChange={(open) => !open && setDeleting(null)}
        navigateAwayOnDelete
      />
    </div>
  )
}
