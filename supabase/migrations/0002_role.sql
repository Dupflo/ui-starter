-- s05-role-admin: add `role` column to profiles + harden self-promotion (ADR 003/004).
-- Applied manually on production — not executed in this environment.

-- 1. Add the `role` column: text + CHECK (two values only, no Postgres enum — simpler
--    to type manually in database.types.ts; see plan §task 1 for the reasoning).
alter table public.profiles
  add column role text not null default 'user'
  check (role in ('user', 'admin'));

-- 2. Harden against self-promotion.
--    The original `profiles_update_own` policy (0001_baseline.sql:27-31) allows a user
--    to write ANY column on their own row — including `role`. Combined with the anon
--    upsert in lib/actions/settings.ts, a user could promote themselves to admin.
--
--    Fix: replace the policy with a variant whose WITH CHECK freezes `role`:
--      - USING clause: still allows any update to the user's own row (auth.uid() = id).
--      - WITH CHECK clause: additionally requires that the proposed `role` value equals
--        the current value already stored in the database.  The sub-query
--        `(select p.role from public.profiles p where p.id = profiles.id)` reads the
--        *existing* row; Postgres evaluates WITH CHECK on the *proposed* row, so
--        comparing the proposed `role` against the stored value effectively freezes it.
--      - display_name and avatar_url remain freely writable.
--      - The service-role client (webhooks, out-of-band promotion) bypasses RLS entirely,
--        so admin promotion via SQL/dashboard remains possible.
drop policy "profiles_update_own" on public.profiles;

create policy "profiles_update_own"
  on public.profiles
  for update
  using (auth.uid() = id)
  with check (
    auth.uid() = id
    and role = (select p.role from public.profiles p where p.id = profiles.id)
  );
