import type { Database } from '@/types/database.types'

type BookInsert = Database['public']['Tables']['books']['Insert']

const GOOGLE_BOOKS_BASE = 'https://www.googleapis.com/books/v1'

/**
 * Fetch the best available cover URL for a book ISBN from Google Books.
 * Returns null if not found or API key is missing.
 *
 * Google Books images are publisher-supplied and consistently higher quality
 * than Open Library's crowd-sourced covers.
 */
export async function fetchGoogleBooksCover(isbn: string): Promise<string | null> {
  const apiKey = process.env.GOOGLE_BOOKS_API_KEY
  if (!apiKey) return null

  try {
    const res = await fetch(
      `${GOOGLE_BOOKS_BASE}/volumes?q=isbn:${isbn}&fields=items/volumeInfo/imageLinks&key=${apiKey}`,
      { next: { revalidate: 86400 } }
    )
    if (!res.ok) return null

    const data = await res.json()
    const links = data.items?.[0]?.volumeInfo?.imageLinks
    if (!links) return null

    // Prefer largest available size; fall back through sizes
    const raw: string = links.extraLarge ?? links.large ?? links.medium ?? links.thumbnail ?? ''
    if (!raw) return null

    // Upgrade to zoom=3 (largest reliable size), force HTTPS, strip page-curl artifact
    return raw
      .replace(/zoom=\d/, 'zoom=3')
      .replace('http:', 'https:')
      .replace('&edge=curl', '')
  } catch {
    return null
  }
}

/**
 * Enrich a list of books with Google Books covers in parallel.
 * For each book that has an ISBN and doesn't already have a Google Books cover,
 * fetches a higher-quality cover and replaces the OL cover URL.
 */
export async function enrichWithGoogleCovers(books: BookInsert[]): Promise<BookInsert[]> {
  return Promise.all(
    books.map(async (book) => {
      if (book.cover_url?.includes('books.google')) return book

      // Try isbn-13s first, then isbn-10s; stop at first hit
      const isbns = [
        ...((book.isbn_13 as string[] | null) ?? []).slice(0, 3),
        ...((book.isbn_10 as string[] | null) ?? []).slice(0, 2),
      ]
      for (const isbn of isbns) {
        const coverUrl = await fetchGoogleBooksCover(isbn)
        if (coverUrl) return { ...book, cover_url: coverUrl }
      }
      return book
    })
  )
}
