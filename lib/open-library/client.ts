import type {
  OLSearchResponse,
  OLWorkResponse,
  OLAuthorResponse,
  OLEditionResponse,
} from './types'

const OL_BASE = 'https://openlibrary.org'
const OL_COVERS = 'https://covers.openlibrary.org'

// Cache OL responses for 24h — books don't change often
const OL_FETCH_OPTIONS: RequestInit = {
  next: { revalidate: 86400 },
}

async function olFetch<T>(path: string): Promise<T> {
  const url = `${OL_BASE}${path}`
  const res = await fetch(url, OL_FETCH_OPTIONS)
  if (!res.ok) {
    throw new Error(`Open Library fetch failed: ${res.status} ${url}`)
  }
  return res.json() as Promise<T>
}

// ── Search ───────────────────────────────────────────────────

export interface SearchOptions {
  query: string
  limit?: number
  offset?: number
  /** Filter to a subject/genre */
  subject?: string
}

export async function searchBooks(options: SearchOptions): Promise<OLSearchResponse> {
  const { query, limit = 20, offset = 0, subject } = options
  const params = new URLSearchParams({
    q: query,
    limit: String(limit),
    offset: String(offset),
    fields: [
      'key',
      'title',
      'author_name',
      'author_key',
      'first_publish_year',
      'publish_date',
      'cover_i',
      'isbn',
      'number_of_pages_median',
      'subject',
      'language',
      'edition_count',
    ].join(','),
  })
  if (subject) params.set('subject', subject)

  return olFetch<OLSearchResponse>(`/search.json?${params}`)
}

// ── Work (book) details ──────────────────────────────────────

/** workId is the bare ID e.g. "OL45804W" (no "/works/" prefix) */
export async function fetchWork(workId: string): Promise<OLWorkResponse> {
  return olFetch<OLWorkResponse>(`/works/${workId}.json`)
}

// ── Author details ───────────────────────────────────────────

/** authorId is the bare ID e.g. "OL34184A" */
export async function fetchAuthor(authorId: string): Promise<OLAuthorResponse> {
  return olFetch<OLAuthorResponse>(`/authors/${authorId}.json`)
}

// ── Edition details ──────────────────────────────────────────

export async function fetchEdition(editionKey: string): Promise<OLEditionResponse> {
  return olFetch<OLEditionResponse>(`/books/${editionKey}.json`)
}

// ── Cover URL helpers ────────────────────────────────────────

export type CoverSize = 'S' | 'M' | 'L'

export function coverUrlById(coverId: number, size: CoverSize = 'L'): string {
  return `${OL_COVERS}/b/id/${coverId}-${size}.jpg`
}

export function coverUrlByIsbn(isbn: string, size: CoverSize = 'L'): string {
  return `${OL_COVERS}/b/isbn/${isbn}-${size}.jpg`
}

// ── Work ID utils ────────────────────────────────────────────

/** Strip "/works/" prefix from an OL key → bare work ID */
export function toWorkId(olKey: string): string {
  return olKey.replace(/^\/works\//, '')
}

/** Strip "/authors/" prefix from an OL key → bare author ID */
export function toAuthorId(olKey: string): string {
  return olKey.replace(/^\/authors\//, '')
}
