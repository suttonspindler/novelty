# Novelty - Goodreads Alternative PRD

A modern reading tracker with clean UI (Letterboxd-style), reading guidance features, and superior discovery tools.

**Target:** 5,000 active users in 6-12 months
**Stack:** Next.js 14, TypeScript, PostgreSQL (Supabase), Vercel
**Timeline:** 3-4 months to MVP

---

## Confirmed Technical Decisions

| Decision | Choice |
|---|---|
| Auth | Supabase Auth (built-in, not NextAuth.js) |
| ORM / DB client | Supabase JS client + generated types (no Prisma) |
| Theme | Light/Dark toggle (system default, user-switchable) |
| Supabase project | Create new project as part of Phase 1 |
| Seeding strategy | Real book metadata only — no fake users or fake reviews (see Phase 14) |

---

## Phase 1: Project Setup & Infrastructure

- [ ] Initialize Next.js 14 project with TypeScript and App Router
- [ ] Set up Tailwind CSS and shadcn/ui component library
- [ ] Configure ESLint, Prettier, and code formatting
- [ ] Create new Supabase project (PostgreSQL database + Supabase Auth)
- [ ] Install and configure Supabase JS client (`@supabase/supabase-js`, `@supabase/ssr`)
- [ ] Generate and commit Supabase TypeScript types (`supabase gen types typescript`)
- [ ] Set up Vercel deployment and environment variables (NEXT_PUBLIC_SUPABASE_URL, NEXT_PUBLIC_SUPABASE_ANON_KEY, SUPABASE_SERVICE_ROLE_KEY)
- [ ] Implement light/dark theme toggle using Tailwind `darkMode: 'class'` and a theme provider
- [ ] Create basic project structure (components, lib, app directories)

## Phase 2: Database Schema & Models

- [ ] Design and implement Users table (profile info, settings — extends Supabase auth.users via foreign key)
- [ ] Design and implement Books table (metadata fields for Open Library API)
- [ ] Design and implement Shelves table (default + custom shelves)
- [ ] Design and implement BookShelf junction table (many-to-many)
- [ ] Design and implement Ratings table (user, book, rating, date)
- [ ] Design and implement Reviews table (text, likes, comments, date)
- [ ] Design and implement ReadingSessions table (date_started, date_finished, status)
- [ ] Design and implement ReadingSchedules table (chapters, page ranges, target date, progress)
- [ ] Design and implement Characters table (per-book, per-user, private)
- [ ] Design and implement Follows table (follower, following relationships)
- [ ] Configure Row Level Security (RLS) policies for all tables using Supabase Auth
- [ ] Create database migrations and seed data script
- [ ] Regenerate Supabase TypeScript types after schema finalized
- [ ] Test all database relationships and constraints

## Phase 3: Open Library API Integration

- [ ] Research Open Library API endpoints and rate limits
- [ ] Create API client for Open Library (search, book details)
- [ ] Implement book metadata fetching (title, author, publication, cover, ISBN, pages, description)
- [ ] Create book search functionality with API integration
- [ ] Implement caching strategy for book metadata
- [ ] Handle API rate limiting and error cases
- [ ] Create fallback for missing book data
- [ ] Test API integration with various book searches

## Phase 4: Authentication & User Management

- [ ] Implement user registration flow using Supabase Auth (email/password)
- [ ] Implement user login flow using Supabase Auth
- [ ] Implement logout and session refresh
- [ ] Set up Supabase Auth middleware for protected routes (using `@supabase/ssr`)
- [ ] Create user profile page with basic info
- [ ] Add password reset functionality (Supabase Auth magic link / email)
- [ ] Add user settings page (profile editing, privacy)
- [ ] Create GDPR-compliant data export feature

## Phase 5: Core Reading Features (Shelves, Ratings, Reviews)

