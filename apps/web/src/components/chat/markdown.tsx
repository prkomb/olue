import type { ComponentPropsWithoutRef } from 'react'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import { cn } from '@/lib/utils'
import type { ChatSource } from '@/types/domain'

interface Props {
  content: string
  sources?: ChatSource[]
  anchorPrefix?: string
  className?: string
}

export function Markdown({ content, sources, anchorPrefix = 'source', className }: Props) {
  const linkifiedContent = sources && sources.length > 0
    ? linkifyCitations(content, sources.length, anchorPrefix)
    : content

  return (
    <div className={cn('chat-md text-sm leading-relaxed', className)}>
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        components={{
          p: ({ children }) => <p className="mb-2 last:mb-0">{children}</p>,
          ul: ({ children }) => (
            <ul className="mb-2 list-disc space-y-1 pl-5 last:mb-0">{children}</ul>
          ),
          ol: ({ children }) => (
            <ol className="mb-2 list-decimal space-y-1 pl-5 last:mb-0">{children}</ol>
          ),
          li: ({ children }) => <li className="leading-snug">{children}</li>,
          h1: ({ children }) => <h1 className="mt-3 mb-2 text-base font-semibold">{children}</h1>,
          h2: ({ children }) => <h2 className="mt-3 mb-2 text-sm font-semibold">{children}</h2>,
          h3: ({ children }) => <h3 className="mt-2 mb-1 text-sm font-semibold">{children}</h3>,
          a: (props) => (
            <a
              {...props}
              target="_blank"
              rel="noreferrer"
              className="text-primary underline-offset-2 hover:underline"
            />
          ),
          strong: ({ children }) => <strong className="font-semibold">{children}</strong>,
          em: ({ children }) => <em className="italic">{children}</em>,
          blockquote: ({ children }) => (
            <blockquote className="my-2 border-l-2 border-muted-foreground/30 pl-3 text-muted-foreground italic">
              {children}
            </blockquote>
          ),
          hr: () => <hr className="my-3 border-border" />,
          code: ({ className: cls, children, ...rest }: ComponentPropsWithoutRef<'code'>) => {
            const isBlock = /language-/.test(cls ?? '')
            if (isBlock) {
              return (
                <code className={cn('font-mono', cls)} {...rest}>
                  {children}
                </code>
              )
            }
            return (
              <code
                className="rounded-sm bg-muted px-1 py-0.5 font-mono text-[0.85em]"
                {...rest}
              >
                {children}
              </code>
            )
          },
          pre: ({ children }) => (
            <pre className="mb-2 overflow-x-auto rounded-md border bg-muted/40 p-3 text-xs leading-relaxed last:mb-0">
              {children}
            </pre>
          ),
          table: ({ children }) => (
            <div className="my-2 overflow-x-auto">
              <table className="w-full text-xs">{children}</table>
            </div>
          ),
          thead: ({ children }) => <thead className="border-b">{children}</thead>,
          th: ({ children }) => <th className="px-2 py-1 text-left font-semibold">{children}</th>,
          td: ({ children }) => <td className="border-t px-2 py-1 align-top">{children}</td>,
        }}
      >
        {linkifiedContent}
      </ReactMarkdown>
    </div>
  )
}

function linkifyCitations(text: string, sourceCount: number, prefix: string): string {
  return text.replace(/\[(\d+)\]/g, (match, n) => {
    const idx = Number(n)
    if (!Number.isFinite(idx) || idx < 1 || idx > sourceCount) return match
    return `[\\[${idx}\\]](#${prefix}-${idx})`
  })
}
