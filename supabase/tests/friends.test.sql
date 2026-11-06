-- Database tests for supabase/friends.sql. Everything runs in one transaction that is rolled back, so nothing is kept.
-- Locally:   scripts/test-friends-db.sh        On a Supabase branch: paste this file into the SQL editor (it also rolls back).
-- Each block runs as a signed-in person (role authenticated plus the JWT claim) or as anon, exactly like a request from the app.
-- A failed check raises an error and stops the run.
\set ON_ERROR_STOP on
\o /dev/null
begin;

-- Five people: A owns the group, B, C and D join, E is never in it.
insert into auth.users (id, email) values
  ('a0000000-0000-0000-0000-00000000000a', 'a@test.invalid'), ('b0000000-0000-0000-0000-00000000000b', 'b@test.invalid'),
  ('c0000000-0000-0000-0000-00000000000c', 'c@test.invalid'), ('d0000000-0000-0000-0000-00000000000d', 'd@test.invalid'),
  ('e0000000-0000-0000-0000-00000000000e', 'e@test.invalid');

\set as_a 'reset role; select set_config(''request.jwt.claims'', ''{"sub":"a0000000-0000-0000-0000-00000000000a"}'', true); set local role authenticated;'
\set as_b 'reset role; select set_config(''request.jwt.claims'', ''{"sub":"b0000000-0000-0000-0000-00000000000b"}'', true); set local role authenticated;'
\set as_c 'reset role; select set_config(''request.jwt.claims'', ''{"sub":"c0000000-0000-0000-0000-00000000000c"}'', true); set local role authenticated;'
\set as_d 'reset role; select set_config(''request.jwt.claims'', ''{"sub":"d0000000-0000-0000-0000-00000000000d"}'', true); set local role authenticated;'
\set as_e 'reset role; select set_config(''request.jwt.claims'', ''{"sub":"e0000000-0000-0000-0000-00000000000e"}'', true); set local role authenticated;'
\set as_anon 'reset role; select set_config(''request.jwt.claims'', '''', true); set local role anon;'
\set as_admin 'reset role;'

-- ===== profiles =====
:as_e
do $$ declare ok boolean; m text; begin
  -- no profile yet: cannot start or join a group
  ok := false; begin perform public.create_group('Nope'); exception when others then ok := sqlerrm = 'no_profile'; end; assert ok, 'create_group needs a profile';
  assert (select status from public.join_group('K7QM4XD9')) = 'no_profile', 'join_group needs a profile';
  -- bad names and avatars are refused
  ok := false; begin perform public.upsert_profile('   ', 'crescent'); exception when others then ok := true; end; assert ok, 'blank name';
  ok := false; begin perform public.upsert_profile(repeat('x', 25), 'crescent'); exception when others then ok := true; end; assert ok, 'name over 24';
  ok := false; begin perform public.upsert_profile('Eve', 'eclipse'); exception when others then ok := true; end; assert ok, 'eclipse is not a Friends avatar';
  ok := false; begin perform public.upsert_profile('Eve', 'google'); exception when others then ok := true; end; assert ok, 'only sky avatars';
end $$;
:as_a
select public.upsert_profile('  Ana  ', 'crescent');
:as_b
select public.upsert_profile('Ben', 'sunrise');
:as_c
select public.upsert_profile('Cai', 'tea');
:as_d
select public.upsert_profile('Dee', 'drop');
:as_e
select public.upsert_profile('Eve', 'star');
do $$ begin assert (select display_name from public.profiles where user_id = auth.uid()) = 'Eve'; end $$;
select public.upsert_profile('Eve', 'lantern');
do $$ begin assert (select avatar from public.profiles where user_id = auth.uid()) = 'lantern', 'profile updates'; end $$;

-- ===== groups, the cap of 3, the invite =====
:as_a
do $$ declare g uuid; c text; begin
  select group_id, code into g, c from public.create_group('  Morning crew ');
  assert c ~ '^[2-9A-HJKMNP-Z]{8}$', 'code has 8 characters from the safe alphabet';
end $$;
:as_admin
do $$ begin
  assert (select count(*) from public.groups where name = 'Morning crew') = 1, 'name is trimmed';
  assert (select role from public.group_members m join public.groups g on g.id = m.group_id where g.name = 'Morning crew') = 'owner';
  assert (select count(*) from public.group_invites) = 1;
end $$;
:as_a
do $$ declare ok boolean; begin
  perform public.create_group('Second'); perform public.create_group('Third');
  ok := false; begin perform public.create_group('Fourth'); exception when others then ok := sqlerrm = 'group_cap'; end; assert ok, 'a 4th group is refused';
  assert (select count(*) from public.my_groups(current_date)) = 3, 'my_groups lists the three';
end $$;
:as_admin
-- keep only the first group for the rest
delete from public.groups where name in ('Second', 'Third');
create temp table t_g as select id as gid from public.groups where name = 'Morning crew';
create temp table t_code as select code from public.group_invites where group_id = (select gid from t_g);
grant select on t_g, t_code to anon, authenticated;

-- ===== invite_preview: anon may look, and only at a little =====
:as_anon
do $$ declare c text := (select code from t_code); r record; begin
  select * into r from public.invite_preview(c);
  assert r.group_name = 'Morning crew' and r.inviter_name = 'Ana' and r.member_count = 1 and r.avatars = array['crescent'], 'preview shows name, inviter, count, avatars';
  assert exists (select 1 from public.invite_preview(lower(substr(c,1,4)) || ' - ' || substr(c,5))), 'preview forgives case, spaces and dashes';
  assert not exists (select 1 from public.invite_preview('ZZZZZZZZ')), 'unknown code: nothing';
  assert not exists (select 1 from public.invite_preview('')), 'empty code: nothing';
  assert not exists (select 1 from public.invite_preview(null)), 'null code: nothing';
end $$;

-- ===== anon can reach nothing else =====
do $$ declare ok boolean; begin
  ok := false; begin perform * from public.profiles; exception when insufficient_privilege then ok := true; end; assert ok, 'anon: profiles';
  ok := false; begin perform * from public.group_members; exception when insufficient_privilege then ok := true; end; assert ok, 'anon: group_members';
  ok := false; begin perform * from public.group_invites; exception when insufficient_privilege then ok := true; end; assert ok, 'anon: group_invites';
  ok := false; begin perform * from public.my_status; exception when insufficient_privilege then ok := true; end; assert ok, 'anon: my_status';
  ok := false; begin perform public.group_board((select gid from t_g), current_date, current_date); exception when insufficient_privilege then ok := true; end; assert ok, 'anon: group_board';
  ok := false; begin perform public.join_group('K7QM4XD9'); exception when insufficient_privilege then ok := true; end; assert ok, 'anon: join_group';
  ok := false; begin perform public.publish_me('idle', null, null, '[]'); exception when insufficient_privilege then ok := true; end; assert ok, 'anon: publish_me';
  ok := false; begin perform public.create_group('x'); exception when insufficient_privilege then ok := true; end; assert ok, 'anon: create_group';
end $$;

-- ===== joining =====
:as_b
do $$ declare c text := (select code from t_code); r record; begin
  select * into r from public.join_group(' ' || lower(substr(c,1,4)) || '-' || substr(c,5) || ' ');
  assert r.status = 'ok' and r.group_id = (select gid from t_g), 'B joins, with a lower-case code typed with a space and a dash';
  assert (select status from public.join_group(c)) = 'already', 'joining twice just opens the group';
  assert (select count(*) from public.my_groups(current_date)) = 1;
end $$;
:as_c
do $$ declare c text := (select code from t_code); begin assert (select status from public.join_group(c)) = 'ok', 'C joins'; end $$;
:as_d
do $$ declare c text := (select code from t_code); begin assert (select status from public.join_group(c)) = 'ok', 'D joins'; end $$;

-- a full group says so (the preview shows nothing), an expired code is simply invalid
:as_admin
update public.groups set max_members = 4 where id = (select gid from t_g);
:as_anon
do $$ begin assert not exists (select 1 from public.invite_preview((select code from t_code))), 'a full group: the preview shows nothing'; end $$;
:as_e
do $$ declare c text := (select code from t_code); begin assert (select status from public.join_group(c)) = 'full', 'the member limit is enforced in the database'; end $$;
:as_admin
update public.groups set max_members = 10 where id = (select gid from t_g);
update public.group_invites set expires_at = now() - interval '1 minute';
:as_anon
do $$ begin assert not exists (select 1 from public.invite_preview((select code from t_code))), 'expired: nothing'; end $$;
:as_e
do $$ declare c text := (select code from t_code); begin assert (select status from public.join_group(c)) = 'invalid', 'expired code is invalid'; end $$;
:as_admin
update public.group_invites set expires_at = now() + interval '7 days';

-- the rate limit: ten wrong tries in an hour, then it stops answering
:as_admin
delete from public.join_attempts;
:as_e
do $$ declare i int; begin
  for i in 1..10 loop assert (select status from public.join_group('AAAAAAA' || i)) = 'invalid', 'wrong code'; end loop;
  assert (select status from public.join_group((select code from t_code))) = 'too_many', 'blocked after 10 wrong tries, even with the right code';
end $$;
:as_admin
delete from public.join_attempts;

-- ===== a person in 3 groups cannot join a 4th =====
:as_e
do $$ declare i int; begin for i in 1..3 loop perform public.create_group('E group ' || i); end loop; end $$;
do $$ declare c text := (select code from t_code); begin assert (select status from public.join_group(c)) = 'cap', 'the cap of three groups holds when joining'; end $$;
:as_admin
delete from public.groups where name like 'E group %';

-- ===== nobody reads a group they are not in =====
:as_e
do $$ declare g uuid := (select gid from t_g); ok boolean; begin
  ok := false; begin perform * from public.group_board(g, current_date, current_date); exception when others then ok := sqlerrm = 'not_member'; end; assert ok, 'non-member: group_board';
  ok := false; begin perform * from public.group_roster(g); exception when others then ok := sqlerrm = 'not_member'; end; assert ok, 'non-member: group_roster';
  ok := false; begin perform * from public.current_invite(g); exception when others then ok := sqlerrm = 'not_member'; end; assert ok, 'non-member: current_invite';
  ok := false; begin perform public.send_cheer(g, 'a0000000-0000-0000-0000-00000000000a', current_date); exception when others then ok := sqlerrm = 'not_member'; end; assert ok, 'non-member: send_cheer';
  ok := false; begin perform public.report_member(g, 'a0000000-0000-0000-0000-00000000000a', 'x'); exception when others then ok := sqlerrm = 'not_member'; end; assert ok, 'non-member: report_member';
  ok := false; begin perform public.create_invite(g); exception when others then ok := true; end; assert ok, 'non-member: create_invite';
  ok := false; begin perform public.remove_member(g, 'b0000000-0000-0000-0000-00000000000b'); exception when others then ok := true; end; assert ok, 'non-member: remove_member';
  ok := false; begin perform public.rename_group(g, 'Mine now'); exception when others then ok := true; end; assert ok, 'non-member: rename_group';
  assert (select count(*) from public.my_groups(current_date)) = 0, 'E has no groups';
end $$;

-- ===== no client can touch the group tables, or another person's rows =====
:as_b
do $$ declare ok boolean; begin
  ok := false; begin perform * from public.groups; exception when insufficient_privilege then ok := true; end; assert ok, 'groups: no direct select';
  ok := false; begin perform * from public.group_members; exception when insufficient_privilege then ok := true; end; assert ok, 'group_members: no direct select';
  ok := false; begin perform * from public.group_invites; exception when insufficient_privilege then ok := true; end; assert ok, 'group_invites: no direct select';
  ok := false; begin perform * from public.cheers; exception when insufficient_privilege then ok := true; end; assert ok, 'cheers: no direct select';
  ok := false; begin perform * from public.reports; exception when insufficient_privilege then ok := true; end; assert ok, 'reports: no direct select';
  ok := false; begin perform * from public.join_attempts; exception when insufficient_privilege then ok := true; end; assert ok, 'join_attempts: no direct select';
  ok := false; begin insert into public.group_members (group_id, user_id) values ((select gid from t_g), auth.uid()); exception when insufficient_privilege then ok := true; end; assert ok, 'no direct insert into group_members';
  ok := false; begin update public.group_members set role = 'owner'; exception when insufficient_privilege then ok := true; end; assert ok, 'no direct update of group_members';
  ok := false; begin insert into public.my_status (user_id, state) values (auth.uid(), 'idle'); exception when insufficient_privilege then ok := true; end; assert ok, 'my_status: writes go through publish_me';
  ok := false; begin delete from public.groups; exception when insufficient_privilege then ok := true; end; assert ok, 'no direct delete of groups';
  assert (select count(*) from public.profiles) = 1, 'a person reads only their own profile, never a friend''s';
end $$;

-- ===== publishing =====
:as_a
do $$ declare ok boolean; begin
  ok := false; begin perform public.publish_me('flying', null, null, '[]'); exception when others then ok := sqlerrm = 'bad_payload'; end; assert ok, 'unknown state';
  ok := false; begin perform public.publish_me('fasting', null, 16, '[]'); exception when others then ok := sqlerrm = 'bad_payload'; end; assert ok, 'fasting needs a start and a goal';
  ok := false; begin perform public.publish_me('idle', null, null, '{}'); exception when others then ok := sqlerrm = 'bad_payload'; end; assert ok, 'days must be a list';
  ok := false; begin perform public.publish_me('idle', null, null, '[{"day":"not a date","outcome":"fast"}]'); exception when others then ok := sqlerrm = 'bad_payload'; end; assert ok, 'bad date';
  ok := false; begin perform public.publish_me('idle', null, null, '[{"day":"2026-11-06","outcome":"won","progress":1}]'); exception when others then ok := sqlerrm = 'bad_payload'; end; assert ok, 'bad outcome';
  ok := false; begin perform public.publish_me('idle', null, null, '[{"day":"2026-11-06","outcome":"fast","progress":7}]'); exception when others then ok := sqlerrm = 'bad_payload'; end; assert ok, 'progress above 1';
  ok := false; begin perform public.publish_me('idle', null, null, (select jsonb_agg(jsonb_build_object('day', current_date - i, 'outcome', 'none')) from generate_series(0, 8) i)); exception when others then ok := sqlerrm = 'bad_payload'; end; assert ok, 'more than 8 days';
  -- a start time in the future is clamped to about now
  perform public.publish_me('fasting', now() + interval '3 days', 16, '[]');
  assert (select started_at from public.my_status where user_id = auth.uid()) <= now() + interval '5 minutes' + interval '1 second', 'start time is clamped';
end $$;

-- ===== what friends see: group_board =====
-- A: fasting 8 h of 16. B: fasting past the goal (18 h of 16). C: sharing off. D: nothing published at all.
:as_a
select public.publish_me('fasting', now() - interval '8 hours', 16, '[]');
:as_b
select public.publish_me('fasting', now() - interval '18 hours', 16, '[]');
:as_c
select public.publish_me('fasting', now() - interval '5 hours', 18, '[]');
select public.set_sharing((select gid from t_g), false);
:as_a
do $$ declare g uuid := (select gid from t_g); r record; begin
  select * into r from public.group_board(g, current_date, current_date) where is_me;
  assert r.status = 'fasting' and r.goal_hours = 16 and abs(r.progress - 0.5) < 0.01, 'A is half way on a 16 h plan';
  select * into r from public.group_board(g, current_date, current_date) where display_name = 'Ben';
  assert r.status = 'reached' and r.progress = 1, 'B is past the goal: reached, the disc stops at full (no overtime)';
  select * into r from public.group_board(g, current_date, current_date) where display_name = 'Cai';
  assert r.status = 'resting' and r.progress is null and r.goal_hours is null, 'sharing off: resting and nothing else';
  select * into r from public.group_board(g, current_date, current_date) where display_name = 'Dee';
  assert r.status = 'none' and r.progress is null, 'nothing published: not fasting';
  -- you first, then in the order people joined; never by progress
  assert (select array_agg(display_name order by ord) from (select display_name, row_number() over () as ord from public.group_board(g, current_date, current_date)) q) = array['Ana','Ben','Cai','Dee'], 'order: me, then join order';
  -- the roster shows my own sharing switch and nobody else's
  assert (select sharing from public.group_roster(g) where is_me) is true;
  assert (select count(*) from public.group_roster(g) where not is_me and sharing is not null) = 0, 'other people''s switch is not shown';
  assert (select count(*) from public.group_roster(g)) = 4;
end $$;
-- the board never carries a time or a duration: no timestamp, date or interval column in what it returns
do $$ declare res text := pg_get_function_result('public.group_board(uuid,date,date)'::regprocedure); begin
  assert res !~* 'timestamp|time zone|interval| time', 'group_board returns no time columns: ' || res;
  assert res !~* 'weight|streak|lat|lon|place', 'no weight, streak or place columns';
end $$;
-- the summary counts for the list screen
do $$ declare r record; begin
  select * into r from public.my_groups(current_date);
  assert r.member_count = 4 and r.fasting = 1 and r.reached = 1 and r.resting = 1, 'my_groups counts: ' || r::text;
end $$;

-- days outside the week, or in the future, are refused
do $$ declare g uuid := (select gid from t_g); ok boolean; begin
  ok := false; begin perform * from public.group_board(g, current_date, current_date + 1); exception when others then ok := sqlerrm = 'bad_day'; end; assert ok, 'future day';
  ok := false; begin perform * from public.group_board(g, current_date, current_date - 7); exception when others then ok := sqlerrm = 'bad_day'; end; assert ok, 'eight days back';
  ok := false; begin perform * from public.group_board(g, current_date + 30, current_date); exception when others then ok := sqlerrm = 'bad_day'; end; assert ok, 'a made-up today';
  assert (select count(*) from public.group_board(g, current_date, current_date - 6)) = 4, 'six days back is fine';
end $$;

-- a stale "fasting" (the phone has not reported for goal + 6 hours) is not shown as fasting
:as_admin
update public.my_status set updated_at = now() - interval '23 hours' where user_id = 'a0000000-0000-0000-0000-00000000000a';
:as_b
do $$ begin assert (select status from public.group_board((select gid from t_g), current_date, current_date) where display_name = 'Ana') = 'none', 'stale fasting is not shown'; end $$;
:as_admin
update public.my_status set updated_at = now() where user_id = 'a0000000-0000-0000-0000-00000000000a';

-- past days come from the stored day
:as_d
select public.publish_me('idle', null, null, jsonb_build_array(
  jsonb_build_object('day', current_date - 1, 'outcome', 'fast', 'progress', 1, 'goal_hours', 16),
  jsonb_build_object('day', current_date - 2, 'outcome', 'fast', 'progress', 0.62, 'goal_hours', 18),
  jsonb_build_object('day', current_date - 3, 'outcome', 'rest', 'progress', 0),
  jsonb_build_object('day', current_date - 4, 'outcome', 'none', 'progress', 0)));
:as_a
do $$ declare g uuid := (select gid from t_g); r record; begin
  select * into r from public.group_board(g, current_date, current_date - 1) where display_name = 'Dee';
  assert r.status = 'reached' and r.progress = 1 and r.goal_hours = 16, 'yesterday: reached goal';
  select * into r from public.group_board(g, current_date, current_date - 2) where display_name = 'Dee';
  assert r.status = 'fasted' and abs(r.progress - 0.62) < 0.001 and r.goal_hours = 18, 'two days ago: fasted, 62% of an 18 h plan';
  select * into r from public.group_board(g, current_date, current_date - 3) where display_name = 'Dee';
  assert r.status = 'resting' and r.progress is null, 'a rest day looks like resting, with no reason';
  select * into r from public.group_board(g, current_date, current_date - 4) where display_name = 'Dee';
  assert r.status = 'none';
  -- a running fast never shows as "fasting" on a past day
  assert (select status from public.group_board(g, current_date, current_date - 1) where display_name = 'Ana') = 'none';
end $$;
-- Time off or a cheat day from the phone is shared as resting, today
:as_d
select public.publish_me('resting', null, null, '[]');
:as_a
do $$ begin assert (select status from public.group_board((select gid from t_g), current_date, current_date) where display_name = 'Dee') = 'resting'; end $$;
-- a fast that ended earlier today: fasted (or reached) once the phone says idle
:as_d
select public.publish_me('idle', null, null, jsonb_build_array(jsonb_build_object('day', current_date, 'outcome', 'fast', 'progress', 0.5, 'goal_hours', 16)));
:as_a
do $$ begin assert (select status from public.group_board((select gid from t_g), current_date, current_date) where display_name = 'Dee') = 'fasted', 'ended early today: fasted'; end $$;

-- a sacred fast shows its progress but never its length
:as_d
select public.publish_me('fasting', now() - interval '6 hours', 13, jsonb_build_array(jsonb_build_object('day', current_date - 1, 'outcome', 'fast', 'progress', 1, 'goal_hours', 14, 'sacred', true)), true);
:as_a
do $$ declare g uuid := (select gid from t_g); r record; begin
  select * into r from public.group_board(g, current_date, current_date) where display_name = 'Dee';
  assert r.status = 'fasting' and r.progress > 0.4 and r.goal_hours is null, 'a sacred fast: progress yes, hours no';
  select * into r from public.group_board(g, current_date, current_date - 1) where display_name = 'Dee';
  assert r.status = 'reached' and r.goal_hours is null, 'a sacred day: no hours either';
end $$;
:as_d
select public.publish_me('idle', null, null, jsonb_build_array(jsonb_build_object('day', current_date, 'outcome', 'fast', 'progress', 0.5, 'goal_hours', 16)));

-- ===== Cheer =====
:as_a
do $$ declare g uuid := (select gid from t_g); ok boolean; begin
  ok := false; begin perform public.send_cheer(g, auth.uid(), current_date); exception when others then ok := sqlerrm = 'bad_target'; end; assert ok, 'cannot cheer yourself';
  ok := false; begin perform public.send_cheer(g, 'e0000000-0000-0000-0000-00000000000e', current_date); exception when others then ok := sqlerrm = 'bad_target'; end; assert ok, 'cannot cheer a non-member';
  ok := false; begin perform public.send_cheer(g, 'd0000000-0000-0000-0000-00000000000d', current_date); exception when others then ok := sqlerrm = 'not_cheerable'; end; assert ok, 'cannot cheer someone who is not fasting (D fasted earlier)';
  ok := false; begin perform public.send_cheer(g, 'c0000000-0000-0000-0000-00000000000c', current_date); exception when others then ok := sqlerrm = 'not_cheerable'; end; assert ok, 'cannot cheer someone who turned sharing off';
  ok := false; begin perform public.send_cheer(g, 'b0000000-0000-0000-0000-00000000000b', current_date - 3); exception when others then ok := sqlerrm = 'bad_day'; end; assert ok, 'only today';
  perform public.send_cheer(g, 'b0000000-0000-0000-0000-00000000000b', current_date);
  perform public.send_cheer(g, 'b0000000-0000-0000-0000-00000000000b', current_date);
  assert (select cheered_by_me from public.group_board(g, current_date, current_date) where display_name = 'Ben'), 'my cheer shows';
end $$;
:as_b
do $$ declare g uuid := (select gid from t_g); begin
  assert (select cheers_received from public.group_board(g, current_date, current_date) where is_me) = 1, 'B sees one small sun (a count, not who)';
  assert (select cheers_received from public.group_board(g, current_date, current_date) where display_name = 'Ana') = 0, 'B cannot see how many cheers A got';
end $$;
:as_a
do $$ declare g uuid := (select gid from t_g); begin
  perform public.withdraw_cheer(g, 'b0000000-0000-0000-0000-00000000000b', current_date);
  assert not (select cheered_by_me from public.group_board(g, current_date, current_date) where display_name = 'Ben'), 'a second tap withdraws';
  perform public.send_cheer(g, 'b0000000-0000-0000-0000-00000000000b', current_date);
end $$;

-- ===== invite reset, rename, report, remove =====
:as_b
do $$ declare g uuid := (select gid from t_g); ok boolean; r record; begin
  select * into r from public.current_invite(g);
  assert r.code = (select code from t_code) and r.member_count = 4 and r.max_members = 10, 'a member can read the current invite';
  ok := false; begin perform public.create_invite(g); exception when others then ok := sqlerrm = 'not_owner'; end; assert ok, 'only the owner resets the link';
  ok := false; begin perform public.rename_group(g, 'Hijacked'); exception when others then ok := sqlerrm = 'not_owner'; end; assert ok, 'only the owner renames';
  ok := false; begin perform public.remove_member(g, 'c0000000-0000-0000-0000-00000000000c'); exception when others then ok := sqlerrm = 'not_owner'; end; assert ok, 'only the owner removes';
  perform public.report_member(g, 'c0000000-0000-0000-0000-00000000000c', 'a rude name');
  ok := false; begin perform public.report_member(g, auth.uid(), 'me'); exception when others then ok := sqlerrm = 'bad_target'; end; assert ok, 'cannot report yourself';
end $$;
:as_a
do $$ declare g uuid := (select gid from t_g); old text := (select code from t_code); newc text; ok boolean; begin
  select code into newc from public.create_invite(g);
  assert newc <> old and newc ~ '^[2-9A-HJKMNP-Z]{8}$', 'a new code';
  assert (select code from public.current_invite(g)) = newc;
  perform public.rename_group(g, 'Early birds');
  ok := false; begin perform public.remove_member(g, auth.uid()); exception when others then ok := sqlerrm = 'use_leave'; end; assert ok, 'the owner uses leave, not remove';
end $$;
:as_anon
do $$ begin assert not exists (select 1 from public.invite_preview((select code from t_code))), 'the old code stops working at once'; end $$;
:as_e
do $$ begin assert (select status from public.join_group((select code from t_code))) = 'invalid', 'the old code cannot join'; end $$;
:as_admin
-- B's report reached the table that only the dashboard reads
do $$ begin assert (select count(*) from public.reports where reason = 'a rude name') = 1; end $$;

-- ===== removing and leaving =====
:as_a
select public.remove_member((select gid from t_g), 'c0000000-0000-0000-0000-00000000000c');
:as_c
do $$ declare g uuid := (select gid from t_g); ok boolean; begin
  ok := false; begin perform * from public.group_board(g, current_date, current_date); exception when others then ok := sqlerrm = 'not_member'; end; assert ok, 'a removed person reads nothing';
  assert (select count(*) from public.my_groups(current_date)) = 0;
  -- their profile and status remain theirs
  assert (select count(*) from public.profiles) = 1;
end $$;
:as_admin
do $$ begin assert (select count(*) from public.cheers where from_user = 'c0000000-0000-0000-0000-00000000000c' or to_user = 'c0000000-0000-0000-0000-00000000000c') = 0, 'cheers go with the member'; end $$;
:as_a
select public.leave_group((select gid from t_g));
:as_admin
do $$ begin
  assert (select role from public.group_members where user_id = 'b0000000-0000-0000-0000-00000000000b') = 'owner', 'the owner left: ownership passes to the longest-standing member';
  assert (select count(*) from public.group_members where role = 'owner') = 1, 'exactly one owner';
  assert (select count(*) from public.cheers) = 0, 'A''s cheer left with A';
end $$;
:as_a
do $$ declare ok boolean; begin
  ok := false; begin perform * from public.group_board((select gid from t_g), current_date, current_date); exception when others then ok := sqlerrm = 'not_member'; end; assert ok, 'someone who left reads nothing';
end $$;
:as_b
select public.leave_group((select gid from t_g));
:as_d
select public.leave_group((select gid from t_g));
:as_admin
do $$ begin assert (select count(*) from public.groups where id = (select gid from t_g)) = 0, 'the last person leaves: the group is deleted'; end $$;
do $$ begin assert (select count(*) from public.group_invites) = 0 and (select count(*) from public.group_members) = 0, 'and its invites with it'; end $$;

-- ===== deleting an account =====
:as_e
select public.create_group('E and D');
:as_admin
create temp table t_g2 as select id as gid from public.groups where name = 'E and D';
create temp table t_code2 as select code from public.group_invites;
grant select on t_g2, t_code2 to authenticated;
:as_d
do $$ begin assert (select status from public.join_group((select code from t_code2))) = 'ok'; end $$;
:as_admin
delete from auth.users where id = 'e0000000-0000-0000-0000-00000000000e';
do $$ begin
  assert (select role from public.group_members where group_id = (select gid from t_g2) and user_id = 'd0000000-0000-0000-0000-00000000000d') = 'owner', 'the owner''s account is deleted: the group carries on with D';
  assert not exists (select 1 from public.profiles where user_id = 'e0000000-0000-0000-0000-00000000000e'), 'their profile is gone';
end $$;
delete from auth.users where id = 'd0000000-0000-0000-0000-00000000000d';
do $$ begin assert not exists (select 1 from public.groups), 'the last account deleted: the group is gone'; end $$;

rollback;
\o
\echo database tests passed
