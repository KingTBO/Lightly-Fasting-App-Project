-- Lightly weight comparison: how people's weight changed on days 30, 60 and 90, so a person can see their own line next to the average.
-- Paste into the Supabase SQL editor and run. Safe to run more than once (it only creates what is missing and replaces the functions).
-- Design rules (see docs/legal.md and AGENTS.md):
--   * Opt-in only. Nothing is stored until the person turns "Compare with others" on, and turning it off deletes their rows.
--   * Only the CHANGE leaves the phone, as a percent of their own starting weight on day 30, 60 or 90. Never a weight, height, age or gender.
--   * No client can select, insert, update or delete the table. Every read and write goes through a function below that checks who is asking.
--   * trend_compare() returns an average or a ranking only when at least 30 people have a value for that day; below that it says nothing.
--   * Deleting an account removes its rows (on delete cascade).

create schema if not exists trend_private;
revoke all on schema trend_private from public, anon, authenticated;

-- ---------- table ----------
create table if not exists public.weight_trend (
  user_id uuid not null references auth.users(id) on delete cascade,
  day smallint not null check (day in (30, 60, 90)),
  pct numeric(4,1) not null check (pct between -30 and 30),
  updated_at timestamptz not null default now(),
  primary key (user_id, day)
);
revoke all on public.weight_trend from public, anon, authenticated;
alter table public.weight_trend enable row level security;
-- no policy and no grant = no client access at all.

-- the smallest group that is ever described: below this, no average and no ranking leave the database
create or replace function trend_private.min_cohort() returns int
language sql immutable set search_path = '' as $$ select 30 $$;

-- ---------- functions ----------
-- Saves the person's own points, one per day in (30, 60, 90). p_points = [{"day":30,"pct":-1.4}, ...]. Anything else is ignored; an out-of-range value is an error.
create or replace function public.trend_share(p_points jsonb) returns void
language plpgsql security definer set search_path = '' as $$
declare uid uuid := auth.uid(); p jsonb; d int; v numeric;
begin
  if uid is null then raise exception 'not_signed_in'; end if;
  if jsonb_typeof(p_points) <> 'array' or jsonb_array_length(p_points) > 3 then raise exception 'bad_points'; end if;
  for p in select * from jsonb_array_elements(p_points) loop
    d := (p ->> 'day')::int; v := (p ->> 'pct')::numeric;
    if d not in (30, 60, 90) then raise exception 'bad_day'; end if;
    if v is null or v < -30 or v > 30 then raise exception 'bad_pct'; end if;
    insert into public.weight_trend (user_id, day, pct) values (uid, d, round(v, 1))
      on conflict (user_id, day) do update set pct = excluded.pct, updated_at = now();
  end loop;
end $$;

-- Stops sharing: deletes every row of the person's own.
create or replace function public.trend_leave() returns void
language plpgsql security definer set search_path = '' as $$
declare uid uuid := auth.uid();
begin
  if uid is null then raise exception 'not_signed_in'; end if;
  delete from public.weight_trend where user_id = uid;
end $$;

-- For days 30, 60 and 90: whether enough people have a value ("enough"), their average change, and, if the caller has a value too, the share of people
-- whose weight went down LESS than the caller's ("ahead", 0 to 100). Average and ahead are null until at least 30 people have a value for that day.
-- Callers who have not shared get nothing: you have to be in it to see it.
create or replace function public.trend_compare() returns jsonb
language plpgsql stable security definer set search_path = '' as $$
declare uid uuid := auth.uid(); out jsonb := '[]'::jsonb; d int; n int; a numeric; mine numeric; ah numeric; big boolean;
begin
  if uid is null then raise exception 'not_signed_in'; end if;
  if not exists (select 1 from public.weight_trend t where t.user_id = uid) then return out; end if;
  foreach d in array array[30, 60, 90] loop
    select count(*), avg(t.pct) into n, a from public.weight_trend t where t.day = d;
    big := n >= trend_private.min_cohort();
    select t.pct into mine from public.weight_trend t where t.user_id = uid and t.day = d;
    ah := null;
    if big and mine is not null then
      select round(100.0 * count(*) filter (where t.pct > mine) / nullif(count(*) filter (where t.user_id <> uid), 0)) into ah from public.weight_trend t where t.day = d;
    end if;
    out := out || jsonb_build_array(jsonb_build_object('day', d, 'enough', big, 'avg', case when big then round(a, 1) end, 'you', mine, 'ahead', ah));
  end loop;
  return out;
end $$;

revoke all on function public.trend_share(jsonb), public.trend_leave(), public.trend_compare() from public, anon;
grant execute on function public.trend_share(jsonb), public.trend_leave(), public.trend_compare() to authenticated;
