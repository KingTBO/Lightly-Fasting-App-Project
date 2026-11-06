-- Database tests for supabase/trend.sql. Everything runs in one transaction that is rolled back, so nothing is kept.
-- Locally:   scripts/test-trend-db.sh        On a Supabase branch: paste this file into the SQL editor (it also rolls back).
-- A failed check raises an error and stops the run.
\set ON_ERROR_STOP on
\o /dev/null
begin;

-- 40 people: p01 is "me" (a0...), p02..p40 are others (b..., numbered).
insert into auth.users (id, email)
  select ('00000000-0000-0000-0000-' || lpad(g::text, 12, '0'))::uuid, 'p' || g || '@test.invalid' from generate_series(1, 40) g;

\set as_me 'reset role; select set_config(''request.jwt.claims'', ''{"sub":"00000000-0000-0000-0000-000000000001"}'', true); set local role authenticated;'
\set as_p2 'reset role; select set_config(''request.jwt.claims'', ''{"sub":"00000000-0000-0000-0000-000000000002"}'', true); set local role authenticated;'
\set as_anon 'reset role; select set_config(''request.jwt.claims'', '''', true); set local role anon;'
\set as_admin 'reset role;'

-- ===== nobody reaches the table or the functions without the right to =====
:as_anon
do $$ declare ok boolean; begin
  ok := false; begin perform public.trend_share('[{"day":30,"pct":-1}]'); exception when others then ok := true; end; assert ok, 'anon cannot share';
  ok := false; begin perform public.trend_compare(); exception when others then ok := true; end; assert ok, 'anon cannot compare';
  ok := false; begin perform public.trend_leave(); exception when others then ok := true; end; assert ok, 'anon cannot leave';
  ok := false; begin perform count(*) from public.weight_trend; exception when others then ok := true; end; assert ok, 'anon cannot read the table';
end $$;

:as_me
do $$ declare ok boolean; begin
  ok := false; begin perform count(*) from public.weight_trend; exception when others then ok := true; end; assert ok, 'a signed-in person cannot read the table either';
  ok := false; begin insert into public.weight_trend (user_id, day, pct) values ('00000000-0000-0000-0000-000000000001', 30, -1); exception when others then ok := true; end; assert ok, 'and cannot insert into it';
  -- not shared yet: you have to be in it to see it
  assert public.trend_compare() = '[]'::jsonb, 'nothing to compare before sharing';
  -- validation
  ok := false; begin perform public.trend_share('[{"day":45,"pct":-1}]'); exception when others then ok := sqlerrm = 'bad_day'; end; assert ok, 'only days 30, 60 and 90';
  ok := false; begin perform public.trend_share('[{"day":30,"pct":-31}]'); exception when others then ok := sqlerrm = 'bad_pct'; end; assert ok, 'a loss of more than 30 percent is refused';
  ok := false; begin perform public.trend_share('[{"day":30,"pct":31}]'); exception when others then ok := sqlerrm = 'bad_pct'; end; assert ok, 'a gain of more than 30 percent is refused';
  ok := false; begin perform public.trend_share('{"day":30}'); exception when others then ok := sqlerrm = 'bad_points'; end; assert ok, 'an array is needed';
  ok := false; begin perform public.trend_share('[{"day":30,"pct":-1},{"day":60,"pct":-1},{"day":90,"pct":-1},{"day":30,"pct":-1}]'); exception when others then ok := sqlerrm = 'bad_points'; end; assert ok, 'at most three points';
  -- sharing, twice: the second call replaces
  perform public.trend_share('[{"day":30,"pct":-1.44},{"day":60,"pct":-2.5}]');
  perform public.trend_share('[{"day":30,"pct":-1.4}]');
  assert (select count(*) from public.trend_compare() x) = 1, 'compare returns one JSON array';
end $$;
:as_admin
do $$ begin assert (select count(*) from public.weight_trend) = 2, 'two rows: day 30 replaced, day 60 kept'; assert (select pct from public.weight_trend where day = 30) = -1.4, 'rounded to one decimal'; end $$;

-- ===== below the smallest group: no average, no ranking =====
insert into public.weight_trend (user_id, day, pct)
  select ('00000000-0000-0000-0000-' || lpad(g::text, 12, '0'))::uuid, 30, -g * 0.1 from generate_series(2, 20) g;   -- 19 others + me = 20 on day 30
:as_me
do $$ declare r jsonb; d30 jsonb; begin
  r := public.trend_compare();
  assert jsonb_array_length(r) = 3, 'three days come back';
  d30 := r -> 0;
  assert (d30 ->> 'day') = '30' and (d30 ->> 'enough') = 'false', 'not enough people yet';
  assert d30 -> 'avg' = 'null'::jsonb and d30 -> 'ahead' = 'null'::jsonb, 'no average and no ranking below 30 people';
  assert (d30 ->> 'you')::numeric = -1.4, 'your own value always comes back';
  assert (r -> 1) ->> 'you' = '-2.5', 'day 60 is yours too';
  assert (r -> 2) -> 'you' = 'null'::jsonb, 'no day 90 value';
end $$;

-- ===== with 40 people on day 30 =====
:as_admin
insert into public.weight_trend (user_id, day, pct)
  select ('00000000-0000-0000-0000-' || lpad(g::text, 12, '0'))::uuid, 30, -g * 0.1 from generate_series(21, 40) g
  on conflict do nothing;
:as_me
do $$ declare r jsonb; d30 jsonb; begin
  r := public.trend_compare(); d30 := r -> 0;
  assert (d30 ->> 'enough') = 'true', 'enough people now';
  -- others: p02..p40 = -0.2 .. -4.0; me = -1.4. Others whose weight went down LESS than mine (pct > -1.4): -0.2 .. -1.3 = 12 of 39
  assert (d30 ->> 'ahead')::numeric = round(100.0 * 12 / 39), 'ahead is the share of others who went down less, got ' || (d30 ->> 'ahead');
  assert (d30 ->> 'avg')::numeric = -2.1, 'average of everyone (39 others and me = -83.3 / 40), one decimal, got ' || (d30 ->> 'avg');
  assert (r -> 1) ->> 'enough' = 'false' and (r -> 1) -> 'avg' = 'null'::jsonb, 'day 60 still has too few people';
end $$;

-- ===== someone who never shared sees nothing; leaving deletes everything of mine =====
:as_p2
do $$ begin assert public.trend_compare() <> '[]'::jsonb, 'p2 shared (seeded), so can compare'; end $$;
:as_me
select public.trend_leave();
do $$ begin assert public.trend_compare() = '[]'::jsonb, 'after leaving there is nothing to compare'; end $$;
:as_admin
do $$ begin
  assert (select count(*) from public.weight_trend where user_id = '00000000-0000-0000-0000-000000000001') = 0, 'my rows are gone';
  assert (select count(*) from public.weight_trend) = 39, 'other people keep theirs';
  -- deleting an account removes its rows
  delete from auth.users where id = '00000000-0000-0000-0000-000000000002';
  assert (select count(*) from public.weight_trend where user_id = '00000000-0000-0000-0000-000000000002') = 0, 'account deletion cascades';
end $$;

rollback;
\o
\echo trend database tests: all passed