- [ ] Create default shelves on user registration (Want to Read, Currently Reading, Read, DNF)
- [ ] Implement "Add to Shelf" functionality from book page
- [ ] Allow users to create custom shelves
- [ ] Support adding books to multiple shelves
- [ ] Implement shelf management UI (view, edit, delete shelves)
- [ ] Create rating system (5-star with 0.5 increments)
- [ ] Build review writing interface (text editor, character count)
- [ ] Implement review editing and deletion
- [ ] Track date_started and date_finished for books
- [ ] Display user's reading statistics on profile (books read, pages read, avg rating)

## Phase 6: Book Pages & Display

- [ ] Create book detail page layout
- [ ] Display book metadata (cover, title, author, publication date, description)
- [ ] Show average rating and rating distribution chart
- [ ] Display all reviews for a book (paginated)
- [ ] Add sorting/filtering for reviews (newest, highest rated, etc.)
- [ ] Implement "Similar Books" recommendation section
- [ ] Create book search and browse functionality
- [ ] Add book page SEO optimization (meta tags, structured data)

## Phase 7: Reading Schedule Optimizer (Unique Feature)

- [ ] Create UI for inputting chapter page ranges (Chapter 1: pages 1-25, etc.)
- [ ] Implement form for target completion (days from now OR specific date)
- [ ] Build optimization algorithm to minimize page count standard deviation per day
- [ ] Generate and display optimal daily reading schedule
- [ ] Allow users to mark individual chapters as complete
- [ ] Calculate and display reading progress percentage (based on pages)
- [ ] Implement schedule adjustment if user falls behind (two options: readjust remaining chapters, or enter new target date)
- [ ] Persist reading schedules and allow viewing/editing anytime
- [ ] Create reading schedule dashboard/calendar view
- [ ] Add unit tests for scheduling algorithm

## Phase 8: Character Tracking (Per-Book Feature)

- [ ] Create character list UI for each book (per-user, private)
- [ ] Implement "Add Character" form (name required, description optional)
- [ ] Allow editing and deleting character entries
- [ ] Display character list on book page (only visible to owner)
- [ ] Ensure privacy: characters only visible to user who created them (enforced via RLS)
- [ ] Add search/filter within character list for long lists

## Phase 9: Goodreads Import

- [ ] Research Goodreads CSV export format and fields
- [ ] Create CSV file upload interface
- [ ] Parse Goodreads CSV (shelves, ratings, reviews, dates)
- [ ] Match imported books against Open Library API
- [ ] Build search interface for manual book matching (when auto-match fails)
- [ ] Implement "Request Book Addition" flow (admin approval queue)
- [ ] Display import summary (successful, failed matches, pending requests)
- [ ] Import user ratings and reviews for matched books
- [ ] Import shelf assignments and reading dates
- [ ] Handle duplicate books and edge cases
- [ ] Test with real Goodreads export files

## Phase 10: Social Features (Follow, Like, Comment, Activity)

- [ ] Implement user follow/unfollow functionality
- [ ] Create activity feed showing followed users' recent activity
- [ ] Display activity types: books added, reviews posted, ratings given
- [ ] Implement review likes (heart/like button)
- [ ] Build commenting system for reviews
- [ ] Create notifications for likes and comments (basic version)
- [ ] Implement "Recommend Book" feature (send recommendation to specific user)
- [ ] Build user profile pages with public info (shelves, reviews, stats, followers/following)
- [ ] Add privacy controls for profile visibility
- [ ] Create "Discover Users" page to find people to follow

## Phase 11: Top 500 Lists (Letterboxd-Style)

- [ ] Build dev-only seed script before starting this phase (see Dev Seed Data section below)
- [ ] Research and implement Bayesian average rating algorithm
- [ ] Apply rating quality weighting (reduce weight for only 1-star or 5-star raters)
- [ ] Create database views/queries for Top 500 calculation
- [ ] Build Top 500 All-Time list page
- [ ] Build Top 500 Fiction list page
- [ ] Build Top 500 Non-Fiction list page
- [ ] Implement periodic update schedule (daily or weekly cron job)
- [ ] Create UI for Top 500 lists with book cards
- [ ] Add pagination for Top 500 lists
- [ ] Test rating calculation with various data scenarios

