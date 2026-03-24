// ── Open Library API response shapes ────────────────────────
// Docs: https://openlibrary.org/developers/api

export interface OLSearchResponse {
  numFound: number
  start: number
  docs: OLSearchDoc[]
}

export interface OLSearchDoc {
  key: string                   // "/works/OL45804W"
  title: string
  author_name?: string[]
  author_key?: string[]         // ["/authors/OL34184A"]
  author_alternative_name?: string[]  // romanized/alternate forms e.g. "Haruki Murakami"
  first_publish_year?: number
  publish_date?: string[]
  cover_i?: number              // cover ID for covers.openlibrary.org
  isbn?: string[]
  number_of_pages_median?: number
  subject?: string[]
  language?: string[]
  edition_count?: number
}

export interface OLWorkResponse {
  key: string                   // "/works/OL45804W"
  title: string
  description?: string | { type: string; value: string }
  subjects?: string[]
  covers?: number[]
  authors?: { author: { key: string } }[]
  first_publish_date?: string
}

export interface OLAuthorResponse {
  key: string                   // "/authors/OL34184A"
  name: string
  alternate_names?: string[]    // includes romanized forms e.g. "Haruki Murakami"
  personal_name?: string
  birth_date?: string
  death_date?: string
  bio?: string | { type: string; value: string }
  photos?: number[]
}

export interface OLEditionResponse {
  key: string
  title: string
  isbn_10?: string[]
  isbn_13?: string[]
  number_of_pages?: number
  publish_date?: string
  languages?: { key: string }[]
  covers?: number[]
}
