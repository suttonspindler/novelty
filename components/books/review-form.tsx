'use client'

import { useState, useTransition } from 'react'
import { toast } from 'sonner'
import { upsertReview, deleteReview } from '@/app/actions/reviews'
import { Button } from '@/components/ui/button'
import { Separator } from '@/components/ui/separator'

const MAX_LENGTH = 10000

interface ReviewFormProps {
  bookId: string
  existingReview?: { body: string; contains_spoilers: boolean } | null
  onCancel?: () => void
}

export function ReviewForm({ bookId, existingReview, onCancel }: ReviewFormProps) {
  const [body, setBody] = useState(existingReview?.body ?? '')
  const [spoilers, setSpoilers] = useState(existingReview?.contains_spoilers ?? false)
  const [isPending, startTransition] = useTransition()
  const [isDeleting, startDeleting] = useTransition()

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    const formData = new FormData()
    formData.set('book_id', bookId)
    formData.set('body', body)
    formData.set('contains_spoilers', String(spoilers))

    startTransition(async () => {
      const result = await upsertReview(formData)
      if (result?.error) {
        toast.error(result.error)
      } else {
        toast.success(existingReview ? 'Review updated.' : 'Review posted.')
        onCancel?.()
      }
    })
  }

  async function handleDelete() {
    startDeleting(async () => {
      const result = await deleteReview(bookId)
      if (result?.error) {
        toast.error(result.error)
      } else {
        toast.success('Review deleted.')
        setBody('')
        onCancel?.()
      }
    })
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-3">
      <textarea
        value={body}
        onChange={(e) => setBody(e.target.value)}
        maxLength={MAX_LENGTH}
        rows={5}
        placeholder="Write your review…"
        className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 resize-none"
        required
      />
      <div className="flex items-center justify-between text-xs text-muted-foreground">
        <label className="flex items-center gap-1.5 cursor-pointer">
          <input
            type="checkbox"
            checked={spoilers}
            onChange={(e) => setSpoilers(e.target.checked)}
            className="h-3.5 w-3.5"
          />
          Contains spoilers
        </label>
        <span className={body.length > MAX_LENGTH * 0.9 ? 'text-destructive' : ''}>
          {body.length.toLocaleString()} / {MAX_LENGTH.toLocaleString()}
        </span>
      </div>
      <div className="flex items-center gap-2">
        <Button type="submit" size="sm" disabled={isPending || !body.trim()}>
          {isPending ? 'Saving…' : existingReview ? 'Update review' : 'Post review'}
        </Button>
        {onCancel && (
          <Button type="button" size="sm" variant="ghost" onClick={onCancel}>
            Cancel
          </Button>
        )}
        {existingReview && (
          <>
            <Separator orientation="vertical" className="h-4" />
            <Button
              type="button"
              size="sm"
              variant="ghost"
              className="text-destructive hover:text-destructive"
              disabled={isDeleting}
              onClick={handleDelete}
            >
              {isDeleting ? 'Deleting…' : 'Delete'}
            </Button>
          </>
        )}
      </div>
    </form>
  )
}
