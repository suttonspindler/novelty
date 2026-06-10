import { notFound } from 'next/navigation'
import type { Metadata } from 'next'
import { createClient } from '@/lib/supabase/server'
import { fetchWork } from '@/lib/open-library/client'
import { searchDocToBook, mergeWorkIntoBook } from '@/lib/open-library/transform'
import { cacheBooks, getCachedBook, getBookCovers, saveCovers } from '@/lib/open-library/cache'
import { collectCovers } from '@/lib/covers/sources'
import { getIsAdmin } from '@/lib/auth/admin'
import { BookCover } from '@/components/books/book-cover'
import { CoverPicker } from '@/components/books/cover-picker'
import { BookCard } from '@/components/books/book-card'
import { AddToShelfButton } from '@/components/books/add-to-shelf-button'
import { UserRating } from '@/components/books/user-rating'
import { ReviewForm } from '@/components/books/review-form'
import { RatingDistribution } from '@/components/books/rating-distribution'
import { StarRating } from '@/components/books/star-rating'
import { Separator } from '@/components/ui/separator'
import type { Book, ReadingSession, Shelf, Review } from '@/types/database.types'
import type { OLSearchDoc } from '@/lib/open-library/types'

interface Props {
  params: { id: string }
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const book = await getBook(params.id)
  if (!book) return { title: 'Book not found — Novelty' }
  return {
    title: `${book.title} — Novelty`,
    description: book.description?.slice(0, 160) ?? undefined,
    openGraph: {
      title: book.title,
      description: book.description?.slice(0, 160) ?? undefined,
      images: book.cover_url ? [book.cover_url] : [],
    },
  }
}

async function getBook(id: string): Promise<Book | null> {
  if (!/^OL\d+W$/.test(id)) return null

  const cached = await getCachedBook(id)
  if (cached?.description) return cached

  try {
    const work = await fetchWork(id)
    const base = cached ?? searchDocToBook({ key: `/works/${id}`, title: work.title } as OLSearchDoc)
    const merged = mergeWorkIntoBook(base, work)
    await cacheBooks([merged])
    return merged as Book
  } catch {
    return cached ?? null
  }
}

