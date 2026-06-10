import type { Database } from '@/types/database.types'
import { coverUrlById } from '@/lib/open-library/client'

type BookInsert = Database['public']['Tables']['books']['Insert']

export type CoverSource = 'google' | 'openlibrary' | 'itunes' | 'manual'

export interface CoverCandidate {
  url: string
  source: CoverSource
  source_ref: string | null
  width: number | null
  height: number | null
}

/**
 * Auto-default priority. A manually-added cover always wins; otherwise prefer
 * the Google canonical edition, then Apple's clean high-res art, then any OL
 * edition cover. This only chooses the *initial* default — the admin overrides
 * it in the cover picker.
 */
const SOURCE_PRIORITY: Record<CoverSource, number> = {
  manual: 0,
  google: 1,
  itunes: 2,
  openlibrary: 3,
}

const GOOGLE_BOOKS_BASE = 'https://www.googleapis.com/books/v1'
const ITUNES_BASE = 'https://itunes.apple.com/search'
const OL_BASE = 'https://openlibrary.org'

// Cache external cover lookups for 24h — covers don't change often
const FETCH_OPTS: RequestInit = { next: { revalidate: 86400 } }

/** Infer a cover's source from its URL (used to classify pre-existing cover_url values). */
function classifySource(url: string): CoverSource {
  if (url.includes('books.google')) return 'google'
  if (url.includes('mzstatic.com') || url.includes('itunes')) return 'itunes'
  if (url.includes('openlibrary.org')) return 'openlibrary'
  return 'manual'
}

/** Pick the best initial default from a set of candidates (highest priority, then largest). */
export function pickDefault<T extends { source: string; width: number | null }>(
  covers: T[]
): T | undefined {
  return [...covers].sort((a, b) => {
    const pa = SOURCE_PRIORITY[a.source as CoverSource] ?? 99
    const pb = SOURCE_PRIORITY[b.source as CoverSource] ?? 99
    if (pa !== pb) return pa - pb
    return (b.width ?? 0) - (a.width ?? 0)
  })[0]
}

// ── Google Books ─────────────────────────────────────────────

/**
 * Google's imageLinks return ~128px thumbnails. The content URL supports a
 * `zoom` param; dropping the curl edge and lowering zoom yields a markedly
 * larger image than the raw thumbnail.
 */
function upgradeGoogleUrl(raw: string): string {
  return raw
    .replace('http:', 'https:')
    .replace('&edge=curl', '')
    .replace(/&zoom=\d+/, '&zoom=0')
}

async function fetchGoogleCovers(
  title: string,
  author: string,
  apiKey: string
): Promise<CoverCandidate[]> {
  try {
    const lastName = author.split(' ').pop() ?? author
    const q = encodeURIComponent(`intitle:${title} inauthor:${lastName}`)
    const res = await fetch(
      `${GOOGLE_BOOKS_BASE}/volumes?q=${q}&langRestrict=en&printType=books&maxResults=10&fields=items(id,volumeInfo/imageLinks)&key=${apiKey}`,
      FETCH_OPTS
    )
    if (!res.ok) return []
    const data = (await res.json()) as {
      items?: { id: string; volumeInfo?: { imageLinks?: Record<string, string> } }[]
    }
    const out: CoverCandidate[] = []
    for (const item of data.items ?? []) {
      const links = item.volumeInfo?.imageLinks
      const raw = links?.thumbnail ?? links?.smallThumbnail
      if (!raw) continue
      out.push({
        url: upgradeGoogleUrl(raw),
        source: 'google',
        source_ref: item.id,
        width: null,
        height: null,
      })
    }
    return out
  } catch {
    return []
  }
}

// ── Apple / iTunes ───────────────────────────────────────────

/**
 * iTunes Search API is keyless and often has the cleanest covers. artworkUrl100
 * ends in `100x100bb.jpg`; swapping the dimensions requests a larger render.
 */