## Phase 12: Advanced Filtering & Discovery

- [ ] Implement filter by decade of publication (1900s, 1910s, ..., 2020s)
- [ ] Implement filter by country of origin
- [ ] Implement filter by original language
- [ ] Support combining multiple filters simultaneously
- [ ] Apply filters to Top 250 lists
- [ ] Apply filters to search results
- [ ] Apply filters to browse views
- [ ] Create filter UI component (checkboxes, dropdowns, tags)
- [ ] Optimize database queries for filtered results
- [ ] Add filter state to URL parameters for shareable links

## Phase 13: Admin Panel

- [ ] Create admin role system using Supabase Auth custom claims or a roles table
- [ ] Build admin dashboard overview
- [ ] Implement book addition request review queue
- [ ] Create manual book entry form for admins
- [ ] Build content moderation queue (flagged reviews)
- [ ] Add user management tools (view users, ban/suspend)
- [ ] Create admin logs for actions taken

## Dev Seed Data (build at start of Phase 11)

**Purpose:** Test Top 250 algorithm and social features without fake production data.
**Never runs in production** — gated behind a `SEED_SECRET` env var that only exists in dev/staging.

- [ ] Create `scripts/seed-dev.ts` — a one-time script callable via a secret API endpoint
- [ ] Seed ~200 real books from Open Library (classics, bestsellers, award winners)
- [ ] Create 15-20 clearly-labeled test accounts (e.g. `seed_user_1@novelty.dev`) using Supabase service role
- [ ] Generate realistic randomized ratings (not all 5-star — normal distribution around 3.5) for seeded books
- [ ] Generate short placeholder reviews for a subset of books
- [ ] Create a `DELETE /api/dev/seed` endpoint to wipe seed data cleanly
- [ ] Add `SEED_SECRET` to `.env.local.example` with a note that it must never be set in production Vercel env vars
- [ ] Verify Top 250 list populates correctly with seed data before removing it

---

## Phase 14: Content Bootstrapping (No Fake Users)

**Strategy: seed real content, not fake social activity.**

- [ ] Import real book metadata in bulk from Open Library for top ~1,000 popular books (classics, bestsellers, award winners)
- [ ] Ensure book covers, descriptions, and page counts are populated at launch
- [ ] Manually curate initial Top 250 list with high-quality, well-known books
- [ ] Create a "Staff Picks" or "Featured" shelf concept (clearly labeled as editorial, not user-generated)
- [ ] If staff/editorial reviews are added, clearly label them (e.g., "Novelty Editorial")
- [ ] Ensure the app is valuable as a solo personal reading tracker even with zero other users
- [ ] Test single-user experience end-to-end (add books, track reading, use schedule optimizer)

## Phase 15: Review System & Moderation

- [ ] Implement flag/report system for reviews
- [ ] Create moderation queue for flagged content
- [ ] Add review guidelines and community standards page
- [ ] Implement basic spam detection (keyword filtering)
- [ ] Add rate limiting for review posting
- [ ] Create appeal process for removed content
- [ ] Test moderation workflow end-to-end

## Phase 16: UI/UX Polish & Responsive Design

- [ ] Audit entire app for consistent styling with Tailwind
- [ ] Ensure light and dark themes are fully implemented across all pages
- [ ] Implement loading states and skeleton screens
- [ ] Add toast notifications for user feedback
- [ ] Create error pages (404, 500, etc.)
- [ ] Ensure responsive design for mobile web browsers
- [ ] Test on various screen sizes and devices
- [ ] Improve accessibility (ARIA labels, keyboard navigation)
- [ ] Add smooth transitions and animations (tasteful, minimal)
- [ ] Optimize images (lazy loading, responsive images)
- [ ] Create favicon and app icons

## Phase 17: Performance & Optimization

