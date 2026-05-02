import { useState } from 'react'
import { toast } from 'sonner'
import { useNavigate } from 'react-router-dom'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { useDeleteCompetitor } from '@/hooks/use-competitors'
import type { Competitor } from '@/types/domain'

interface Props {
  competitor: Competitor | null
  onOpenChange: (open: boolean) => void
  navigateAwayOnDelete?: boolean
}

export function DeleteCompetitorDialog({
  competitor,
  onOpenChange,
  navigateAwayOnDelete = false,
}: Props) {
  const remove = useDeleteCompetitor()
  const navigate = useNavigate()
  const [working, setWorking] = useState(false)

  const handleDelete = async () => {
    if (!competitor) return
    setWorking(true)
    try {
      await remove.mutateAsync(competitor.id)
      toast.success(`Removed ${competitor.name}`)
      onOpenChange(false)
      if (navigateAwayOnDelete) navigate('/')
    } catch (err) {
      console.error(err)
      toast.error('Failed to delete')
    } finally {
      setWorking(false)
    }
  }

  return (
    <Dialog open={!!competitor} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Remove {competitor?.name}?</DialogTitle>
          <DialogDescription>
            This stops tracking changes for this competitor. You can add them again later.
          </DialogDescription>
        </DialogHeader>
        <DialogFooter>
          <Button variant="ghost" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button variant="destructive" onClick={handleDelete} disabled={working}>
            Remove
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
