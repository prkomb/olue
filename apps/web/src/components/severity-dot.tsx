import { cn } from '@/lib/utils'
import type { Severity } from '@/types/domain'

const styles: Record<Severity, string> = {
  low: 'bg-emerald-500',
  medium: 'bg-amber-500',
  high: 'bg-rose-500',
}

const labels: Record<Severity, string> = {
  low: 'Low impact',
  medium: 'Medium impact',
  high: 'High impact',
}

export function SeverityDot({ severity, withLabel = false }: { severity: Severity; withLabel?: boolean }) {
  return (
    <span className="inline-flex items-center gap-1.5">
      <span
        className={cn('inline-block h-2 w-2 rounded-full', styles[severity])}
        aria-label={labels[severity]}
      />
      {withLabel && (
        <span className="text-xs text-muted-foreground capitalize">{severity}</span>
      )}
    </span>
  )
}
