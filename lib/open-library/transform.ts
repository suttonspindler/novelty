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

/** Returns true if every character in the string is Latin-script (or punctuation/space) */
function isLatinScript(text: string): boolean {
  return /^[\u0000-\u024F\s\p{P}]+$/u.test(text)
}

/**
 * Deduplicate OL search docs by work key.
 * When multiple docs share the same work key (different editions), keep the one with:
 *   1. Latin-script author names (preferred over non-Latin)
 *   2. Highest edition_count (most popular edition → best cover)
 *   3. A cover image (cover_i present)
 */
export function deduplicateSearchDocs(docs: OLSearchDoc[]): OLSearchDoc[] {
  const byWork = new Map<string, OLSearchDoc>()

  for (const doc of docs) {
    const key = doc.key  // "/works/OL45804W"
    const existing = byWork.get(key)
    if (!existing) {
      byWork.set(key, doc)
      continue
    }

    // Prefer Latin-script authors
    const docIsLatin = (doc.author_name ?? []).every(isLatinScript)
    const existingIsLatin = (existing.author_name ?? []).every(isLatinScript)
    if (docIsLatin && !existingIsLatin) {
      byWork.set(key, doc)
      continue
    }
    if (!docIsLatin && existingIsLatin) continue

    // Both same script — prefer higher edition_count (better cover selection)
    if ((doc.edition_count ?? 0) > (existing.edition_count ?? 0)) {
      byWork.set(key, doc)
    }
  }

  return Array.from(byWork.values())
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
