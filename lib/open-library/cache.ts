import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import type { Database } from '@/types/database.types'
import type { CoverCandidate } from '@/lib/covers/sources'
import { pickDefault } from '@/lib/covers/sources'

type BookInsert = Database['public']['Tables']['books']['Insert']
type Book = Database['public']['Tables']['books']['Row']
type BookCoverRow = Database['public']['Tables']['book_covers']['Row']

/**
 * Upsert one or more books into the database (our cache of OL metadata).
 * Covers are gathered separately (see collectCovers / saveCovers). Uses the
 * admin client to bypass RLS since the books table is a shared content cache,
 * not user-specific data.
 *
 * Pass `onlyInsert` to skip rows that already exist — used by search-result
 * caching so background re-caching never clobbers a curated cover_url (or
 * other enriched fields) on a book we've already seen.
 */
export async function cacheBooks(
  books: BookInsert[],
  opts: { onlyInsert?: boolean } = {}
): Promise<void> {
  if (!books.length) return
  const supabase = createAdminClient()

  const { error } = await supabase
    .from('books')
    .upsert(books, { onConflict: 'id', ignoreDuplicates: opts.onlyInsert ?? false })
  if (error) {
    console.error('[cache] Failed to upsert books:', error.message)
  }
}

/**
 * Look up the curated cover_url for a set of book ids we may already have
 * cached. Used by search to show the admin-selected default rather than the
 * raw Open Library cover from the live search response.
 */
export async function getCachedCoverUrls(ids: string[]): Promise<Map<string, string>> {
  if (!ids.length) return new Map()
  const supabase = createClient()
  const { data } = await supabase.from('books').select('id, cover_url').in('id', ids)
  const map = new Map<string, string>()
  for (const row of (data as { id: string; cover_url: string | null }[] | null) ?? []) {
    if (row.cover_url) map.set(row.id, row.cover_url)
  }
  return map
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

/** All candidate covers for a book, default first. */
export async function getBookCovers(bookId: string): Promise<BookCoverRow[]> {
  const supabase = createClient()
  const { data } = await supabase
    .from('book_covers')
    .select('*')
    .eq('book_id', bookId)
    .order('is_default', { ascending: false })
    .order('created_at', { ascending: true })
  return (data as BookCoverRow[] | null) ?? []
}

/**
 * Persist gathered cover candidates for a book. Idempotent: existing URLs are
 * skipped via the (book_id, url) unique constraint. If the book has no default
 * cover yet, the top-ranked candidate is promoted and books.cover_url synced.
 * Writes via the service role (book_covers has no write policy).
 */
export async function saveCovers(bookId: string, candidates: CoverCandidate[]): Promise<void> {
  if (!candidates.length) return
  const supabase = createAdminClient()

  const { error } = await supabase.from('book_covers').upsert(
    candidates.map((c) => ({ book_id: bookId, ...c })),
    { onConflict: 'book_id,url', ignoreDuplicates: true }
  )
  if (error) {
    console.error('[covers] Failed to upsert covers:', error.message)
    return
  }

  const { data: existingDefault } = await supabase
    .from('book_covers')
    .select('id')
    .eq('book_id', bookId)
    .eq('is_default', true)
    .maybeSingle()
  if (existingDefault) return

  const { data: all } = await supabase
    .from('book_covers')
    .select('id, url, source, width')
    .eq('book_id', bookId)
  const best = pickDefault((all as { id: string; url: string; source: string; width: number | null }[]) ?? [])
  if (!best) return

  await supabase.from('book_covers').update({ is_default: true }).eq('id', best.id)
  await supabase.from('books').update({ cover_url: best.url }).eq('id', bookId)
}
