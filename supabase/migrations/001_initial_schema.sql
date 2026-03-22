-- ============================================================
-- Novelty — Initial Schema
-- Run this in the Supabase SQL editor (Dashboard > SQL Editor)
-- ============================================================

-- ============================================================
-- TABLES
-- ============================================================

-- Profiles: extends auth.users (1-to-1)
create table public.profiles (
  id            uuid primary key references auth.users(id) on delete cascade,
  username      text unique not null,
  display_name  text,
  bio           text,
  avatar_url    text,
  website       text,
  is_private    boolean not null default false,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);

-- Books: metadata cached from Open Library
create table public.books (
  id                  text primary key,  -- Open Library work ID e.g. "OL45804W"
  title               text not null,
  author_names        text[] not null default '{}',
  author_ol_ids       text[] not null default '{}',
  description         text,
  cover_url           text,
  cover_ol_id         integer,
  isbn_10             text[],
  isbn_13             text[],
  publish_date        text,
  first_publish_year  integer,
  page_count          integer,
  subjects            text[] not null default '{}',
  language            text,
  country_of_origin   text,
  original_language   text,
  created_at          timestamptz not null default now(),
  updated_at          timestamptz not null default now()
);

-- Shelves: default + custom reading lists per user
create table public.shelves (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null references public.profiles(id) on delete cascade,
  name        text not null,
  slug        text not null,   -- e.g. "want-to-read", "currently-reading", "read", "dnf"
  is_default  boolean not null default false,
  created_at  timestamptz not null default now(),
  unique (user_id, slug)
);

-- BookShelves: many-to-many books <-> shelves
create table public.book_shelves (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null references public.profiles(id) on delete cascade,
  book_id     text not null references public.books(id) on delete cascade,
  shelf_id    uuid not null references public.shelves(id) on delete cascade,
  added_at    timestamptz not null default now(),
  unique (user_id, book_id, shelf_id)
);

-- Ratings: 0.5-star increments, one per user per book
create table public.ratings (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null references public.profiles(id) on delete cascade,
  book_id     text not null references public.books(id) on delete cascade,
  rating      numeric(3,1) not null check (rating in (0.5,1.0,1.5,2.0,2.5,3.0,3.5,4.0,4.5,5.0)),
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now(),
  unique (user_id, book_id)
);

-- Reviews: one per user per book
create table public.reviews (
  id                 uuid primary key default gen_random_uuid(),
  user_id            uuid not null references public.profiles(id) on delete cascade,
  book_id            text not null references public.books(id) on delete cascade,
  body               text not null,
  contains_spoilers  boolean not null default false,
  is_flagged         boolean not null default false,
  created_at         timestamptz not null default now(),
  updated_at         timestamptz not null default now(),
  unique (user_id, book_id)
);

