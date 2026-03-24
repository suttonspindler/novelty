'use client'

import { useTransition } from 'react'
import { toast } from 'sonner'
import { upsertReadingSession, removeFromReading } from '@/app/actions/reading-sessions'
import { addBookToShelf, removeBookFromShelf } from '@/app/actions/shelves'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import type { ReadingSession, Shelf } from '@/types/database.types'
import { ChevronDown } from 'lucide-react'

type Status = ReadingSession['status']

const STATUS_LABELS: Record<Status, string> = {
  want_to_read: 'Want to Read',
  currently_reading: 'Currently Reading',
  read: 'Read',
  dnf: 'Did Not Finish',
}

interface AddToShelfButtonProps {
  bookId: string
  currentStatus: Status | null
  shelves: Shelf[]
  bookShelfIds: string[]
}

export function AddToShelfButton({
  bookId,
  currentStatus,
  shelves,
  bookShelfIds,
}: AddToShelfButtonProps) {
  const [isPending, startTransition] = useTransition()

  function setStatus(status: Status) {
    startTransition(async () => {
      const result = await upsertReadingSession(bookId, status)
      if (result?.error) toast.error(result.error)
    })
  }

  function removeStatus() {
    startTransition(async () => {
      const result = await removeFromReading(bookId)
      if (result?.error) toast.error(result.error)
    })
  }

  function toggleShelf(shelf: Shelf) {
    const isOn = bookShelfIds.includes(shelf.id)
    startTransition(async () => {
      const result = isOn
        ? await removeBookFromShelf(bookId, shelf.id)
        : await addBookToShelf(bookId, shelf.id)
      if (result?.error) toast.error(result.error)
    })
  }

  const customShelves = shelves.filter((s) => !s.is_default)

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant={currentStatus ? 'default' : 'outline'} disabled={isPending}>
          {currentStatus ? STATUS_LABELS[currentStatus] : 'Add to shelf'}
          <ChevronDown className="ml-1 h-4 w-4" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start" className="w-52">
        <DropdownMenuLabel>Reading status</DropdownMenuLabel>
        {(Object.keys(STATUS_LABELS) as Status[]).map((status) => (
          <DropdownMenuItem
            key={status}
            onSelect={() => setStatus(status)}
            className={currentStatus === status ? 'font-semibold' : ''}
          >
            {STATUS_LABELS[status]}
          </DropdownMenuItem>
        ))}
        {currentStatus && (
          <>
            <DropdownMenuSeparator />
            <DropdownMenuItem
              onSelect={removeStatus}
              className="text-destructive focus:text-destructive"
            >
              Remove from shelves
            </DropdownMenuItem>
          </>
        )}
        {customShelves.length > 0 && (
          <>
            <DropdownMenuSeparator />
            <DropdownMenuLabel>Custom shelves</DropdownMenuLabel>
            {customShelves.map((shelf) => (
              <DropdownMenuItem key={shelf.id} onSelect={() => toggleShelf(shelf)}>
                <span className="mr-2">{bookShelfIds.includes(shelf.id) ? '✓' : '+'}</span>
                {shelf.name}
              </DropdownMenuItem>
            ))}
          </>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
