import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export const runtime = 'nodejs'

export async function GET() {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const [profile, shelves, bookShelves, ratings, reviews, readingSessions, readingSchedules, characters, follows] =
    await Promise.all([
      supabase.from('profiles').select('*').eq('id', user.id).single().then((r) => r.data),
      supabase.from('shelves').select('*').eq('user_id', user.id).then((r) => r.data),
      supabase.from('book_shelves').select('*').eq('user_id', user.id).then((r) => r.data),
      supabase.from('ratings').select('*').eq('user_id', user.id).then((r) => r.data),
      supabase.from('reviews').select('*').eq('user_id', user.id).then((r) => r.data),
      supabase.from('reading_sessions').select('*').eq('user_id', user.id).then((r) => r.data),
      supabase.from('reading_schedules').select('*').eq('user_id', user.id).then((r) => r.data),
      supabase.from('characters').select('*').eq('user_id', user.id).then((r) => r.data),
      supabase.from('follows').select('*').eq('follower_id', user.id).then((r) => r.data),
    ])

  const exportData = {
    exported_at: new Date().toISOString(),
    user: { id: user.id, email: user.email },
    profile,
    shelves,
    book_shelves: bookShelves,
    ratings,
    reviews,
    reading_sessions: readingSessions,
    reading_schedules: readingSchedules,
    characters,
    follows,
  }

  return new NextResponse(JSON.stringify(exportData, null, 2), {
    headers: {
      'Content-Type': 'application/json',
      'Content-Disposition': 'attachment; filename="novelty-export.json"',
    },
  })
}
