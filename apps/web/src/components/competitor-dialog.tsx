import { useState } from 'react'
import { toast } from 'sonner'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { CompetitorForm } from '@/components/competitor-form'
import { useCreateCompetitor, useUpdateCompetitor } from '@/hooks/use-competitors'
import type { Competitor, CompetitorInput } from '@/types/domain'

interface Props {
  open: boolean
  onOpenChange: (open: boolean) => void
  competitor?: Competitor | null
}

export function CompetitorDialog({ open, onOpenChange, competitor }: Props) {
  const isEdit = !!competitor
  const create = useCreateCompetitor()
  const update = useUpdateCompetitor(competitor?.id ?? '')
  const [submitting, setSubmitting] = useState(false)

  const handleSubmit = async (input: CompetitorInput) => {
    setSubmitting(true)
    try {
      if (isEdit) {
        await update.mutateAsync(input)
        toast.success(`Updated ${input.name}`)
      } else {
        await create.mutateAsync(input)
        toast.success(`Added ${input.name}`)
      }
      onOpenChange(false)
    } catch (err) {
      console.error(err)
      toast.error(isEdit ? 'Failed to save changes' : 'Failed to add competitor')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[85vh] overflow-y-auto sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>{isEdit ? `Edit ${competitor?.name}` : 'Add competitor'}</DialogTitle>
          <DialogDescription>
            {isEdit
              ? 'Update the sources we should monitor for this competitor.'
              : 'Add a competitor and the surfaces you want tracked.'}
          </DialogDescription>
        </DialogHeader>
        <CompetitorForm
          initial={competitor}
          submitting={submitting}
          onSubmit={handleSubmit}
          onCancel={() => onOpenChange(false)}
        />
      </DialogContent>
    </Dialog>
  )
}
