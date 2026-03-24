import { createClient } from '@/lib/supabase/server'
import { fetchGoogleBooksCover } from '@/lib/google-books/client'
import type { Database } from '@/types/database.types'

type BookInsert = Database['public']['Tables']['books']['Insert']
type Book = Database['public']['Tables']['books']['Row']

/**
 * Upsert one or more books into the database (our cache of OL metadata).
 * After upserting, fires a background job to upgrade any OL covers to
 * higher-quality Google Books covers (looked up by ISBN).
 */
export async function cacheBooks(books: BookInsert[]): Promise<void> {
  if (!books.length) return
  const supabase = createClient()
  const { error } = await supabase
    .from('books')
    .upsert(books, { onConflict: 'id', ignoreDuplicates: false })
  if (error) {
    console.error('[cache] Failed to upsert books:', error.message)
    return
  }

  // Upgrade covers to Google Books in the background — don't block the caller
  upgradeCovers(books).catch(() => {})
}

/**
 * For each book that has an ISBN and doesn't already have a Google Books cover,
 * fetch a better cover URL from Google Books and save it to the database.
 * Runs in parallel across all books.
 */
async function upgradeCovers(books: BookInsert[]): Promise<void> {
  const supabase = createClient()

  await Promise.all(
    books.map(async (book) => {
      // Skip if we already have a Google Books cover stored
      if (book.cover_url?.includes('books.google')) return

      const isbn = book.isbn_13?.[0] ?? book.isbn_10?.[0]
      if (!isbn) return

      const coverUrl = await fetchGoogleBooksCover(isbn)
      if (!coverUrl) return

      const { error } = await supabase
        .from('books')
        .update({ cover_url: coverUrl })
        .eq('id', book.id!)
      if (error) {
        console.error('[cache] Failed to upgrade cover for', book.id, error.message)
      }
    })
  )
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