async function fetchItunesCovers(title: string, author: string): Promise<CoverCandidate[]> {
  try {
    const term = encodeURIComponent(`${title} ${author}`.trim())
    const res = await fetch(
      `${ITUNES_BASE}?term=${term}&media=ebook&entity=ebook&limit=8`,
      FETCH_OPTS
    )
    if (!res.ok) return []
    const data = (await res.json()) as {
      results?: { trackId?: number; artworkUrl100?: string }[]
    }
    const out: CoverCandidate[] = []
    for (const r of data.results ?? []) {
      if (!r.artworkUrl100) continue
      out.push({
        url: r.artworkUrl100.replace(/\/100x100bb\.(jpg|png)$/, '/600x600bb.$1'),
        source: 'itunes',
        source_ref: r.trackId ? String(r.trackId) : null,
        width: 600,
        height: 600,
      })
    }
    return out
  } catch {
    return []
  }
}

// ── Open Library editions ────────────────────────────────────

/**
 * Pull every edition of the work and collect each one's cover_i. This is the
 * variety source — alternate printings, regional jackets, etc.
 */
async function fetchOpenLibraryCovers(workId: string): Promise<CoverCandidate[]> {
  try {
    const res = await fetch(`${OL_BASE}/works/${workId}/editions.json?limit=50`, FETCH_OPTS)
    if (!res.ok) return []
    const data = (await res.json()) as { entries?: { covers?: number[] }[] }
    const seen = new Set<number>()
    const out: CoverCandidate[] = []
    for (const entry of data.entries ?? []) {
      for (const coverId of entry.covers ?? []) {
        // OL uses -1 / 0 as "no cover" sentinels
        if (coverId <= 0 || seen.has(coverId)) continue
        seen.add(coverId)
        out.push({
          url: coverUrlById(coverId),
          source: 'openlibrary',
          source_ref: String(coverId),
          width: null,
          height: null,
        })
      }
    }
    return out
  } catch {
    return []
  }
}

// ── Orchestration ────────────────────────────────────────────

/**
 * Gather candidate covers for a book from every source in parallel and return a
 * deduplicated list. The work-level OL cover_i on the book (if any) is included
 * so it's always among the options.
 */
export async function collectCovers(book: BookInsert): Promise<CoverCandidate[]> {
  const title = book.title ?? ''
  const author = (book.author_names as string[] | null)?.[0] ?? ''
  const apiKey = process.env.GOOGLE_BOOKS_API_KEY

  const [google, itunes, ol] = await Promise.all([
    apiKey && title && author ? fetchGoogleCovers(title, author, apiKey) : Promise.resolve([]),
    title ? fetchItunesCovers(title, author) : Promise.resolve([]),
    book.id ? fetchOpenLibraryCovers(book.id) : Promise.resolve([]),
  ])

  const candidates = [...google, ...itunes, ...ol]

  // Always include the cover already being displayed so the picker can never
  // show fewer covers than what's on screen — even when every live source
  // comes back empty (obscure/foreign titles, stale Google URLs, etc.).
  const existingUrl = book.cover_url as string | null
  if (existingUrl && !candidates.some((c) => c.url === existingUrl)) {
    candidates.push({
      url: existingUrl,
      source: classifySource(existingUrl),
      source_ref: null,
      width: null,
      height: null,
    })
  }

  // Make sure the book's OL cover (by id) is in the pool too
  const existingOlId = book.cover_ol_id as number | null
  if (existingOlId && existingOlId > 0) {
    const url = coverUrlById(existingOlId)
    if (!candidates.some((c) => c.url === url)) {
      candidates.push({
        url,
        source: 'openlibrary',
        source_ref: String(existingOlId),
        width: null,
        height: null,
      })
    }
  }

  // Dedup by URL
  const byUrl = new Map<string, CoverCandidate>()
  for (const c of candidates) {
    if (!byUrl.has(c.url)) byUrl.set(c.url, c)
  }
  return Array.from(byUrl.values())
}
