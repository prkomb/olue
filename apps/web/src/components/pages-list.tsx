import { useMemo, useState } from 'react'
import { formatDistanceToNow } from 'date-fns'
import {
  AlertTriangle,
  ChevronDown,
  ChevronRight,
  CircleAlert,
  CircleCheck,
  CircleX,
  ExternalLink,
  Globe,
  Pencil,
  Pin,
  Plus,
  RefreshCw,
  Sparkles,
  Trash2,
  X,
} from 'lucide-react'
import { toast } from 'sonner'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Skeleton } from '@/components/ui/skeleton'
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip'
import { ChangeCard } from '@/components/change-card'
import { useChanges } from '@/hooks/use-changes'
import { useCompetitor } from '@/hooks/use-competitors'
import {
  useAddPage,
  useCompetitorPages,
  useRecheckPage,
  useRemovePage,
  useUpdatePageUrl,
} from '@/hooks/use-pages'
import { cn } from '@/lib/utils'
import type { Change, Page } from '@/types/domain'

interface PageStats {
  count: number
  unread: number
  latest?: Change
}

const FRESH_CHANGE_MS = 24 * 60 * 60 * 1000

interface Props {
  competitorId: string
  runDisabled: boolean
}

export function PagesList({ competitorId, runDisabled }: Props) {
  const { data: pages, isLoading } = useCompetitorPages(competitorId)
  const { data: changes } = useChanges(competitorId)
  const [addUrl, setAddUrl] = useState('')
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editValue, setEditValue] = useState('')
  const [expandedId, setExpandedId] = useState<string | null>(null)

  const addPage = useAddPage(competitorId)
  const updatePage = useUpdatePageUrl(competitorId)
  const removePage = useRemovePage(competitorId)
  const recheckPage = useRecheckPage(competitorId)

  const list = pages ?? []

  const statsByPage = useMemo(() => {
    const m = new Map<string, PageStats>()
    if (!changes) return m
    const urlToPageId = new Map<string, string>()
    for (const p of list) urlToPageId.set(p.url, p.id)
    for (const c of changes) {
      const key = (c.pageId && list.some((p) => p.id === c.pageId))
        ? c.pageId
        : c.url
          ? urlToPageId.get(c.url)
          : undefined
      if (!key) continue
      const s = m.get(key) ?? { count: 0, unread: 0 }
      s.count++
      if (!c.read) s.unread++
      if (!s.latest || s.latest.detectedAt < c.detectedAt) s.latest = c
      m.set(key, s)
    }
    return m
  }, [changes, list])

  const submitAdd = () => {
    const url = addUrl.trim()
    if (!url) return
    if (!/^https?:\/\//i.test(url)) {
      toast.error('URL must start with http(s)://')
      return
    }
    addPage.mutate(url, {
      onSuccess: () => {
        setAddUrl('')
        toast.success('Page added — fetching now')
      },
      onError: () => toast.error('Could not add page'),
    })
  }

  const submitEdit = (pageId: string) => {
    const url = editValue.trim()
    if (!url) return
    if (!/^https?:\/\//i.test(url)) {
      toast.error('URL must start with http(s)://')
      return
    }
    updatePage.mutate(
      { pageId, url },
      {
        onSuccess: () => {
          setEditingId(null)
          toast.success('URL updated — refetching')
        },
        onError: () => toast.error('Could not update URL'),
      },
    )
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between px-1">
        <h2 className="text-[11px] font-semibold tracking-wider text-muted-foreground uppercase">
          Pages
        </h2>
        {list.length > 0 && (
          <span className="text-[11px] tabular-nums text-muted-foreground">{list.length}</span>
        )}
      </div>

      <div className="flex items-center gap-2">
        <Input
          placeholder="https://… add a page to track"
          value={addUrl}
          onChange={(e) => setAddUrl(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && submitAdd()}
          className="h-9 text-xs"
          disabled={addPage.isPending}
        />
        <Button
          size="sm"
          className="h-9"
          onClick={submitAdd}
          disabled={addPage.isPending || runDisabled || !addUrl.trim()}
        >
          <Plus className="h-3.5 w-3.5" />
          Add
        </Button>
      </div>

      <Card>
        <CardContent className="p-1">
          {isLoading && (
            <div className="space-y-1 p-2">
              <Skeleton className="h-10 w-full" />
              <Skeleton className="h-10 w-full" />
              <Skeleton className="h-10 w-full" />
            </div>
          )}

          {!isLoading && list.length === 0 && (
            <div className="flex flex-col items-center gap-2 p-10 text-center">
              <Globe className="h-8 w-8 text-muted-foreground/40" />
              <p className="text-xs text-muted-foreground">
                No pages tracked yet.
                <br />
                Click Run now or add one above.
              </p>
            </div>
          )}

          {!isLoading && list.length > 0 && (
            <ul className="space-y-0.5">
              {list.map((page) => {
                const isEditing = editingId === page.id
                const isExpanded = expandedId === page.id
                const isMutating =
                  (recheckPage.isPending && recheckPage.variables === page.id) ||
                  (removePage.isPending && removePage.variables === page.id) ||
                  (updatePage.isPending && updatePage.variables?.pageId === page.id)
                return (
                  <li key={page.id} className="rounded-md transition-colors">
                    {isEditing ? (
                      <EditRow
                        initial={page.url}
                        submitting={updatePage.isPending}
                        onCancel={() => setEditingId(null)}
                        onSubmit={(v) => {
                          setEditValue(v)
                          submitEdit(page.id)
                        }}
                      />
                    ) : (
                      <PageRow
                        page={page}
                        stats={statsByPage.get(page.id)}
                        mutating={isMutating}
                        disabled={runDisabled}
                        expanded={isExpanded}
                        onToggle={() => setExpandedId(isExpanded ? null : page.id)}
                        onRecheck={() =>
                          recheckPage.mutate(page.id, {
                            onSuccess: () => toast.success('Recheck started'),
                            onError: () => toast.error('Could not start recheck'),
                          })
                        }
                        onEdit={() => {
                          setEditValue(page.url)
                          setEditingId(page.id)
                        }}
                        onDelete={() =>
                          removePage.mutate(page.id, {
                            onSuccess: () => toast.success('Page removed'),
                            onError: () => toast.error('Could not remove page'),
                          })
                        }
                      />
                    )}
                    {isExpanded && (
                      <PageHistory
                        competitorId={competitorId}
                        pageId={page.id}
                        pageUrl={page.url}
                      />
                    )}
                  </li>
                )
              })}
            </ul>
          )}
        </CardContent>
      </Card>
    </div>
  )
}

