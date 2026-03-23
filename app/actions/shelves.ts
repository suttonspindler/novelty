'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'

export async function addBookToShelf(bookId: string, shelfId: string) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Not authenticated' }

  const { error } = await supabase.from('book_shelves').upsert(
    { user_id: user.id, book_id: bookId, shelf_id: shelfId },
    { onConflict: 'user_id,book_id,shelf_id', ignoreDuplicates: true }
  )
  if (error) return { error: error.message }

  revalidatePath('/dashboard')
  revalidatePath(`/books/${bookId}`)
  return { success: true }
}

export async function removeBookFromShelf(bookId: string, shelfId: string) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Not authenticated' }

  const { error } = await supabase
    .from('book_shelves')
    .delete()
    .eq('user_id', user.id)
    .eq('book_id', bookId)
    .eq('shelf_id', shelfId)
  if (error) return { error: error.message }

  revalidatePath('/dashboard')
  revalidatePath(`/books/${bookId}`)
  return { success: true }
}

export async function createShelf(formData: FormData) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Not authenticated' }

  const name = (formData.get('name') as string).trim()
  if (!name) return { error: 'Shelf name is required' }

  const slug = name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '')

  const { error } = await supabase.from('shelves').insert({
    user_id: user.id,
    name,
    slug: `custom-${slug}-${Date.now()}`,
    is_default: false,
  })
  if (error) return { error: error.message }

  revalidatePath('/dashboard')
  return { success: true }
}

export async function renameShelf(shelfId: string, name: string) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Not authenticated' }

  const { error } = await supabase
    .from('shelves')
    .update({ name })
    .eq('id', shelfId)
    .eq('user_id', user.id)
    .eq('is_default', false)
  if (error) return { error: error.message }

  revalidatePath('/dashboard')
  return { success: true }
}

export async function deleteShelf(shelfId: string) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Not authenticated' }

  const { error } = await supabase
    .from('shelves')
    .delete()
    .eq('id', shelfId)
    .eq('user_id', user.id)
    .eq('is_default', false)
  if (error) return { error: error.message }

  revalidatePath('/dashboard')
  return { success: true }
}
