import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'

export default async function DashboardPage() {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: profile } = await supabase
    .from('profiles')
    .select('username, display_name')
    .eq('id', user.id)
    .single()

  const { data: shelves } = await supabase
    .from('shelves')
    .select('id, name, slug')
    .eq('user_id', user.id)
    .order('is_default', { ascending: false })
    .order('created_at')

  const { count: booksRead } = await supabase
    .from('reading_sessions')
    .select('*', { count: 'exact', head: true })
    .eq('user_id', user.id)
    .eq('status', 'read')

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold">
          {profile?.display_name ? `Welcome back, ${profile.display_name}` : 'My books'}
        </h1>
        <p className="text-muted-foreground mt-1">
          {booksRead ?? 0} book{booksRead !== 1 ? 's' : ''} read
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {shelves?.map((shelf) => (
          <div
            key={shelf.id}
            className="rounded-lg border bg-card p-4 text-card-foreground"
          >
            <p className="text-sm text-muted-foreground">{shelf.name}</p>
            <p className="text-2xl font-bold mt-1">—</p>
          </div>
        ))}
      </div>

      <div className="rounded-lg border bg-card p-8 text-center text-muted-foreground">
        <p className="font-medium">No books yet</p>
        <p className="text-sm mt-1">Search for a book to get started.</p>
      </div>
    </div>
  )
}
