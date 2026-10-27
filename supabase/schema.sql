-- Lightly cloud backup. Run once in the Supabase SQL editor.
-- One row per person holding their whole app state; Row Level Security means a person can only ever see their own row.
create table if not exists public.lightly_state (
  user_id uuid primary key references auth.users(id) on delete cascade,
  data jsonb not null,
  updated_at timestamptz not null default now()
);
alter table public.lightly_state enable row level security;
create policy "read own" on public.lightly_state for select using (auth.uid() = user_id);
create policy "insert own" on public.lightly_state for insert with check (auth.uid() = user_id);
create policy "update own" on public.lightly_state for update using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "delete own" on public.lightly_state for delete using (auth.uid() = user_id);
