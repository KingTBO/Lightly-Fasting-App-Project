-- Lightly cloud backup. Paste the SQL below into the Supabase SQL editor and run it.
-- Safe to run more than once. One row per person holding their whole app state;
-- Row Level Security means a person can only ever see their own row.
create table if not exists public.lightly_state (
  user_id uuid primary key references auth.users(id) on delete cascade,
  data jsonb not null,
  updated_at timestamptz not null default now()
);
alter table public.lightly_state enable row level security;

drop policy if exists "read own" on public.lightly_state;
drop policy if exists "insert own" on public.lightly_state;
drop policy if exists "update own" on public.lightly_state;
drop policy if exists "delete own" on public.lightly_state;

create policy "read own" on public.lightly_state for select to authenticated
  using ((select auth.uid()) = user_id);
create policy "insert own" on public.lightly_state for insert to authenticated
  with check ((select auth.uid()) = user_id);
create policy "update own" on public.lightly_state for update to authenticated
  using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);
create policy "delete own" on public.lightly_state for delete to authenticated
  using ((select auth.uid()) = user_id);
