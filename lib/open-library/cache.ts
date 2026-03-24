import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import type { Database } from '@/types/database.types'

type BookInsert = Database['public']['Tables']['books']['Insert']
type Book = Database['public']['Tables']['books']['Row']

/**
 * Upsert one or more books into the database (our cache of OL metadata).
 * Books should already have Google Books covers applied before calling this
 * (via enrichWithGoogleCovers). Uses the admin client to bypass RLS since
 * the books table is a shared content cache, not user-specific data.
 */
export async function cacheBooks(books: BookInsert[]): Promise<void> {
  if (!books.length) return
  const supabase = createAdminClient()

  const { error } = await supabase
    .from('books')
    .upsert(books, { onConflict: 'id', ignoreDuplicates: false })
  if (error) {
    console.error('[cache] Failed to upsert books:', error.message)
  }
}

/**
 * Return a book from the database if it exists, otherwise null.
 * Use this to check the cache before hitting Open Library.
 */
export async function getCachedBook(workId: string): Promise<Book | null> {
  const supabase = createClient()
  const { data } = await supabase.from('books').select('*').eq('id', workId).maybeSingle()
  return (data as Book | null) ?? null
}
