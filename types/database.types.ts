export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[]

export type Database = {
  public: {
    Tables: {
      profiles: {
        Row: {
          id: string
          username: string
          display_name: string | null
          bio: string | null
          avatar_url: string | null
          website: string | null
          is_private: boolean
          created_at: string
          updated_at: string
        }
        Insert: {
          id: string
          username: string
          display_name?: string | null
          bio?: string | null
          avatar_url?: string | null
          website?: string | null
          is_private?: boolean
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          username?: string
          display_name?: string | null
          bio?: string | null
          avatar_url?: string | null
          website?: string | null
          is_private?: boolean
          created_at?: string
          updated_at?: string
        }
      }
      books: {
        Row: {
          id: string
          title: string
          author_names: string[]
          author_ol_ids: string[]
          description: string | null
          cover_url: string | null
          cover_ol_id: number | null
          isbn_10: string[] | null
          isbn_13: string[] | null
          publish_date: string | null
          first_publish_year: number | null
          page_count: number | null
          subjects: string[]
          language: string | null
          country_of_origin: string | null
          original_language: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id: string
          title: string
          author_names?: string[]
          author_ol_ids?: string[]
          description?: string | null
          cover_url?: string | null
          cover_ol_id?: number | null
          isbn_10?: string[] | null
          isbn_13?: string[] | null
          publish_date?: string | null
          first_publish_year?: number | null
          page_count?: number | null
          subjects?: string[]
          language?: string | null
          country_of_origin?: string | null
          original_language?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          title?: string
          author_names?: string[]
          author_ol_ids?: string[]
          description?: string | null
          cover_url?: string | null
          cover_ol_id?: number | null
          isbn_10?: string[] | null
          isbn_13?: string[] | null
          publish_date?: string | null
          first_publish_year?: number | null
          page_count?: number | null
          subjects?: string[]
          language?: string | null
          country_of_origin?: string | null
          original_language?: string | null
          created_at?: string
          updated_at?: string
        }
      }
      shelves: {
        Row: {
          id: string
          user_id: string
          name: string
          slug: string
          is_default: boolean
          created_at: string
        }
        Insert: {
          id?: string
          user_id: string
          name: string
          slug: string
          is_default?: boolean
          created_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          name?: string
          slug?: string
          is_default?: boolean
          created_at?: string
        }
      }
      book_shelves: {
        Row: {
          id: string
          user_id: string
          book_id: string
          shelf_id: string
          added_at: string
        }
        Insert: {
          id?: string
          user_id: string
          book_id: string
          shelf_id: string
          added_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          book_id?: string
          shelf_id?: string
          added_at?: string
        }
      }
      ratings: {
        Row: {
          id: string
          user_id: string
          book_id: string
          rating: number
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          user_id: string
          book_id: string
          rating: number
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          book_id?: string
          rating?: number
          created_at?: string
          updated_at?: string
        }
      }
      reviews: {
        Row: {
          id: string
          user_id: string
          book_id: string
          body: string
          contains_spoilers: boolean
          is_flagged: boolean
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          user_id: string
          book_id: string
          body: string
          contains_spoilers?: boolean
          is_flagged?: boolean
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          book_id?: string
          body?: string
          contains_spoilers?: boolean
          is_flagged?: boolean
          created_at?: string
          updated_at?: string
        }
      }
      review_likes: {
        Row: {
          user_id: string
          review_id: string
          created_at: string
        }
        Insert: {
          user_id: string
          review_id: string
          created_at?: string
        }
        Update: {
          user_id?: string
          review_id?: string
          created_at?: string
        }
      }
      review_comments: {
        Row: {
          id: string
          user_id: string
          review_id: string
          body: string
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          user_id: string
          review_id: string
          body: string
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          review_id?: string
          body?: string
          created_at?: string
          updated_at?: string
        }
      }
      reading_sessions: {
        Row: {
          id: string
          user_id: string
          book_id: string
          status: 'want_to_read' | 'currently_reading' | 'read' | 'dnf'
          date_started: string | null
          date_finished: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          user_id: string
          book_id: string
          status: 'want_to_read' | 'currently_reading' | 'read' | 'dnf'
          date_started?: string | null
          date_finished?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          book_id?: string
          status?: 'want_to_read' | 'currently_reading' | 'read' | 'dnf'
          date_started?: string | null
          date_finished?: string | null
          created_at?: string
          updated_at?: string
        }
      }
      reading_schedules: {
        Row: {
          id: string
          user_id: string
          book_id: string
          target_date: string
          chapters: ScheduleChapter[]
          daily_assignments: DailyAssignment[]
          is_active: boolean
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          user_id: string
          book_id: string
          target_date: string
          chapters?: ScheduleChapter[]
          daily_assignments?: DailyAssignment[]
          is_active?: boolean
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          book_id?: string
          target_date?: string
          chapters?: ScheduleChapter[]
          daily_assignments?: DailyAssignment[]
          is_active?: boolean
          created_at?: string
          updated_at?: string
        }
      }
      characters: {
        Row: {
          id: string
          user_id: string
          book_id: string
          name: string
          description: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          user_id: string
          book_id: string
          name: string
          description?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          book_id?: string
          name?: string
          description?: string | null
          created_at?: string
          updated_at?: string
        }
      }
      follows: {
        Row: {
          follower_id: string
          following_id: string
          created_at: string
        }
        Insert: {
          follower_id: string
          following_id: string
          created_at?: string
        }
        Update: {
          follower_id?: string
          following_id?: string
          created_at?: string
        }
      }
    }
    Views: Record<string, never>
    Functions: Record<string, never>
    Enums: Record<string, never>
  }
}

// ── JSONB shape helpers ──────────────────────────────────────

export interface ScheduleChapter {
  name: string
  start_page: number
  end_page: number
  completed: boolean
}

export interface DailyAssignment {
  date: string          // ISO date string "YYYY-MM-DD"
  chapter_indices: number[]
  page_count: number
}

// ── Convenience row type aliases ─────────────────────────────

type Tables = Database['public']['Tables']

export type Profile         = Tables['profiles']['Row']
export type Book            = Tables['books']['Row']
export type Shelf           = Tables['shelves']['Row']
export type BookShelf       = Tables['book_shelves']['Row']
export type Rating          = Tables['ratings']['Row']
export type Review          = Tables['reviews']['Row']
export type ReviewLike      = Tables['review_likes']['Row']
export type ReviewComment   = Tables['review_comments']['Row']
export type ReadingSession  = Tables['reading_sessions']['Row']
export type ReadingSchedule = Tables['reading_schedules']['Row']
export type Character       = Tables['characters']['Row']
export type Follow          = Tables['follows']['Row']
