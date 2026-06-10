-- ============================================================
-- Novelty — Migration 002: multiple covers per book + admin role
-- Run this in the Supabase SQL editor (Dashboard > SQL Editor)
-- ============================================================

-- ── Admin role ───────────────────────────────────────────────
-- Letterboxd-style cover curation is admin-only for now. There is no admin
-- yet, so bootstrap the first one by email (your account must already exist
-- in auth.users). This UPDATE is idempotent — safe to re-run to re-promote.
alter table public.profiles
  add column if not exists is_admin boolean not null default false;

update public.profiles p
set is_admin = true
from auth.users u
where u.id = p.id
  and u.email = 'suttonspindler@gmail.com';

-- ── Book covers ──────────────────────────────────────────────
-- Many candidate covers per book, gathered from several sources. One row per
-- book is flagged is_default; books.cover_url is kept in sync with it so every
-- existing list/grid query stays fast and unchanged.
create table if not exists public.book_covers (
  id          uuid primary key default gen_random_uuid(),
  book_id     text not null references public.books(id) on delete cascade,
  url         text not null,
  source      text not null check (source in ('google','openlibrary','itunes','manual')),
  source_ref  text,                        -- volume id / cover_i / trackId, for dedup
  width       integer,
  height      integer,
  is_default  boolean not null default false,
  created_at  timestamptz not null default now(),
  unique (book_id, url)
);

create index on public.book_covers (book_id);

-- At most one default cover per book
create unique index one_default_cover_per_book
  on public.book_covers (book_id)
  where is_default;

-- ── Row level security ───────────────────────────────────────
alter table public.book_covers enable row level security;

create policy "Book covers are viewable by everyone"
  on public.book_covers for select
  using (true);

-- Writes (insert/update/delete) are performed by the service-role client after
-- an app-level is_admin check, so no write policy is defined here — the service
-- role bypasses RLS, matching how the books cache table is written.
