import { searchBooks } from '@/lib/open-library/client'
import { searchDocToBook, deduplicateSearchDocs } from '@/lib/open-library/transform'
import { cacheBooks } from '@/lib/open-library/cache'
import { BookCard } from '@/components/books/book-card'
import { SearchInput } from './search-input'

interface Props {
  searchParams: { q?: string; page?: string }
}

export async function generateMetadata({ searchParams }: Props) {
  return { title: searchParams.q ? `"${searchParams.q}" — Novelty` : 'Search — Novelty' }
}

const PAGE_SIZE = 20

export default async function SearchPage({ searchParams }: Props) {
  const query = searchParams.q?.trim() ?? ''
  const page = Math.max(1, Number(searchParams.page ?? 1))
  const offset = (page - 1) * PAGE_SIZE

  let books: ReturnType<typeof searchDocToBook>[] = []
  let total = 0

  if (query) {
    try {
      // Fetch 3x more docs so deduplication has a larger pool to work with
      const result = await searchBooks({ query, limit: PAGE_SIZE * 3, offset })
      const dedupedDocs = deduplicateSearchDocs(result.docs).slice(0, PAGE_SIZE)
      books = dedupedDocs.map(searchDocToBook)
      total = result.numFound

      // Cache in background
      cacheBooks(books).catch(() => {})
    } catch {
      // OL unavailable — show empty state
    }
  }

  const totalPages = Math.ceil(total / PAGE_SIZE)

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Search</h1>
      </div>

      <SearchInput defaultValue={query} />

      {query && (
        <p className="text-sm text-muted-foreground">
          {total > 0
            ? `${total.toLocaleString()} results for "${query}"`
            : `No results for "${query}"`}
        </p>
      )}

      {books.length > 0 && (
        <div className="grid grid-cols-3 gap-4 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-6">
          {books.map((book) => (
            <BookCard
              key={book.id}
              id={book.id}
              title={book.title}
              authorNames={book.author_names ?? []}
              coverUrl={book.cover_url ?? null}
              firstPublishYear={book.first_publish_year ?? null}
            />
          ))}
        </div>
      )}

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-center gap-2 pt-4">
          {page > 1 && (
            <a
              href={`/search?q=${encodeURIComponent(query)}&page=${page - 1}`}
              className="rounded-md border px-3 py-1.5 text-sm hover:bg-accent"
            >
              ← Previous
            </a>
          )}
          <span className="text-sm text-muted-foreground">
            Page {page} of {totalPages.toLocaleString()}
          </span>
          {page < totalPages && (
            <a
              href={`/search?q=${encodeURIComponent(query)}&page=${page + 1}`}
              className="rounded-md border px-3 py-1.5 text-sm hover:bg-accent"
            >
              Next →
            </a>
          )}
        </div>
      )}

      {!query && (
        <div className="py-16 text-center text-muted-foreground">
          <p className="text-lg font-medium">Search for any book</p>
          <p className="text-sm mt-1">Powered by Open Library — millions of books available.</p>
        </div>
      )}
    </div>
  )
}