- [ ] Audit and optimize database queries (indexes, N+1 queries)
- [ ] Implement caching strategy (Redis or similar if needed)
- [ ] Optimize image loading and CDN usage
- [ ] Reduce JavaScript bundle size (code splitting, tree shaking)
- [ ] Implement server-side rendering for SEO-critical pages
- [ ] Add performance monitoring (Vercel Analytics or similar)
- [ ] Test page load times and optimize to <2s
- [ ] Implement rate limiting for API routes
- [ ] Add database connection pooling
- [ ] Test app under load (simulate multiple concurrent users)

## Phase 18: Testing & Quality Assurance

- [ ] Write unit tests for core utility functions (scheduling algorithm, rating calculations)
- [ ] Write integration tests for API endpoints
- [ ] Test user authentication flows end-to-end (Supabase Auth)
- [ ] Test Goodreads import with various CSV formats
- [ ] Test book search and Open Library API integration
- [ ] Test reading schedule creation and adjustment
- [ ] Test social features (follow, like, comment)
- [ ] Test Top 250 calculation and filtering
- [ ] Perform security audit (SQL injection, XSS, CSRF)
- [ ] Verify RLS policies block unauthorized data access
- [ ] Test GDPR data export functionality
- [ ] Browser testing (Chrome, Firefox, Safari, Edge)
- [ ] Mobile web testing on real devices

## Phase 19: Deployment & Production Readiness

- [ ] Configure production environment variables
- [ ] Set up production database backups (daily)
- [ ] Configure Vercel deployment settings
- [ ] Set up custom domain and SSL
- [ ] Configure CORS and security headers
- [ ] Set up error logging and monitoring (Sentry or similar)
- [ ] Create database migration strategy for production
- [ ] Write deployment runbook and rollback procedures
- [ ] Set up uptime monitoring
- [ ] Perform final smoke tests in production
- [ ] Create status page for downtime communication

## Phase 20: Launch Preparation

- [ ] Write user documentation and FAQ
- [ ] Create onboarding flow for new users
- [ ] Set up analytics (Google Analytics or Plausible)
- [ ] Create landing page explaining the app
- [ ] Write launch announcement and social media posts
- [ ] Prepare launch plan (Reddit, Twitter, book communities)
- [ ] Set up feedback collection mechanism (form, email)
- [ ] Create privacy policy and terms of service
- [ ] Soft launch to friends and early testers
- [ ] Gather and address launch feedback
- [ ] Public launch and marketing push

---

## Phase 2 Features (Post-MVP, Months 5-8)

- [ ] Design and implement Book Clubs feature (Reddit-style)
- [ ] Add moderator roles and permissions for book clubs
- [ ] Create discussion threads within book clubs
- [ ] Implement shared reading schedules for club books
- [ ] Add member management (join/leave, mod approval)
- [ ] Improve recommendation algorithm beyond "similar books"
- [ ] Optimize mobile web experience (touch targets, gestures)
- [ ] Add direct messaging between users
- [ ] Implement push notifications for activity
- [ ] Create advanced statistics and reading insights dashboard
- [ ] Add book series tracking and grouping
- [ ] Implement author pages and author following

## Open Questions to Resolve

1. Should reading schedules be shareable/public for social accountability?
2. How to handle book editions? (different page counts, covers, ISBNs)
3. Long-term monetization? (premium features, affiliate links, donations?)
4. Content moderation: when to add automated tools vs. manual review?
5. Should character tracking have optional public/wiki mode in future?
6. How to handle series/multi-book works? Special shelf or tags?
7. Admin panel: what tools are most critical for launch vs. later?

---

## Success Metrics (Track Post-Launch)

- **Active users:** 5,000 within 6-12 months
- **Import conversion:** 60%+ of Goodreads importers stay active
- **Reading schedule usage:** 40%+ of users create at least one schedule
- **Engagement:** Average 8+ books tracked per active user
- **Review activity:** 30%+ of users write at least one review
- **Retention:** 50%+ of new users return within 7 days
