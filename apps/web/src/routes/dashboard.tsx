import { useState } from 'react'
import { Plus, Telescope } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Separator } from '@/components/ui/separator'
import { ChangeFeed } from '@/components/change-feed'
import { CompetitorDialog } from '@/components/competitor-dialog'
import { EmptyState } from '@/components/empty-state'
import { useCompetitors } from '@/hooks/use-competitors'

export function DashboardRoute() {
  const { data: competitors, isLoading } = useCompetitors()
  const [addOpen, setAddOpen] = useState(false)

  const showEmpty = !isLoading && competitors && competitors.length === 0

  return (
    <div className="mx-auto w-full max-w-5xl space-y-6 px-6 py-8 lg:px-8">
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div className="space-y-1">
          <h1 className="text-2xl font-semibold tracking-tight">Recent changes</h1>
          <p className="text-sm text-muted-foreground">
            What your competitors shipped, said, hired, and priced — minus the noise.
          </p>
        </div>
        <Button onClick={() => setAddOpen(true)}>
          <Plus className="h-4 w-4" />
          Add competitor
        </Button>
      </header>

      <Separator />

      {showEmpty ? (
        <EmptyState
          icon={<Telescope className="h-8 w-8" />}
          title="Track your first competitor"
          description="Add a competitor and we'll surface meaningful changes across their website, LinkedIn, and other sources."
          action={
            <Button onClick={() => setAddOpen(true)}>
              <Plus className="h-4 w-4" />
              Add competitor
            </Button>
          }
        />
      ) : (
        <ChangeFeed />
      )}

      <CompetitorDialog open={addOpen} onOpenChange={setAddOpen} />
    </div>
  )
}
