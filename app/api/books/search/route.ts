import { NextRequest, NextResponse } from 'next/server'
import { searchBooks } from '@/lib/open-library/client'
import { searchDocToBook } from '@/lib/open-library/transform'
import { cacheBooks } from '@/lib/open-library/cache'

export const runtime = 'nodejs'

export async function GET(request: NextRequest) {
  const { searchParams } = request.nextUrl
  const query = searchParams.get('q')?.trim()
  const limit = Math.min(Number(searchParams.get('limit') ?? 20), 50)
  const offset = Number(searchParams.get('offset') ?? 0)

  if (!query) {
    return NextResponse.json({ error: 'Missing query parameter "q"' }, { status: 400 })
  }

  try {
    const olResponse = await searchBooks({ query, limit, offset })
    const books = olResponse.docs.map(searchDocToBook)

    // Cache results in background — don't await so the user gets results fast
    cacheBooks(books).catch((err) =>
      console.error('[search] background cache failed:', err)
    )

    return NextResponse.json({
      total: olResponse.numFound,
      offset,
      limit,
      books,
    })
  } catch (err) {
    console.error('[search] Open Library error:', err)
    return NextResponse.json({ error: 'Failed to fetch search results' }, { status: 502 })
  }
}
