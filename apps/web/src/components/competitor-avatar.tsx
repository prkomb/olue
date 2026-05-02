import { useState } from 'react'
import { cn } from '@/lib/utils'
import { faviconUrl, initialsOf } from '@/lib/favicon'

interface Props {
  name: string
  website?: string
  size?: number
  className?: string
}

export function CompetitorAvatar({ name, website, size = 24, className }: Props) {
  const [errored, setErrored] = useState(false)
  const url = website ? faviconUrl(website, Math.max(64, size * 2)) : null
  const showImage = !!url && !errored

  return (
    <div
      className={cn(
        'flex shrink-0 items-center justify-center overflow-hidden rounded-md bg-muted text-muted-foreground',
        className,
      )}
      style={{ width: size, height: size }}
      aria-hidden
    >
      {showImage ? (
        <img
          src={url}
          alt=""
          width={size}
          height={size}
          className="h-full w-full object-contain"
          onError={() => setErrored(true)}
        />
      ) : (
        <span className="text-[0.6rem] font-medium tracking-tight uppercase">
          {initialsOf(name)}
        </span>
      )}
    </div>
  )
}
