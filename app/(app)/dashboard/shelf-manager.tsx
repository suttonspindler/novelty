'use client'

import { useState, useTransition } from 'react'
import { toast } from 'sonner'
import { createShelf, renameShelf, deleteShelf } from '@/app/actions/shelves'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'

interface Shelf {
  id: string
  name: string
  slug: string
  is_default: boolean
}

export function ShelfManager({ customShelves }: { customShelves: Shelf[] }) {
  const [creating, setCreating] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editName, setEditName] = useState('')
  const [isPending, startTransition] = useTransition()

  async function handleCreate(formData: FormData) {
    startTransition(async () => {
      const result = await createShelf(formData)
      if (result?.error) toast.error(result.error)
      else { toast.success('Shelf created.'); setCreating(false) }
    })
  }

  async function handleRename(shelfId: string) {
    if (!editName.trim()) return
    startTransition(async () => {
      const result = await renameShelf(shelfId, editName.trim())
      if (result?.error) toast.error(result.error)
      else { toast.success('Shelf renamed.'); setEditingId(null) }
    })
  }

  async function handleDelete(shelfId: string, name: string) {
    if (!confirm(`Delete shelf "${name}"? Books will be removed from this shelf.`)) return
    startTransition(async () => {
      const result = await deleteShelf(shelfId)
      if (result?.error) toast.error(result.error)
      else toast.success('Shelf deleted.')
    })
  }

  return (
    <div className="space-y-3 rounded-lg border p-4">
      {customShelves.length > 0 && (
        <ul className="space-y-2">
          {customShelves.map((shelf) => (
            <li key={shelf.id} className="flex items-center gap-2">
              {editingId === shelf.id ? (
                <>
                  <Input
                    value={editName}
                    onChange={(e) => setEditName(e.target.value)}
                    className="h-8"
                    onKeyDown={(e) => { if (e.key === 'Enter') handleRename(shelf.id) }}
                    autoFocus
                  />
                  <Button size="sm" disabled={isPending} onClick={() => handleRename(shelf.id)}>Save</Button>
                  <Button size="sm" variant="ghost" onClick={() => setEditingId(null)}>Cancel</Button>
                </>
              ) : (
                <>
                  <span className="flex-1 text-sm">{shelf.name}</span>
                  <Button size="sm" variant="ghost" onClick={() => { setEditingId(shelf.id); setEditName(shelf.name) }}>
                    Rename
                  </Button>
                  <Button
                    size="sm"
                    variant="ghost"
                    className="text-destructive hover:text-destructive"
                    disabled={isPending}
                    onClick={() => handleDelete(shelf.id, shelf.name)}
                  >
                    Delete
                  </Button>
                </>
              )}
            </li>
          ))}
        </ul>
      )}

      {creating ? (
        <form action={handleCreate} className="flex items-center gap-2">
          <Input name="name" placeholder="Shelf name" className="h-8" autoFocus required />
          <Button type="submit" size="sm" disabled={isPending}>Create</Button>
          <Button type="button" size="sm" variant="ghost" onClick={() => setCreating(false)}>Cancel</Button>
        </form>
      ) : (
        <Button size="sm" variant="outline" onClick={() => setCreating(true)}>
          + New shelf
        </Button>
      )}
    </div>
  )
}
