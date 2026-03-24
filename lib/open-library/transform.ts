import type { OLSearchDoc, OLWorkResponse } from './types'
import { coverUrlById, toWorkId, fetchAuthor, toAuthorId } from './client'
import type { Database } from '@/types/database.types'

type BookInsert = Database['public']['Tables']['books']['Insert']

/** Extract plain string from OL description field (can be string or {type, value}) */
function extractText(value: string | { type: string; value: string } | undefined): string | null {
  if (!value) return null
  if (typeof value === 'string') return value
  return value.value ?? null
}

/** Returns true if the string contains no characters outside the Latin Unicode blocks */
function isLatinScript(text: string): boolean {
  return !/[^\u0000-\u024F\s]/.test(text)
}

/**
 * For each doc whose primary author names are non-Latin, fetch the OL author
 * record and replace with the canonical Latin name (e.g. "Haruki Murakami").
 * Only non-Latin authors trigger a fetch; runs in parallel so the cost is
 * one extra request per unique non-Latin author in the result set.
 */
export async function resolveAuthorNames(docs: OLSearchDoc[]): Promise<OLSearchDoc[]> {
  // Build a cache so we only fetch each unique author once
  const authorCache = new Map<string, string>()

  return Promise.all(
    docs.map(async (doc) => {
      const names = doc.author_name ?? []
      if (names.every(isLatinScript)) return doc

      const authorKey = doc.author_key?.[0]
      if (!authorKey) return doc

      try {
        let canonicalName = authorCache.get(authorKey)
        if (!canonicalName) {
          const author = await fetchAuthor(toAuthorId(authorKey))
          // Try canonical name first, then alternate_names, then personal_name
          const candidates = [
            author.name,
            ...(author.alternate_names ?? []),
            author.personal_name,
          ].filter((n): n is string => !!n && isLatinScript(n))

          if (candidates.length > 0) {
            // Normalize ALL-CAPS entries (OL stores some alternate names in caps)
            const best = candidates[0]
            canonicalName = best === best.toUpperCase() && best !== best.toLowerCase()
              ? best.replace(/\S+/g, (w) => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase())
              : best
            authorCache.set(authorKey, canonicalName)
          }
        }
        if (canonicalName) {
          return { ...doc, author_name: [canonicalName] }
        }
      } catch {
        // OL author fetch failed — keep original names
      }

      return doc
    })
  )
}

function bestDoc(a: OLSearchDoc, b: OLSearchDoc): OLSearchDoc {
  const aIsLatin = (a.author_name ?? []).every(isLatinScript)
  const bIsLatin = (b.author_name ?? []).every(isLatinScript)
  if (aIsLatin && !bIsLatin) return a
  if (bIsLatin && !aIsLatin) return b
  return (a.edition_count ?? 0) >= (b.edition_count ?? 0) ? a : b
}

/**
 * Deduplicate OL search docs in two passes:
 *
 * Pass 1 — by exact work key: collapses docs that are literally the same OL work.
 *
 * Pass 2 — by (normalized title + first author key): OL creates separate work
 *   entries for each language translation of the same book, so "Norwegian Wood"
 *   in English vs the Japanese original are different work keys but should be
 *   shown once. Grouping by title + author key collapses these.
 *
 * In both passes, prefer Latin-script author names, then highest edition_count.
 */
export function deduplicateSearchDocs(docs: OLSearchDoc[]): OLSearchDoc[] {
  // Drop entries with no author — these are usually bare catalog stubs
  const withAuthor = docs.filter((d) => (d.author_name ?? []).length > 0)

  // Pass 1: exact work key
  const byWork = new Map<string, OLSearchDoc>()
  for (const doc of withAuthor) {
    const existing = byWork.get(doc.key)
    byWork.set(doc.key, existing ? bestDoc(existing, doc) : doc)
  }

  // Pass 2: normalized title + first author key
  const byTitleAuthor = new Map<string, OLSearchDoc>()
  for (const doc of Array.from(byWork.values())) {
    const titleNorm = doc.title.toLowerCase().replace(/[^a-z0-9]/g, '')
    // Use OL author key (stable ID) so "Murakami" always groups together
    // regardless of how his name is spelled in different work entries
    const authorKey = doc.author_key?.[0] ?? ''
    const groupKey = `${titleNorm}|${authorKey}`
    const existing = byTitleAuthor.get(groupKey)
    byTitleAuthor.set(groupKey, existing ? bestDoc(existing, doc) : doc)
  }

  return Array.from(byTitleAuthor.values())
}

/** Map an OL search result doc to our Book insert shape */
export function searchDocToBook(doc: OLSearchDoc): BookInsert {
  const workId = toWorkId(doc.key)
  // Use the specific edition cover from cover_i as the OL fallback.
  // The work-level cover endpoint (coverUrlByWorkId) can return OL's "no image"
  // placeholder even when cover_i is present, because the work-level cover is
  // separately registered. cover_i is always a real image.
  // Google Books enrichment will override this with a better cover when available.
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
    cover_ol_id: doc.cover_i ?? null,  // kept for reference; cover_url uses work-level endpoint
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
  // Don't overwrite a Google Books cover with a lower-quality OL cover
  const hasGoogleCover = base.cover_url?.includes('books.google')
  return {
    ...base,
    description: extractText(work.description),
    cover_ol_id: coverOlId,
    cover_url: hasGoogleCover ? base.cover_url : (coverOlId ? coverUrlById(coverOlId) : base.cover_url),
    subjects: work.subjects?.slice(0, 20) ?? base.subjects ?? [],
    publish_date: work.first_publish_date ?? base.publish_date ?? null,
  }
}
