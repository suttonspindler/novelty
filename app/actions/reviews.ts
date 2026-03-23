'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'

export async function upsertReview(formData: FormData) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Not authenticated' }

  const bookId = formData.get('book_id') as string
  const body = (formData.get('body') as string).trim()
  const containsSpoilers = formData.get('contains_spoilers') === 'true'

  if (!body) return { error: 'Review cannot be empty' }
  if (body.length > 10000) return { error: 'Review is too long' }

  const { error } = await supabase.from('reviews').upsert(
    { user_id: user.id, book_id: bookId, body, contains_spoilers: containsSpoilers },
    { onConflict: 'user_id,book_id' }
  )
  if (error) return { error: error.message }

  revalidatePath(`/books/${bookId}`)
  return { success: true }
}

export async function deleteReview(bookId: string) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Not authenticated' }

  const { error } = await supabase
    .from('reviews')
    .delete()
    .eq('user_id', user.id)
    .eq('book_id', bookId)
  if (error) return { error: error.message }

  revalidatePath(`/books/${bookId}`)
  return { success: true }
}
