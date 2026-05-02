import type { LucideIcon } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'

export interface FilterOption<T extends string> {
  value: T
  label: string
  icon?: LucideIcon
}

interface Props<T extends string> {
  options: FilterOption<T>[]
  value: T[]
  onChange: (next: T[]) => void
  className?: string
  ariaLabel?: string
}

export function FilterPills<T extends string>({
  options,
  value,
  onChange,
  className,
  ariaLabel,
}: Props<T>) {
  const allActive = value.length === 0

  const toggle = (v: T) => {
    if (value.includes(v)) onChange(value.filter((x) => x !== v))
    else onChange([...value, v])
  }

  return (
    <fieldset
      aria-label={ariaLabel}
      className={cn('inline-flex flex-wrap items-center gap-1.5 border-0 p-0 m-0', className)}
    >
      <Button
        type="button"
        size="sm"
        variant="outline"
        className={cn(
          'h-8 rounded-full px-3 text-xs font-medium',
          allActive &&
            'border-primary bg-primary text-primary-foreground hover:bg-primary/90 hover:text-primary-foreground',
        )}
        onClick={() => onChange([])}
        aria-pressed={allActive}
      >
        All
      </Button>
      {options.map(({ value: v, label, icon: Icon }) => {
        const active = value.includes(v)
        return (
          <Button
            key={v}
            type="button"
            size="sm"
            variant="outline"
            className={cn(
              'h-8 rounded-full px-3 text-xs font-medium',
              active &&
                'border-primary bg-primary text-primary-foreground hover:bg-primary/90 hover:text-primary-foreground',
            )}
            onClick={() => toggle(v)}
            aria-pressed={active}
          >
            {Icon && <Icon className="h-3.5 w-3.5" />}
            {label}
          </Button>
        )
      })}
    </fieldset>
  )
}
