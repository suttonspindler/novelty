'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { setDefaultCover, addManualCover } from '@/app/actions/covers'
import type { BookCoverRow } from '@/types/database.types'
import { cn } from '@/lib/utils'

interface CoverPickerProps {
  bookId: string
  covers: BookCoverRow[]
}

/**
 * Admin-only cover curation. Renders every candidate cover for a book; click
 * one to make it the displayed default (Letterboxd-style), or paste a URL to
 * add your own. Only mounted for admins by the book page.
 */
export function CoverPicker({ bookId, covers }: CoverPickerProps) {
  const router = useRouter()
  const [pending, startTransition] = useTransition()
  const [url, setUrl] = useState('')
  const [error, setError] = useState<string | null>(null)

  function choose(coverId: string) {
    setError(null)
    startTransition(async () => {
      const res = await setDefaultCover(bookId, coverId)
      if (res.error) setError(res.error)
      else router.refresh()
    })
  }

  function addUrl(e: React.FormEvent) {
    e.preventDefault()
    if (!url.trim()) return
    setError(null)
    startTransition(async () => {
      const res = await addManualCover(bookId, url)
      if (res.error) {
        setError(res.error)
      } else {
        setUrl('')
        router.refresh()
      }
    })
  }

  return (
    <section className="space-y-3 rounded-lg border border-dashed p-4">
      <div className="flex items-center justify-between">
        <h2 className="text-sm font-semibold">Covers (admin)</h2>
        <span className="text-xs text-muted-foreground">
          {covers.length} candidate{covers.length !== 1 ? 's' : ''}
        </span>
      </div>

      {covers.length > 0 ? (
        <div className="grid grid-cols-4 gap-3 sm:grid-cols-6 lg:grid-cols-8">
          {covers.map((cover) => (
            <button
              key={cover.id}
              type="button"
              disabled={pending}
              onClick={() => choose(cover.id)}
              title={`${cover.source}${cover.is_default ? ' • default' : ''}`}
              className={cn(
                'relative aspect-[2/3] overflow-hidden rounded border transition',
                'hover:ring-2 hover:ring-primary disabled:opacity-50',
                cover.is_default ? 'ring-2 ring-primary' : 'border-border'
              )}
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={cover.url}
                alt={`${cover.source} cover`}
                className="h-full w-full object-cover"
              />
              {cover.is_default && (
                <span className="absolute bottom-0 inset-x-0 bg-primary py-0.5 text-center text-[10px] font-medium text-primary-foreground">
                  Default
                </span>
              )}
              <span className="absolute top-0 left-0 bg-black/60 px-1 text-[9px] uppercase text-white">
                {cover.source}
              </span>
            </button>
          ))}
        </div>
      ) : (
        <p className="text-xs text-muted-foreground">No covers found for this book yet.</p>
      )}

      <form onSubmit={addUrl} className="flex gap-2">
        <input
          type="url"
          value={url}
          onChange={(e) => setUrl(e.target.value)}
          placeholder="Add a cover by URL…"
          className="flex-1 rounded-md border bg-background px-3 py-1.5 text-sm"
        />
        <button
          type="submit"
          disabled={pending || !url.trim()}
          className="rounded-md border px-3 py-1.5 text-sm hover:bg-accent disabled:opacity-50"
        >
          Add
        </button>
      </form>

      {error && <p className="text-xs text-destructive">{error}</p>}
    </section>
  )
}
