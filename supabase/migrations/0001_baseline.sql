-- Baseline schema for the neutral starter (ADR 003).
-- Minimal `profiles` table linked to auth.users, with RLS.
-- `role` (s05) and `subscriptions` (s06) are added by their own stories.

create table if not exists public.profiles (
  id           uuid primary key references auth.users (id) on delete cascade,
  created_at   timestamptz not null default now(),
  display_name text,
  avatar_url   text
);

alter table public.profiles enable row level security;

-- A user can read their own profile.
create policy "profiles_select_own"
  on public.profiles
  for select
  using (auth.uid() = id);

-- A user can insert their own profile row.
create policy "profiles_insert_own"
  on public.profiles
  for insert
  with check (auth.uid() = id);

-- A user can update their own profile.
create policy "profiles_update_own"
  on public.profiles
  for update
  using (auth.uid() = id)
  with check (auth.uid() = id);
