import { Globe, BriefcaseBusiness, Star, Link2 } from 'lucide-react'
import type { LucideIcon } from 'lucide-react'

interface Props {
  sourceId: string
  label: string
}

function iconFor(sourceId: string, label: string): LucideIcon {
  if (sourceId === 'linkedin' || /linkedin/i.test(label)) return BriefcaseBusiness
  if (sourceId === 'g2' || /g2/i.test(label)) return Star
  if (sourceId === 'website' || /home/i.test(label) || /website/i.test(label)) return Globe
  return Link2
}

export function SourcePill({ sourceId, label }: Props) {
  const Icon = iconFor(sourceId, label)
  return (
    <span className="inline-flex items-center gap-1 rounded-md bg-muted px-1.5 py-0.5 text-xs text-muted-foreground">
      <Icon className="h-3 w-3" />
      {label}
    </span>
  )
}