interface PageRowProps {
  page: Page
  stats: PageStats | undefined
  mutating: boolean
  disabled: boolean
  expanded: boolean
  onToggle: () => void
  onRecheck: () => void
  onEdit: () => void
  onDelete: () => void
}

function PageRow({
  page,
  stats,
  mutating,
  disabled,
  expanded,
  onToggle,
  onRecheck,
  onEdit,
  onDelete,
}: PageRowProps) {
  const path = formatPath(page.url)
  const fetchedAgo = page.fetchedAt
    ? formatDistanceToNow(new Date(page.fetchedAt), { addSuffix: true })
    : ''
  const isFailed = page.status === 'failed'
  const lastChangeMs = stats?.latest ? Date.parse(stats.latest.detectedAt) : 0
  const isFresh = lastChangeMs > 0 && Date.now() - lastChangeMs < FRESH_CHANGE_MS

  return (
    <div
      className={cn(
        'group/row flex items-center gap-3 rounded-md px-2 py-2.5 transition-colors hover:bg-accent',
        expanded && 'bg-accent',
        isFailed && !expanded && 'bg-destructive/5',
      )}
    >
      <button
        type="button"
        onClick={onToggle}
        className="flex min-w-0 flex-1 items-center gap-2 text-left"
        aria-expanded={expanded}
        aria-label={`${expanded ? 'Hide' : 'Show'} change history for ${path}`}
      >
        {expanded ? (
          <ChevronDown className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
        ) : (
          <ChevronRight className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
        )}
        <StatusIcon page={page} />
        {page.pinned && (
          <Tooltip>
            <TooltipTrigger asChild>
              <Pin className="h-3 w-3 shrink-0 text-muted-foreground" />
            </TooltipTrigger>
            <TooltipContent side="top" sideOffset={6}>
              Manually pinned
            </TooltipContent>
          </Tooltip>
        )}
        <div className="min-w-0 flex-1">
          <div className="flex min-w-0 items-center gap-2">
            <span className={cn('truncate text-sm', isFailed && 'text-destructive')}>
              {page.title ?? path}
            </span>
            {isFresh && (
              <Tooltip>
                <TooltipTrigger asChild>
                  <Sparkles className="h-3 w-3 shrink-0 text-amber-500" />
                </TooltipTrigger>
                <TooltipContent side="top" sideOffset={6}>
                  Changed {formatDistanceToNow(new Date(stats!.latest!.detectedAt), { addSuffix: true })}
                </TooltipContent>
              </Tooltip>
            )}
          </div>
          <PageMetaLine
            page={page}
            path={page.title ? path : undefined}
            fetchedAgo={fetchedAgo}
            stats={stats}
          />
        </div>
      </button>

      <div className="flex shrink-0 items-center gap-1.5">
        <HttpStatusPill status={page.httpStatus} pageStatus={page.status} />
        {page.via && page.via !== 'none' && page.via !== 'static' && (
          <Tooltip>
            <TooltipTrigger asChild>
              <Badge
                variant="outline"
                className="border-border bg-muted/50 px-1.5 py-0 text-[10px] font-medium text-muted-foreground"
              >
                {page.via}
              </Badge>
            </TooltipTrigger>
            <TooltipContent side="top" sideOffset={6}>
              Fetched via {page.via}
            </TooltipContent>
          </Tooltip>
        )}
        {stats && stats.unread > 0 && (
          <Tooltip>
            <TooltipTrigger asChild>
              <Badge
                aria-label={`${stats.unread} unread changes`}
                className="h-4 min-w-4 rounded-full border-0 bg-[#FF3B30] px-1.5 text-[10px] font-bold leading-none tabular-nums text-white shadow-sm ring-2 ring-card"
              >
                {stats.unread > 99 ? '99+' : stats.unread}
              </Badge>
            </TooltipTrigger>
            <TooltipContent side="top" sideOffset={6}>
              {stats.unread} unread
            </TooltipContent>
          </Tooltip>
        )}
      </div>

      <div
        className={cn(
          'flex items-center gap-0.5 transition-opacity',
          mutating || expanded
            ? 'opacity-100'
            : 'opacity-0 group-hover/row:opacity-100 focus-within:opacity-100',
        )}
      >
        <ActionButton
          icon={ExternalLink}
          label="Open in new tab"
          onClick={() => window.open(page.url, '_blank', 'noreferrer')}
          disabled={false}
        />
        <ActionButton
          icon={RefreshCw}
          label="Recheck"
          onClick={onRecheck}
          disabled={disabled || mutating}
          spinning={mutating}
        />
        <ActionButton icon={Pencil} label="Edit URL" onClick={onEdit} disabled={disabled || mutating} />
        <ActionButton
          icon={Trash2}
          label="Delete page"
          onClick={onDelete}
          disabled={mutating}
          destructive
        />
      </div>
    </div>
  )
}

