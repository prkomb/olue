import { useEffect, useRef } from 'react'
import { Bot, Link2, Loader2, User } from 'lucide-react'
import { cn } from '@/lib/utils'
import type { ChatMessage, ChatSource } from '@/types/domain'

interface Props {
  messages: ChatMessage[]
  streaming: boolean
  pendingSources: ChatSource[] | null
}

export function ChatThread({ messages, streaming, pendingSources }: Props) {
  const bottomRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth', block: 'end' })
  }, [messages, streaming])

  return (
    <div className="flex flex-col gap-4">
      {messages.map((m) => (
        <MessageBubble key={m.id} message={m} streaming={streaming && m === messages[messages.length - 1]} pendingSources={pendingSources} />
      ))}
      {streaming && messages[messages.length - 1]?.role === 'user' && (
        <div className="flex items-start gap-3">
          <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md bg-muted">
            <Bot className="h-4 w-4" />
          </div>
          <div className="flex items-center gap-2 rounded-lg border bg-card px-3 py-2 text-sm text-muted-foreground">
            <Loader2 className="h-3.5 w-3.5 animate-spin" />
            Searching competitor knowledge…
          </div>
        </div>
      )}
      <div ref={bottomRef} />
    </div>
  )
}

interface BubbleProps {
  message: ChatMessage
  streaming: boolean
  pendingSources: ChatSource[] | null
}

function MessageBubble({ message, streaming, pendingSources }: BubbleProps) {
  const isUser = message.role === 'user'
  const sources = message.sources ?? (streaming ? pendingSources ?? undefined : undefined)

  return (
    <div className={cn('flex items-start gap-3', isUser && 'flex-row-reverse')}>
      <div
        className={cn(
          'flex h-8 w-8 shrink-0 items-center justify-center rounded-md',
          isUser ? 'bg-primary text-primary-foreground' : 'bg-muted',
        )}
      >
        {isUser ? <User className="h-4 w-4" /> : <Bot className="h-4 w-4" />}
      </div>
      <div className={cn('flex max-w-[80%] flex-col gap-2', isUser && 'items-end')}>
        <div
          className={cn(
            'rounded-lg border px-3 py-2 text-sm whitespace-pre-wrap',
            isUser ? 'bg-primary text-primary-foreground border-primary' : 'bg-card',
          )}
        >
          {message.content || (streaming ? <span className="text-muted-foreground">…</span> : null)}
          {message.stopped && (
            <span className="ml-2 text-xs italic opacity-70">(stopped)</span>
          )}
        </div>
        {!isUser && sources && sources.length > 0 && (
          <SourcesList sources={sources} />
        )}
      </div>
    </div>
  )
}

function SourcesList({ sources }: { sources: ChatSource[] }) {
  return (
    <div className="flex flex-col gap-1">
      <div className="text-[11px] font-semibold tracking-wider text-muted-foreground uppercase">
        Sources
      </div>
      <ul className="flex flex-col gap-1">
        {sources.map((s, i) => (
          <li key={`${s.pageId}-${i}`}>
            <a
              href={s.url}
              target="_blank"
              rel="noreferrer"
              className="flex items-center gap-2 rounded-md border bg-card px-2 py-1 text-xs hover:bg-accent"
            >
              <span className="text-muted-foreground tabular-nums">[{i + 1}]</span>
              <Link2 className="h-3 w-3 text-muted-foreground" />
              <span className="truncate">{s.title}</span>
              <span className="ml-auto text-muted-foreground tabular-nums">
                {s.score.toFixed(2)}
              </span>
            </a>
          </li>
        ))}
      </ul>
    </div>
  )
}
