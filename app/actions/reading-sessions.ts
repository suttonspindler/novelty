'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'
import type { ReadingSession } from '@/types/database.types'

type Status = ReadingSession['status']

export async function upsertReadingSession(
  bookId: string,
  status: Status,
  dates?: { date_started?: string | null; date_finished?: string | null }
) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Not authenticated' }

  const now = new Date().toISOString().split('T')[0]

  const payload: {
    user_id: string
    book_id: string
    status: Status
    date_started?: string | null
    date_finished?: string | null
  } = {
    user_id: user.id,
    book_id: bookId,
    status,
    ...dates,
  }

  // Auto-set dates based on status transitions
  if (status === 'currently_reading' && !dates?.date_started) {
    payload.date_started = now
  }
  if (status === 'read' && !dates?.date_finished) {
    payload.date_finished = now
  }

  const { error } = await supabase
    .from('reading_sessions')
    .upsert(payload, { onConflict: 'user_id,book_id' })
  if (error) return { error: error.message }

  // Also add to the matching default shelf
  const slugMap: Record<Status, string> = {
    want_to_read: 'want-to-read',
    currently_reading: 'currently-reading',
    read: 'read',
    dnf: 'dnf',
  }

  const { data: shelf } = await supabase
    .from('shelves')
    .select('id')
    .eq('user_id', user.id)
    .eq('slug', slugMap[status])
    .single()

  if (shelf) {
    await supabase.from('book_shelves').upsert(
      { user_id: user.id, book_id: bookId, shelf_id: shelf.id },
      { onConflict: 'user_id,book_id,shelf_id', ignoreDuplicates: true }
    )
  }

  revalidatePath('/dashboard')
  revalidatePath(`/books/${bookId}`)
  return { success: true }
}

export async function removeFromReading(bookId: string) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Not authenticated' }

  const { error } = await supabase
    .from('reading_sessions')
    .delete()
    .eq('user_id', user.id)
    .eq('book_id', bookId)
  if (error) return { error: error.message }

  revalidatePath('/dashboard')
  revalidatePath(`/books/${bookId}`)
  return { success: true }
}
