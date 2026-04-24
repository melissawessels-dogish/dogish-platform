# Dogish — Planned Upgrades & Technical Debt

This file tracks deferred technical decisions and the conditions under which they should be revisited.

---

## When upgrading Supabase to Pro ($25/month)

**Trigger:** Approaching 50k MAU on free tier, or ready for production launch.

### Popular posts scoring — migrate from JS to DB
- **Current:** Fetch 50 posts, score and sort in JavaScript (explore page)
- **Target:** Add `score numeric default 0` column to `post` table. Create a Supabase Edge Function cron job (runs hourly) that recalculates scores using:
  `score = (like_count * 1.0 + comment_count * 1.5) / (hours_since_posted ^ 1.5)`
- **Why deferred:** Cron jobs require Supabase Pro
- **Files affected:** `app/(main)/explore/page.tsx`, `supabase/migrations/`

---

## When user base grows (100+ active users)

### Explore page personalization
- **Current:** Suggested people and dogs ordered by follower_count desc
- **Target:** Factor ication proximity, breed affinity, network proximity (friends of friends)
- **Why deferred:** No meaningful signal with small user base
- **Files affected:** `app/(main)/explore/page.tsx`

### Popular posts personalization
- **Current:** Global score (likes + comments weighted by recency)
- **Target:** Per-user score boosting posts from followed breeds, nearby locations, and similar dogs. Powered by Anthropic API + dog_preference table.
- **Why deferred:** Requires sufficient community data to generate meaningful signal
- **Files affected:** `app/(main)/explore/page.tsx`, AI layer (not yet built)

---

## Performance — Image optimization

### Add sizes prop to all Next.js Image components
- **Current:** All Image components with fill prop are missing the sizes prop, causing browser warnings and suboptimal image loading
- **Fix:** Add sizes prop to every Image with fill. For feed/explore images use sizes="(max-width: 640px) 100vw, 640px". For avatars use sizes="48px" or appropriate fixed size.
- **Also:** Add loading="eager" to LCP images (first image on profile pages, first post in feed)
- **Why deferred:** Not blocking functionality, purely performance
- **Files affected:** Multiple components throughout the app

---

## When building the AI layer (Phase 4)

### Dog preference modeling
- **Current:** dog_preference table exists but is unpopulated
- **Target:** Anthropic API computes preferences
