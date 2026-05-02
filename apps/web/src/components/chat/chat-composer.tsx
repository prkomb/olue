import { type FormEvent, type KeyboardEvent, useRef } from 'react'
import { Send, StopCircle } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'

interface Props {
  value: string
  onChange: (v: string) => void
  onSubmit: () => void
  onStop: () => void
  streaming: boolean
  disabled: boolean
  placeholder?: string
}

export function ChatComposer({
  value,
  onChange,
  onSubmit,
  onStop,
  streaming,
  disabled,
  placeholder,
}: Props) {
  const ref = useRef<HTMLTextAreaElement>(null)

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault()
    if (streaming || disabled || value.trim().length === 0) return
    onSubmit()
  }

  const handleKey = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      if (!streaming && !disabled && value.trim().length > 0) onSubmit()
    }
  }

  return (
    <form onSubmit={handleSubmit} className="flex items-end gap-2 rounded-lg border bg-card p-2">
      <Textarea
        ref={ref}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        onKeyDown={handleKey}
        placeholder={placeholder ?? 'Ask anything about the selected competitors…'}
        rows={1}
        className="min-h-9 max-h-40 resize-none border-0 bg-transparent shadow-none focus-visible:ring-0"
        disabled={disabled && !streaming}
      />
      {streaming ? (
        <Button type="button" variant="outline" size="icon" onClick={onStop} aria-label="Stop">
          <StopCircle className="h-4 w-4" />
        </Button>
      ) : (
        <Button
          type="submit"
          size="icon"
          disabled={disabled || value.trim().length === 0}
          aria-label="Send"
        >
          <Send className="h-4 w-4" />
        </Button>
      )}
    </form>
  )
}
