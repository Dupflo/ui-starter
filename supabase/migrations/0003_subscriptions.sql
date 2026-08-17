-- s06-stripe-billing: subscriptions + stripe_events tables with service-role-only write (ADR 003/005).
-- Applied manually on production — not executed in this environment.

-- 1. Subscriptions table — one row per user (PK = user_id, graveyard: multi-plans).
--    `status` is raw text (not a Postgres enum) — same choice as `role` in 0002_role.sql:6-8.
--    Default 'canceled' is fail-safe: a user is never active by default.
create table if not exists public.subscriptions (
  user_id                uuid primary key references auth.users (id) on delete cascade,
  stripe_customer_id     text,
  stripe_subscription_id text,
  status                 text not null default 'canceled',
  plan                   text,
  created_at             timestamptz not null default now(),
  updated_at             timestamptz not null default now()
);

-- 2. Stripe events table — dedup by Stripe event.id (ADR 005 mechanism A).
--    PK = event.id (globally unique). Handler inserts here first; unique violation (23505)
--    means replay → early-return 200 without re-processing.
create table if not exists public.stripe_events (
  id            text primary key,
  received_at   timestamptz not null default now()
);

-- 3. RLS hardening (mirror s05 0002_role.sql:10-34).
--    subscriptions: SELECT own only. NO insert/update/delete for authenticated role.
--    A user must NEVER be able to forge status='active' — only the service-role writes this table.
alter table public.subscriptions enable row level security;

create policy "subscriptions_select_own"
  on public.subscriptions for select using (auth.uid() = user_id);

-- stripe_events: RLS enabled, no policies at all → completely inaccessible to users.
-- Only the service-role client (which bypasses RLS) writes here.
alter table public.stripe_events enable row level security;
-- No policy: service-role only.