function PageMetaLine({
  page,
  path,
  fetchedAgo,
  stats,
}: {
  page: Page
  path: string | undefined
  fetchedAgo: string
  stats: PageStats | undefined
}) {
  const parts: string[] = []
  if (path) parts.push(path)
  if (page.status === 'failed') {
    parts.push(page.degradedReason ?? 'Could not load')
  } else if (page.status === 'degraded' && page.degradedReason) {
    parts.push(page.degradedReason)
  } else if (stats && stats.count > 0 && stats.latest) {
    const ago = formatDistanceToNow(new Date(stats.latest.detectedAt), { addSuffix: true })
    parts.push(`${stats.count} change${stats.count === 1 ? '' : 's'} · last ${ago}`)
  } else {
    parts.push('No changes detected yet')
  }
  if (fetchedAgo) parts.push(`fetched ${fetchedAgo}`)

  return (
    <div
      className={cn(
        'truncate text-[11px]',
        page.status === 'failed' ? 'text-destructive/80' : 'text-muted-foreground',
      )}
    >
      {parts.join(' · ')}
    </div>
  )
}

function HttpStatusPill({
  status,
  pageStatus,
}: {
  status: number | undefined
  pageStatus: Page['status']
}) {
  if (status === undefined || status === 0) {
    if (pageStatus === 'failed') {
      return (
        <Badge variant="destructive" className="px-1.5 py-0 text-[10px] font-semibold tabular-nums">
          fail
        </Badge>
      )
    }
    return null
  }
  const codeText = `${status}${httpReasonShort(status)}`
  const color =
    status >= 500
      ? 'border-destructive/40 bg-destructive/10 text-destructive'
      : status >= 400
        ? 'border-destructive/40 bg-destructive/10 text-destructive'
        : status >= 300
          ? 'border-blue-300 bg-blue-50 text-blue-700 dark:border-blue-900/50 dark:bg-blue-950/40 dark:text-blue-300'
          : 'border-emerald-300 bg-emerald-50 text-emerald-700 dark:border-emerald-900/50 dark:bg-emerald-950/40 dark:text-emerald-300'
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <Badge
          variant="outline"
          className={cn('px-1.5 py-0 text-[10px] font-semibold tabular-nums', color)}
        >
          {codeText}
        </Badge>
      </TooltipTrigger>
      <TooltipContent side="top" sideOffset={6}>
        HTTP {status} {httpReasonLong(status)}
      </TooltipContent>
    </Tooltip>
  )
}

