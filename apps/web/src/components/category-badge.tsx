import { Badge } from '@/components/ui/badge'
import type { Category } from '@/types/domain'

const labels: Record<Category, string> = {
  pricing: 'Pricing',
  product: 'Product',
  messaging: 'Messaging',
  hiring: 'Hiring',
  funding: 'Funding',
  other: 'Other',
}

export function CategoryBadge({ category }: { category: Category }) {
  return (
    <Badge variant="secondary" className="font-normal">
      {labels[category]}
    </Badge>
  )
}
