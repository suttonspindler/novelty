import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { fetchGoogleBooksCover } from '@/lib/google-books/client'
import type { Database } from '@/types/database.types'

type BookInsert = Database['public']['Tables']['books']['Insert']
type Book = Database['public']['Tables']['books']['Row']

/**
 * Upsert one or more books into the database (our cache of OL metadata).
 * Preserves any existing Google Books cover URLs so repeated upserts don't
 * downgrade covers back to OL quality. Then fires a background job to
 * upgrade remaining OL covers to Google Books covers via ISBN lookup.
 */
export async function cacheBooks(books: BookInsert[]): Promise<void> {
  if (!books.length) return
  const supabase = createClient()

  // Fetch existing cover URLs so we don't overwrite already-upgraded covers
  const ids = books.map((b) => b.id!)
  const { data: existing } = await supabase
    .from('books')
    .select('id, cover_url')
    .in('id', ids)

  const existingCovers = new Map(
    (existing ?? []).map((b) => [b.id, b.cover_url])
  )

  // Preserve Google Books covers — don't let OL upsert overwrite them
  const booksToUpsert = books.map((book) => {
    const stored = existingCovers.get(book.id!)
    if (stored?.includes('books.google')) return { ...book, cover_url: stored }
    return book
  })

  const { error } = await supabase
    .from('books')
    .upsert(booksToUpsert, { onConflict: 'id', ignoreDuplicates: false })
  if (error) {
    console.error('[cache] Failed to upsert books:', error.message)
    return
  }

  // Upgrade covers to Google Books in the background — don't block the caller
  upgradeCovers(booksToUpsert).catch(() => {})
}

/**
 * For each book that has an ISBN and doesn't already have a Google Books cover,
 * fetch a better cover URL from Google Books and save it to the database.
 * Uses the admin client since this runs outside the request context.
 */
async function upgradeCovers(books: BookInsert[]): Promise<void> {
  // Use service-role client — this runs asynchronously outside the request
  // lifecycle where the cookie-based server client is no longer available
  const supabase = createAdminClient()

  await Promise.all(
    books.map(async (book) => {
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