function httpReasonShort(status: number): string {
  if (status === 200) return ' OK'
  if (status === 301 || status === 302 || status === 308) return ''
  if (status === 401) return ''
  if (status === 403) return ''
  if (status === 404) return ''
  if (status === 410) return ''
  if (status === 429) return ''
  if (status === 500) return ''
  if (status === 502) return ''
  if (status === 503) return ''
  if (status === 504) return ''
  return ''
}

function httpReasonLong(status: number): string {
  const reasons: Record<number, string> = {
    200: 'OK',
    201: 'Created',
    204: 'No Content',
    301: 'Moved Permanently',
    302: 'Found',
    304: 'Not Modified',
    308: 'Permanent Redirect',
    400: 'Bad Request',
    401: 'Unauthorized',
    403: 'Forbidden',
    404: 'Not Found',
    410: 'Gone',
    429: 'Too Many Requests',
    500: 'Server Error',
    502: 'Bad Gateway',
    503: 'Service Unavailable',
    504: 'Gateway Timeout',
  }
  return reasons[status] ?? ''
}

function PageHistory({
  competitorId,
  pageId,
  pageUrl,
}: {
  competitorId: string
  pageId: string
  pageUrl: string
}) {
  const { data: allChanges, isLoading } = useChanges(competitorId)
  const { data: competitor } = useCompetitor(competitorId)

  const changes = useMemo(
    () =>
      (allChanges ?? [])
        .filter((c) => c.pageId === pageId || c.url === pageUrl)
        .sort((a, b) => b.detectedAt.localeCompare(a.detectedAt)),
    [allChanges, pageId, pageUrl],
  )

  return (
    <div className="bg-muted/30 px-3 py-3">
      {isLoading && <Skeleton className="h-20 w-full" />}
      {!isLoading && changes.length === 0 && (
        <p className="px-1 py-2 text-xs text-muted-foreground">
          No changes detected on this page yet.
        </p>
      )}
      {!isLoading && changes.length > 0 && (
        <div className="space-y-2">
          {changes.map((c) => (
            <ChangeCard key={c.id} change={c} competitor={competitor} />
          ))}
        </div>
      )}
    </div>
  )
}

