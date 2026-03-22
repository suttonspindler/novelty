import { NextRequest, NextResponse } from 'next/server'
import { fetchWork } from '@/lib/open-library/client'
import { searchDocToBook, mergeWorkIntoBook } from '@/lib/open-library/transform'
import { getCachedBook, cacheBooks } from '@/lib/open-library/cache'
import type { OLSearchDoc } from '@/lib/open-library/types'

export const runtime = 'nodejs'

export async function GET(
  _request: NextRequest,
  { params }: { params: { id: string } }
) {
  const workId = params.id

  if (!workId || !/^OL\d+W$/.test(workId)) {
    return NextResponse.json({ error: 'Invalid work ID' }, { status: 400 })
  }

  // 1. Check our database cache first
  const cached = await getCachedBook(workId)
  if (cached?.description) {
    // We have a fully-enriched record — return immediately
    return NextResponse.json({ book: cached })
  }

  // 2. Fetch full work details from Open Library
  try {
    const work = await fetchWork(workId)

    // Build a base insert from whatever we already have cached (may be partial from search)
    const base = cached
      ? { ...cached }
      : searchDocToBook({ key: `/works/${workId}`, title: work.title } as OLSearchDoc)

    const enriched = mergeWorkIntoBook(base, work)

    // Cache the enriched record
    await cacheBooks([enriched])

    return NextResponse.json({ book: enriched })
  } catch (err) {
    console.error(`[book/${workId}] Open Library error:`, err)

    // If we have a partial cached record, return it with a flag
    if (cached) {
      return NextResponse.json({ book: cached, partial: true })
    }

    return NextResponse.json({ error: 'Failed to fetch book details' }, { status: 502 })
  }
}
