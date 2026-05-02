import { useCallback, useMemo, useRef, useState } from 'react'
import { MessagesSquare, Sparkles } from 'lucide-react'
import { toast } from 'sonner'
import { Separator } from '@/components/ui/separator'
import { EmptyState } from '@/components/empty-state'
import { ChatThread } from '@/components/chat/chat-thread'
import { ChatComposer } from '@/components/chat/chat-composer'
import { CompetitorMultiSelect } from '@/components/chat/competitor-multi-select'
import { PageMultiSelect } from '@/components/chat/page-multi-select'
import { useCompetitors } from '@/hooks/use-competitors'
import { api } from '@/lib/api'
import type { ChatMessage, ChatSource } from '@/types/domain'

const newId = () =>
  typeof crypto !== 'undefined' && 'randomUUID' in crypto
    ? crypto.randomUUID()
    : `m_${Date.now()}_${Math.random().toString(36).slice(2)}`

export function ChatRoute() {
  const { data: competitors = [], isLoading: competitorsLoading } = useCompetitors()
  const [selectedCompetitorIds, setSelectedCompetitorIds] = useState<string[]>([])
  const [selectedPageIds, setSelectedPageIds] = useState<string[]>([])
  const [messages, setMessages] = useState<ChatMessage[]>([])
  const [input, setInput] = useState('')
  const [streaming, setStreaming] = useState(false)
  const [pendingSources, setPendingSources] = useState<ChatSource[] | null>(null)
  const abortRef = useRef<AbortController | null>(null)

  const selectedCompetitors = useMemo(
    () => competitors.filter((c) => selectedCompetitorIds.includes(c.id)),
    [competitors, selectedCompetitorIds],
  )

  const onSelectedCompetitorsChange = (ids: string[]) => {
    setSelectedCompetitorIds(ids)
    setSelectedPageIds((prev) => prev) // pages will be filtered by competitor when sending
  }

  const send = useCallback(async () => {
    const trimmed = input.trim()
    if (!trimmed || streaming || selectedCompetitorIds.length === 0) return

    const userMsg: ChatMessage = { id: newId(), role: 'user', content: trimmed }
    const assistantId = newId()
    const history: Pick<ChatMessage, 'role' | 'content'>[] = [
      ...messages.map((m) => ({ role: m.role, content: m.content })),
      { role: userMsg.role, content: userMsg.content },
    ]

    setMessages((prev) => [...prev, userMsg])
    setInput('')
    setStreaming(true)
    setPendingSources(null)

    let assistantContent = ''
    let assistantSources: ChatSource[] | undefined

    const ensureAssistant = () => {
      setMessages((prev) => {
        if (prev.some((m) => m.id === assistantId)) return prev
        return [...prev, { id: assistantId, role: 'assistant', content: '' }]
      })
    }

    const ac = new AbortController()
    abortRef.current = ac

    await api.chat.stream(
      {
        competitorIds: selectedCompetitorIds,
        pageIds: selectedPageIds.length > 0 ? selectedPageIds : undefined,
        messages: history,
      },
      {
        onSource: (sources) => {
          assistantSources = sources
          setPendingSources(sources)
        },
        onToken: (text) => {
          ensureAssistant()
          assistantContent += text
          setMessages((prev) =>
            prev.map((m) => (m.id === assistantId ? { ...m, content: assistantContent } : m)),
          )
        },
        onDone: () => {
          ensureAssistant()
          setMessages((prev) =>
            prev.map((m) =>
              m.id === assistantId
                ? { ...m, content: assistantContent, sources: assistantSources }
                : m,
            ),
          )
        },
        onError: (message) => {
          toast.error(message)
          setMessages((prev) =>
            prev.map((m) =>
              m.id === assistantId
                ? { ...m, content: assistantContent, sources: assistantSources, stopped: true }
                : m,
            ),
          )
        },
      },
      ac.signal,
    )

    setStreaming(false)
    setPendingSources(null)
    abortRef.current = null
  }, [input, streaming, selectedCompetitorIds, selectedPageIds, messages])

  const stop = () => {
    abortRef.current?.abort()
    abortRef.current = null
    setStreaming(false)
    setMessages((prev) => {
      const last = prev[prev.length - 1]
      if (!last || last.role !== 'assistant') return prev
      return prev.map((m, i) => (i === prev.length - 1 ? { ...m, stopped: true } : m))
    })
  }

  const noCompetitors = !competitorsLoading && competitors.length === 0
  const noSelection = selectedCompetitorIds.length === 0
  const composerDisabled = noSelection

  return (
    <div className="mx-auto flex min-h-full w-full max-w-5xl flex-col px-6 py-8 lg:px-8">
      <header className="space-y-1">
        <h1 className="flex items-center gap-2 text-2xl font-semibold tracking-tight">
          <MessagesSquare className="h-6 w-6" />
          Chat
        </h1>
        <p className="text-sm text-muted-foreground">
          Pick competitors and ask anything about their pages, pricing, hiring, or recent changes.
          Answers are grounded in your tracked content.
        </p>
      </header>

      <Separator className="my-6" />

      <div className="mb-5 flex flex-wrap items-center gap-2">
        <CompetitorMultiSelect
          competitors={competitors}
          selectedIds={selectedCompetitorIds}
          onChange={onSelectedCompetitorsChange}
          loading={competitorsLoading}
        />
        <PageMultiSelect
          competitors={selectedCompetitors}
          selectedIds={selectedPageIds}
          onChange={setSelectedPageIds}
        />
      </div>

      <div className="flex-1 pb-4">
        {messages.length === 0 ? (
          <EmptyState
            icon={<Sparkles className="h-8 w-8" />}
            title={noCompetitors ? 'No competitors yet' : 'Ask your first question'}
            description={
              noCompetitors
                ? 'Add a competitor first — then come back and chat about what changed.'
                : noSelection
                  ? 'Select one or more competitors above to start chatting.'
                  : 'Try: "What changed on their pricing page in the last week?" or "Compare their messaging across all selected competitors."'
            }
          />
        ) : (
          <ChatThread
            messages={messages}
            streaming={streaming}
            pendingSources={pendingSources}
          />
        )}
      </div>

      <div className="mt-auto pt-2">
        <ChatComposer
          value={input}
          onChange={setInput}
          onSubmit={send}
          onStop={stop}
          streaming={streaming}
          disabled={composerDisabled}
          placeholder={
            noSelection
              ? 'Select a competitor to start chatting…'
              : 'Ask anything about the selected competitors…'
          }
        />
      </div>
    </div>
  )
}
