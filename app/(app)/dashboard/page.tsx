import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { ShelfManager } from './shelf-manager'

export const metadata = { title: 'My Books — Novelty' }

export default async function DashboardPage() {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: profile } = await supabase
    .from('profiles')
    .select('username, display_name')
    .eq('id', user.id)
    .single()

  // Fetch shelves with book counts
  const { data: shelves } = await supabase
    .from('shelves')
    .select('id, name, slug, is_default')
    .eq('user_id', user.id)
    .order('is_default', { ascending: false })
    .order('created_at')

  const { data: bookShelfCounts } = await supabase
    .from('book_shelves')
    .select('shelf_id')
    .eq('user_id', user.id)

  const countByShelf = (bookShelfCounts ?? []).reduce<Record<string, number>>((acc, row) => {
    acc[row.shelf_id] = (acc[row.shelf_id] ?? 0) + 1
    return acc
  }, {})

  const { data: recentSessions } = await supabase
    .from('reading_sessions')
    .select('book_id, status, date_finished, updated_at')
    .eq('user_id', user.id)
    .order('updated_at', { ascending: false })
    .limit(5)

  const recentBookIds = recentSessions?.map((s) => s.book_id) ?? []
  const { data: recentBooks } = recentBookIds.length
    ? await supabase.from('books').select('id, title, author_names, cover_url').in('id', recentBookIds)
    : { data: [] }

  const bookMap = Object.fromEntries((recentBooks ?? []).map((b) => [b.id, b]))

  const defaultShelves = shelves?.filter((s) => s.is_default) ?? []
  const customShelves = shelves?.filter((s) => !s.is_default) ?? []

  return (
    <div className="space-y-10">
      <div>
        <h1 className="text-2xl font-bold">
          {profile?.display_name ? `${profile.display_name}'s books` : 'My books'}
        </h1>
      </div>

      {/* Default shelves */}
      <section className="space-y-3">
        <h2 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">Shelves</h2>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {defaultShelves.map((shelf) => (
            <div key={shelf.id} className="rounded-lg border bg-card p-4">
              <p className="text-sm text-muted-foreground">{shelf.name}</p>
              <p className="text-3xl font-bold mt-1">{countByShelf[shelf.id] ?? 0}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Custom shelves */}
      {customShelves.length > 0 && (
        <section className="space-y-3">
          <h2 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">Custom shelves</h2>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            {customShelves.map((shelf) => (
              <div key={shelf.id} className="rounded-lg border bg-card p-4">
                <p className="text-sm text-muted-foreground">{shelf.name}</p>
                <p className="text-3xl font-bold mt-1">{countByShelf[shelf.id] ?? 0}</p>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* Recent activity */}
      <section className="space-y-3">
        <h2 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">Recent activity</h2>
        {recentSessions && recentSessions.length > 0 ? (
          <div className="divide-y rounded-lg border">
            {recentSessions.map((session) => {
              const book = bookMap[session.book_id]
              if (!book) return null
              return (
                <div key={session.book_id} className="flex items-center gap-3 p-3">
                  {book.cover_url && (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={book.cover_url} alt={book.title} className="h-12 w-8 object-cover rounded" />
                  )}
                  <div className="flex-1 min-w-0">
                    <p className="font-medium truncate">{book.title}</p>
                    <p className="text-sm text-muted-foreground truncate">{book.author_names[0]}</p>
                  </div>
                  <span className="text-xs text-muted-foreground capitalize shrink-0">
                    {session.status.replace(/_/g, ' ')}
                  </span>
                </div>
              )
            })}
          </div>
        ) : (
          <div className="rounded-lg border bg-card p-8 text-center text-muted-foreground">
            <p className="font-medium">No books yet</p>
            <p className="text-sm mt-1">Search for a book to get started.</p>
          </div>
        )}
      </section>

      {/* Shelf manager */}
      <section className="space-y-3">
        <h2 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">Manage shelves</h2>
        <ShelfManager customShelves={customShelves} />
      </section>
    </div>
  )
}
