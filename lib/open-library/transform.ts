import type { OLSearchDoc, OLWorkResponse } from './types'
import { coverUrlById, toWorkId } from './client'
import type { Database } from '@/types/database.types'

type BookInsert = Database['public']['Tables']['books']['Insert']

/** Extract plain string from OL description field (can be string or {type, value}) */
function extractText(value: string | { type: string; value: string } | undefined): string | null {
  if (!value) return null
  if (typeof value === 'string') return value
  return value.value ?? null
}

/** Map an OL search result doc to our Book insert shape */
export function searchDocToBook(doc: OLSearchDoc): BookInsert {
  const workId = toWorkId(doc.key)
  const coverUrl = doc.cover_i ? coverUrlById(doc.cover_i) : null

  const isbn10: string[] = []
  const isbn13: string[] = []
  for (const isbn of doc.isbn ?? []) {
    if (isbn.length === 10) isbn10.push(isbn)
    else if (isbn.length === 13) isbn13.push(isbn)
  }

  return {
    id: workId,
    title: doc.title,
    author_names: doc.author_name ?? [],
    author_ol_ids: (doc.author_key ?? []).map((k) => k.replace(/^\/authors\//, '')),
    cover_url: coverUrl,
    cover_ol_id: doc.cover_i ?? null,
    isbn_10: isbn10.length ? isbn10 : null,
    isbn_13: isbn13.length ? isbn13 : null,
    first_publish_year: doc.first_publish_year ?? null,
    publish_date: doc.publish_date?.[0] ?? null,
    page_count: doc.number_of_pages_median ?? null,
    subjects: doc.subject?.slice(0, 20) ?? [],   // cap at 20 to avoid bloat
    language: doc.language?.[0] ?? null,
  }
}

/** Merge a full OL work response into an existing Book insert (enriches search doc data) */
export function mergeWorkIntoBook(
  base: BookInsert,
  work: OLWorkResponse
): BookInsert {
  const coverOlId = work.covers?.[0] ?? base.cover_ol_id ?? null
  return {
    ...base,
    description: extractText(work.description),
    cover_ol_id: coverOlId,
    cover_url: coverOlId ? coverUrlById(coverOlId) : base.cover_url,
    subjects: work.subjects?.slice(0, 20) ?? base.subjects ?? [],
    publish_date: work.first_publish_date ?? base.publish_date ?? null,
  }
}