-- Review likes
create table public.review_likes (
  user_id    uuid not null references public.profiles(id) on delete cascade,
  review_id  uuid not null references public.reviews(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (user_id, review_id)
);

-- Review comments
create table public.review_comments (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null references public.profiles(id) on delete cascade,
  review_id   uuid not null references public.reviews(id) on delete cascade,
  body        text not null,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

-- Reading sessions: tracks status + dates per user per book
create table public.reading_sessions (
  id              uuid primary key default gen_random_uuid(),
  user_id         uuid not null references public.profiles(id) on delete cascade,
  book_id         text not null references public.books(id) on delete cascade,
  status          text not null check (status in ('want_to_read','currently_reading','read','dnf')),
  date_started    date,
  date_finished   date,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now(),
  unique (user_id, book_id)
);

-- Reading schedules: chapter-level schedule optimizer data
-- chapters: [{name, start_page, end_page, completed}]
-- daily_assignments: [{date, chapter_indices, page_count}]
create table public.reading_schedules (
  id                 uuid primary key default gen_random_uuid(),
  user_id            uuid not null references public.profiles(id) on delete cascade,
  book_id            text not null references public.books(id) on delete cascade,
  target_date        date not null,
  chapters           jsonb not null default '[]',
  daily_assignments  jsonb not null default '[]',
  is_active          boolean not null default true,
  created_at         timestamptz not null default now(),
  updated_at         timestamptz not null default now()
);

-- Characters: private per-user per-book notes
create table public.characters (
  id           uuid primary key default gen_random_uuid(),
  user_id      uuid not null references public.profiles(id) on delete cascade,
  book_id      text not null references public.books(id) on delete cascade,
  name         text not null,
  description  text,
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now()
);

-- Follows: social graph
create table public.follows (
  follower_id   uuid not null references public.profiles(id) on delete cascade,
  following_id  uuid not null references public.profiles(id) on delete cascade,
  created_at    timestamptz not null default now(),
  primary key (follower_id, following_id),
  check (follower_id != following_id)
);

-- ============================================================
-- INDEXES
-- ============================================================

create index on public.book_shelves (user_id);
create index on public.book_shelves (book_id);
create index on public.book_shelves (shelf_id);
create index on public.ratings (book_id);
create index on public.reviews (book_id);
create index on public.review_comments (review_id);
create index on public.review_likes (review_id);
create index on public.reading_sessions (user_id);
create index on public.reading_sessions (book_id);
create index on public.reading_schedules (user_id);
create index on public.characters (user_id, book_id);
create index on public.follows (following_id);
create index on public.books (first_publish_year);
create index on public.books using gin(subjects);
create index on public.books using gin(author_names);

-- ============================================================
-- TRIGGERS
-- ============================================================

-- Auto-create profile when a user signs up
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  insert into public.profiles (id, username, display_name)
  values (
    new.id,
    regexp_replace(split_part(new.email, '@', 1), '[^a-zA-Z0-9_]', '_', 'g'),
    split_part(new.email, '@', 1)
  );
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

-- Auto-create default shelves when a profile is created
create or replace function public.handle_new_profile()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  insert into public.shelves (user_id, name, slug, is_default) values
    (new.id, 'Want to Read',      'want-to-read',       true),
    (new.id, 'Currently Reading', 'currently-reading',  true),
    (new.id, 'Read',              'read',               true),
    (new.id, 'Did Not Finish',    'dnf',                true);
  return new;
end;
$$;

create trigger on_profile_created
  after insert on public.profiles
  for each row execute procedure public.handle_new_profile();

-- Keep updated_at current
create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger set_profiles_updated_at          before update on public.profiles          for each row execute procedure public.set_updated_at();
create trigger set_books_updated_at             before update on public.books             for each row execute procedure public.set_updated_at();
create trigger set_ratings_updated_at           before update on public.ratings           for each row execute procedure public.set_updated_at();
create trigger set_reviews_updated_at           before update on public.reviews           for each row execute procedure public.set_updated_at();
create trigger set_review_comments_updated_at   before update on public.review_comments   for each row execute procedure public.set_updated_at();
create trigger set_reading_sessions_updated_at  before update on public.reading_sessions  for each row execute procedure public.set_updated_at();
create trigger set_reading_schedules_updated_at before update on public.reading_schedules for each row execute procedure public.set_updated_at();
create trigger set_characters_updated_at        before update on public.characters        for each row execute procedure public.set_updated_at();

-- ============================================================
-- ROW LEVEL SECURITY
-- ============================================================

alter table public.profiles          enable row level security;
alter table public.books             enable row level security;
alter table public.shelves           enable row level security;
alter table public.book_shelves      enable row level security;
alter table public.ratings           enable row level security;
alter table public.reviews           enable row level security;
alter table public.review_likes      enable row level security;
alter table public.review_comments   enable row level security;
alter table public.reading_sessions  enable row level security;
alter table public.reading_schedules enable row level security;
alter table public.characters        enable row level security;
alter table public.follows           enable row level security;

-- profiles
create policy "Public profiles are viewable by everyone"
  on public.profiles for select
  using (not is_private or auth.uid() = id);

create policy "Users can insert their own profile"
  on public.profiles for insert
  with check (auth.uid() = id);

create policy "Users can update their own profile"
  on public.profiles for update
  using (auth.uid() = id);

-- books (public read, authenticated write — seeding via service role bypasses RLS)
create policy "Books are viewable by everyone"
  on public.books for select
  using (true);

create policy "Authenticated users can add books"
  on public.books for insert
  with check (auth.role() = 'authenticated');

-- shelves
create policy "Shelves are viewable based on profile privacy"
  on public.shelves for select
  using (
    auth.uid() = user_id
    or exists (
      select 1 from public.profiles p
      where p.id = user_id and not p.is_private
    )
  );

create policy "Users can insert their own shelves"
  on public.shelves for insert
  with check (auth.uid() = user_id);

create policy "Users can update their own shelves"
  on public.shelves for update
  using (auth.uid() = user_id);

create policy "Users can delete their own non-default shelves"
  on public.shelves for delete
  using (auth.uid() = user_id and not is_default);

-- book_shelves
create policy "Book shelf entries viewable based on profile privacy"
  on public.book_shelves for select
  using (
    auth.uid() = user_id
    or exists (
      select 1 from public.profiles p
      where p.id = user_id and not p.is_private
    )
  );

create policy "Users can manage their own book shelf entries"
  on public.book_shelves for insert
  with check (auth.uid() = user_id);

create policy "Users can delete their own book shelf entries"
  on public.book_shelves for delete
  using (auth.uid() = user_id);

-- ratings
create policy "Ratings are viewable by everyone"
  on public.ratings for select
  using (true);

create policy "Users can insert their own ratings"
  on public.ratings for insert
  with check (auth.uid() = user_id);

create policy "Users can update their own ratings"
  on public.ratings for update
  using (auth.uid() = user_id);

create policy "Users can delete their own ratings"
  on public.ratings for delete
  using (auth.uid() = user_id);

-- reviews
create policy "Reviews are viewable by everyone"
  on public.reviews for select
  using (true);

create policy "Users can insert their own reviews"
  on public.reviews for insert
  with check (auth.uid() = user_id);

create policy "Users can update their own reviews"
  on public.reviews for update
  using (auth.uid() = user_id);

create policy "Users can delete their own reviews"
  on public.reviews for delete
  using (auth.uid() = user_id);

-- review_likes
create policy "Review likes are viewable by everyone"
  on public.review_likes for select
  using (true);

create policy "Users can like reviews"
  on public.review_likes for insert
  with check (auth.uid() = user_id);

create policy "Users can unlike reviews"
  on public.review_likes for delete
  using (auth.uid() = user_id);

-- review_comments
create policy "Review comments are viewable by everyone"
  on public.review_comments for select
  using (true);

create policy "Users can insert their own comments"
  on public.review_comments for insert
  with check (auth.uid() = user_id);

create policy "Users can update their own comments"
  on public.review_comments for update
  using (auth.uid() = user_id);

create policy "Users can delete their own comments"
  on public.review_comments for delete
  using (auth.uid() = user_id);

-- reading_sessions
create policy "Reading sessions viewable based on profile privacy"
  on public.reading_sessions for select
  using (
    auth.uid() = user_id
    or exists (
      select 1 from public.profiles p
      where p.id = user_id and not p.is_private
    )
  );

create policy "Users can manage their own reading sessions"
  on public.reading_sessions for insert
  with check (auth.uid() = user_id);

create policy "Users can update their own reading sessions"
  on public.reading_sessions for update
  using (auth.uid() = user_id);

create policy "Users can delete their own reading sessions"
  on public.reading_sessions for delete
  using (auth.uid() = user_id);

-- reading_schedules (private — owner only)
create policy "Users can view their own reading schedules"
  on public.reading_schedules for select
  using (auth.uid() = user_id);

create policy "Users can insert their own reading schedules"
  on public.reading_schedules for insert
  with check (auth.uid() = user_id);

create policy "Users can update their own reading schedules"
  on public.reading_schedules for update
  using (auth.uid() = user_id);

create policy "Users can delete their own reading schedules"
  on public.reading_schedules for delete
  using (auth.uid() = user_id);

-- characters (private — owner only)
create policy "Users can view their own characters"
  on public.characters for select
  using (auth.uid() = user_id);

create policy "Users can insert their own characters"
  on public.characters for insert
  with check (auth.uid() = user_id);

create policy "Users can update their own characters"
  on public.characters for update
  using (auth.uid() = user_id);

create policy "Users can delete their own characters"
  on public.characters for delete
  using (auth.uid() = user_id);

-- follows
create policy "Follows are viewable by everyone"
  on public.follows for select
  using (true);

create policy "Users can follow others"
  on public.follows for insert
  with check (auth.uid() = follower_id);

create policy "Users can unfollow"
  on public.follows for delete
  using (auth.uid() = follower_id);
