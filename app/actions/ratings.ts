'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'

export async function upsertRating(bookId: string, rating: number) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Not authenticated' }

  const validRatings = [0.5, 1, 1.5, 2, 2.5, 3, 3.5, 4, 4.5, 5]
  if (!validRatings.includes(rating)) return { error: 'Invalid rating value' }

  const { error } = await supabase.from('ratings').upsert(
    { user_id: user.id, book_id: bookId, rating },
    { onConflict: 'user_id,book_id' }
  )
  if (error) return { error: error.message }

  revalidatePath(`/books/${bookId}`)
  revalidatePath(`/dashboard`)
  return { success: true }
}

export async function deleteRating(bookId: string) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Not authenticated' }

  const { error } = await supabase
    .from('ratings')
    .delete()
    .eq('user_id', user.id)
    .eq('book_id', bookId)
  if (error) return { error: error.message }

  revalidatePath(`/books/${bookId}`)
  return { success: true }
}