export default async function BookPage({ params }: Props) {
  let book = await getBook(params.id)
  if (!book) notFound()

  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()

  // Cover curation is admin-only. Gather candidate covers the first time an
  // admin opens a book (avoids external calls for anonymous/regular viewers),
  // then re-read the book in case the auto-default updated cover_url.
  const isAdmin = await getIsAdmin()
  let covers: Awaited<ReturnType<typeof getBookCovers>> = []
  if (isAdmin) {
    covers = await getBookCovers(book.id)
    if (covers.length === 0) {
      await saveCovers(book.id, await collectCovers(book))
      covers = await getBookCovers(book.id)
      book = (await getCachedBook(book.id)) ?? book
    }
  }

  // Fetch ratings and reviews in parallel
  const [
    { data: allRatings },
    { data: allReviews },
    { data: similarBooks },
  ] = await Promise.all([
    supabase.from('ratings').select('rating, user_id').eq('book_id', book.id),
    supabase
      .from('reviews')
      .select('id, user_id, body, contains_spoilers, created_at, updated_at')
      .eq('book_id', book.id)
      .eq('is_flagged', false)
      .order('created_at', { ascending: false }),
    book.subjects.length > 0
      ? supabase
          .from('books')
          .select('id, title, author_names, cover_url, first_publish_year')
          .overlaps('subjects', book.subjects.slice(0, 3))
          .neq('id', book.id)
          .limit(6)
      : Promise.resolve({ data: [] }),
  ])

  // User-specific data
  let userSession: ReadingSession | null = null
  let userRating: number | null = null
  let userReview: Review | null = null
  let userShelves: Shelf[] = []
  let userBookShelfIds: string[] = []
  let reviewProfiles: Record<string, { username: string; display_name: string | null }> = {}

  if (user) {
    const [
      { data: session },
      { data: rating },
      { data: review },
      { data: shelves },
      { data: bookShelves },
    ] = await Promise.all([
      supabase.from('reading_sessions').select('*').eq('user_id', user.id).eq('book_id', book.id).maybeSingle(),
      supabase.from('ratings').select('rating').eq('user_id', user.id).eq('book_id', book.id).maybeSingle(),
      supabase.from('reviews').select('*').eq('user_id', user.id).eq('book_id', book.id).maybeSingle(),
      supabase.from('shelves').select('*').eq('user_id', user.id).order('is_default', { ascending: false }),
      supabase.from('book_shelves').select('shelf_id').eq('user_id', user.id).eq('book_id', book.id),
    ])
    userSession = session as ReadingSession | null
    userRating = (rating as { rating: number } | null)?.rating ?? null
    userReview = review as Review | null
    userShelves = (shelves as Shelf[] | null) ?? []
    userBookShelfIds = (bookShelves ?? []).map((b) => b.shelf_id)
  }

  // Fetch reviewer profiles
  const reviewerIds = (allReviews ?? []).map((r) => r.user_id)
  if (reviewerIds.length > 0) {
    const { data: profiles } = await supabase
      .from('profiles')
      .select('id, username, display_name')
      .in('id', reviewerIds)
    reviewProfiles = Object.fromEntries(
      (profiles ?? []).map((p) => [p.id, { username: p.username, display_name: p.display_name }])
    )
  }

  const avgRating =
    allRatings && allRatings.length > 0
      ? allRatings.reduce((s, r) => s + r.rating, 0) / allRatings.length
      : null

  return (
    <div className="space-y-10">
      {/* Header */}
      <div className="flex flex-col sm:flex-row gap-8">
        <BookCover src={book.cover_url} title={book.title} size="xl" className="mx-auto sm:mx-0" />

        <div className="flex-1 space-y-4">
          <div>
            <h1 className="text-3xl font-bold leading-tight">{book.title}</h1>
            {book.author_names.length > 0 && (
              <p className="text-lg text-muted-foreground mt-1">{book.author_names.join(', ')}</p>
            )}
            <div className="flex flex-wrap gap-x-4 gap-y-1 mt-2 text-sm text-muted-foreground">
              {book.first_publish_year && <span>{book.first_publish_year}</span>}
              {book.page_count && <span>{book.page_count.toLocaleString()} pages</span>}
              {book.language && <span>{book.language.toUpperCase()}</span>}
            </div>
          </div>

          {/* Community rating */}
          {avgRating != null && (
            <div className="flex items-center gap-3">
              <StarRating value={avgRating} readonly size="md" />
              <span className="font-semibold">{avgRating.toFixed(2)}</span>
              <span className="text-sm text-muted-foreground">
                {allRatings!.length} rating{allRatings!.length !== 1 ? 's' : ''}
              </span>
            </div>
          )}

          {/* User actions */}
          {user ? (
            <div className="space-y-3">
              <AddToShelfButton
                bookId={book.id}
                currentStatus={userSession?.status ?? null}
                shelves={userShelves}
                bookShelfIds={userBookShelfIds}
              />
              <div>
                <p className="text-xs text-muted-foreground mb-1">Your rating</p>
                <UserRating bookId={book.id} initialRating={userRating} />
              </div>
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">
              <a href="/login" className="underline">Sign in</a> to track and rate this book.
            </p>
          )}

          {/* Subjects */}
          {book.subjects.length > 0 && (
            <div className="flex flex-wrap gap-1.5">
              {book.subjects.slice(0, 8).map((subject) => (
                <span
                  key={subject}
                  className="rounded-full bg-muted px-2.5 py-0.5 text-xs text-muted-foreground"
                >
                  {subject}
                </span>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Cover curation — admins only */}
      {isAdmin && <CoverPicker bookId={book.id} covers={covers} />}

      {/* Description */}
      {book.description && (
        <section className="space-y-2">
          <h2 className="text-lg font-semibold">About this book</h2>
          <p className="text-sm leading-relaxed text-muted-foreground whitespace-pre-line">
            {book.description}
          </p>
        </section>
      )}

      <Separator />

      {/* Ratings breakdown */}
      {allRatings && allRatings.length > 0 && (
        <section className="space-y-3">
          <h2 className="text-lg font-semibold">Ratings</h2>
          <RatingDistribution ratings={allRatings} />
        </section>
      )}

      {/* Reviews */}
      <section className="space-y-4">
        <h2 className="text-lg font-semibold">
          Reviews
          {allReviews && allReviews.length > 0 && (
            <span className="ml-2 text-sm font-normal text-muted-foreground">
              ({allReviews.length})
            </span>
          )}
        </h2>

        {/* Write/edit review */}
        {user && (
          <div className="rounded-lg border p-4 space-y-2">
            <p className="text-sm font-medium">{userReview ? 'Your review' : 'Write a review'}</p>
            <ReviewForm
              bookId={book.id}
              existingReview={userReview ? { body: userReview.body, contains_spoilers: userReview.contains_spoilers } : null}
            />
          </div>
        )}

        {/* All reviews */}
        {allReviews && allReviews.length > 0 ? (
          <div className="space-y-4">
            {allReviews.map((review) => {
              const profile = reviewProfiles[review.user_id]
              const isOwn = review.user_id === user?.id
              return (
                <div key={review.id} className="rounded-lg border p-4 space-y-2">
                  <div className="flex items-center justify-between">
                    <a
                      href={profile ? `/profile/${profile.username}` : '#'}
                      className="text-sm font-medium hover:underline"
                    >
                      {profile?.display_name ?? profile?.username ?? 'Unknown'}
                    </a>
                    <span className="text-xs text-muted-foreground">
                      {new Date(review.created_at).toLocaleDateString()}
                    </span>
                  </div>
                  {review.contains_spoilers && (
                    <p className="text-xs text-amber-600 font-medium">⚠ Contains spoilers</p>
                  )}
                  <p className="text-sm leading-relaxed whitespace-pre-line">{review.body}</p>
                  {isOwn && (
                    <p className="text-xs text-muted-foreground">
                      Use the form above to edit or delete your review.
                    </p>
                  )}
                </div>
              )
            })}
          </div>
        ) : (
          !user && (
            <p className="text-sm text-muted-foreground">No reviews yet. Be the first!</p>
          )
        )}
      </section>

      {/* Similar books */}
      {similarBooks && similarBooks.length > 0 && (
        <>
          <Separator />
          <section className="space-y-4">
            <h2 className="text-lg font-semibold">Similar books</h2>
            <div className="grid grid-cols-3 gap-4 sm:grid-cols-4 lg:grid-cols-6">
              {similarBooks.map((b) => (
                <BookCard
                  key={b.id}
                  id={b.id}
                  title={b.title}
                  authorNames={b.author_names}
                  coverUrl={b.cover_url}
                  firstPublishYear={b.first_publish_year}
                />
              ))}
            </div>
          </section>
        </>
      )}
    </div>
  )
}
