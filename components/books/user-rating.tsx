'use client'

import { useState, useTransition } from 'react'
import { toast } from 'sonner'
import { upsertRating, deleteRating } from '@/app/actions/ratings'
import { StarRating } from './star-rating'
import { Button } from '@/components/ui/button'

interface UserRatingProps {
  bookId: string
  initialRating: number | null
}

export function UserRating({ bookId, initialRating }: UserRatingProps) {
  const [rating, setRating] = useState<number | null>(initialRating)
  const [isPending, startTransition] = useTransition()

  function handleRate(value: number) {
    startTransition(async () => {
      const result = await upsertRating(bookId, value)
      if (result?.error) {
        toast.error(result.error)
      } else {
        setRating(value)
      }
    })
  }

  function handleClear() {
    startTransition(async () => {
      const result = await deleteRating(bookId)
      if (result?.error) {
        toast.error(result.error)
      } else {
        setRating(null)
      }
    })
  }

  return (
    <div className="flex items-center gap-2">
      <StarRating value={rating} onChange={handleRate} size="lg" />
      {rating && (
        <Button
          variant="ghost"
          size="sm"
          className="text-xs text-muted-foreground h-6 px-1"
          disabled={isPending}
          onClick={handleClear}
        >
          Clear
        </Button>
      )}
    </div>
  )
}
