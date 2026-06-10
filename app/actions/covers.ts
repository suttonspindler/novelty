'use server'

import { revalidatePath } from 'next/cache'
import { createAdminClient } from '@/lib/supabase/admin'
import { requireAdmin } from '@/lib/auth/admin'

/**
 * Make `coverId` the default cover for a book. Admin-only. Unsets the previous
 * default, sets the new one, and syncs books.cover_url (the denormalized
 * pointer every list/grid reads).
 */
export async function setDefaultCover(bookId: string, coverId: string) {
  if (!(await requireAdmin())) return { error: 'Not authorized' }

  const admin = createAdminClient()
  const { data: cover } = await admin
    .from('book_covers')
    .select('url')
    .eq('id', coverId)
    .eq('book_id', bookId)
    .maybeSingle()
  if (!cover) return { error: 'Cover not found' }

  // Clear the old default first to satisfy the one-default-per-book index
  await admin
    .from('book_covers')
    .update({ is_default: false })
    .eq('book_id', bookId)
    .eq('is_default', true)
  const { error } = await admin
    .from('book_covers')
    .update({ is_default: true })
    .eq('id', coverId)
  if (error) return { error: error.message }

  await admin.from('books').update({ cover_url: cover.url }).eq('id', bookId)

  revalidatePath(`/books/${bookId}`)
  return { success: true }
}

/** Add an admin-supplied cover URL to a book's candidate list. Admin-only. */
export async function addManualCover(bookId: string, url: string) {
  if (!(await requireAdmin())) return { error: 'Not authorized' }

  const clean = url.trim()
  if (!/^https?:\/\/\S+$/.test(clean)) return { error: 'Enter a valid http(s) URL' }

  const admin = createAdminClient()
  const { error } = await admin.from('book_covers').upsert(
    { book_id: bookId, url: clean, source: 'manual', source_ref: null },
    { onConflict: 'book_id,url', ignoreDuplicates: true }
  )
  if (error) return { error: error.message }

  revalidatePath(`/books/${bookId}`)
  return { success: true }
}