interface ActionButtonProps {
  icon: typeof RefreshCw
  label: string
  onClick: () => void
  disabled: boolean
  destructive?: boolean
  spinning?: boolean
}

function ActionButton({ icon: Icon, label, onClick, disabled, destructive, spinning }: ActionButtonProps) {
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <Button
          type="button"
          variant="ghost"
          size="icon"
          className={cn(
            'h-7 w-7',
            destructive && 'text-muted-foreground hover:bg-destructive/10 hover:text-destructive',
          )}
          onClick={(e) => {
            e.stopPropagation()
            onClick()
          }}
          disabled={disabled}
          aria-label={label}
        >
          <Icon className={cn('h-3.5 w-3.5', spinning && 'animate-spin')} />
        </Button>
      </TooltipTrigger>
      <TooltipContent side="top" sideOffset={6}>
        {label}
      </TooltipContent>
    </Tooltip>
  )
}

function StatusIcon({ page }: { page: Page }) {
  const reason = page.degradedReason
  if (page.status === 'ok') {
    return (
      <Tooltip>
        <TooltipTrigger asChild>
          <CircleCheck className="h-3.5 w-3.5 shrink-0 text-emerald-500" />
        </TooltipTrigger>
        <TooltipContent side="top" sideOffset={6}>
          OK{page.httpStatus ? ` · HTTP ${page.httpStatus}` : ''}
        </TooltipContent>
      </Tooltip>
    )
  }
  if (page.status === 'degraded') {
    return (
      <Tooltip>
        <TooltipTrigger asChild>
          <AlertTriangle className="h-3.5 w-3.5 shrink-0 text-amber-500" />
        </TooltipTrigger>
        <TooltipContent side="top" sideOffset={6} className="max-w-xs">
          Degraded{page.httpStatus ? ` · HTTP ${page.httpStatus}` : ''}
          {reason ? ` — ${reason}` : ''}
        </TooltipContent>
      </Tooltip>
    )
  }
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        {page.httpStatus && page.httpStatus >= 400 ? (
          <CircleX className="h-3.5 w-3.5 shrink-0 text-destructive" />
        ) : (
          <CircleAlert className="h-3.5 w-3.5 shrink-0 text-destructive" />
        )}
      </TooltipTrigger>
      <TooltipContent side="top" sideOffset={6} className="max-w-xs">
        Failed{page.httpStatus ? ` · HTTP ${page.httpStatus}` : ''}
        {reason ? ` — ${reason}` : ''}
      </TooltipContent>
    </Tooltip>
  )
}

function EditRow({
  initial,
  submitting,
  onSubmit,
  onCancel,
}: {
  initial: string
  submitting: boolean
  onSubmit: (url: string) => void
  onCancel: () => void
}) {
  const [v, setV] = useState(initial)
  return (
    <div className="flex items-center gap-1 px-2 py-2">
      <Input
        autoFocus
        value={v}
        onChange={(e) => setV(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === 'Enter') onSubmit(v)
          if (e.key === 'Escape') onCancel()
        }}
        className="h-9 text-xs"
        disabled={submitting}
      />
      <Button size="sm" className="h-9" onClick={() => onSubmit(v)} disabled={submitting}>
        Save
      </Button>
      <Button
        size="icon"
        variant="ghost"
        className="h-9 w-9"
        onClick={onCancel}
        aria-label="Cancel edit"
      >
        <X className="h-3.5 w-3.5" />
      </Button>
    </div>
  )
}

function formatPath(url: string): string {
  try {
    const u = new URL(url)
    const path = u.pathname === '/' ? '/' : u.pathname.replace(/\/+$/, '')
    return path === '/' ? `${u.hostname}/` : path
  } catch {
    return url
  }
}
