-- Phase 3: spaced-repetition + mastery state, one row per (user, concept).
-- A "concept" is a PracticeTopic (e.g. 'inscribed', 'secant-angle'). The client
-- schedules reviews with a Leitner-style box; `mastered` is the gating signal.
--
-- Apply with: supabase db push  (or paste into the Supabase SQL editor).

create table if not exists public.concept_reviews (
  user_id       uuid not null references auth.users (id) on delete cascade,
  topic         text not null,
  box           int  not null default 0,         -- Leitner box 0..5; drives the interval
  due_date      date,                             -- next day this concept should resurface
  last_seen     date,
  seen          int  not null default 0,          -- total attempts
  clean_correct int  not null default 0,          -- first-try-correct count (mastery signal)
  mastered      boolean not null default false,   -- sticky once earned; gates the next lesson
  updated_at    timestamptz not null default now(),
  primary key (user_id, topic)
);

alter table public.concept_reviews enable row level security;

-- A user can only read/write their own review rows.
create policy "concept_reviews are private to the owner"
  on public.concept_reviews
  for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create index if not exists concept_reviews_due_idx
  on public.concept_reviews (user_id, due_date);
