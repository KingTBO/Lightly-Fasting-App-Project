-- Lightly Friends: groups, status sharing and the one function friends use to see each other.
-- Paste into the Supabase SQL editor and run. Safe to run more than once (it only creates what is missing and replaces the functions).
-- Design rules (see docs/friends/ in the repo, and AGENTS.md):
--   * Friends never read another person's rows. No client can select, insert, update or delete the group tables at all;
--     every read and write goes through a function below that checks who is asking.
--   * group_board() is the only way members see each other. It computes progress on the server and never returns a time,
--     hours elapsed, a streak, a weight, a place or the reason someone is resting.
--   * The member cap (10), the group cap (3), the invite expiry and the join rate limit are enforced here, not in the app.
--   * Deleting an account cascades through everything below; a group an owner leaves behind passes to the longest-standing member.

create extension if not exists pgcrypto with schema extensions;
create schema if not exists friends_private;
revoke all on schema friends_private from public, anon, authenticated;

-- ---------- tables ----------
create table if not exists public.profiles (
  user_id uuid primary key references auth.users(id) on delete cascade,
  display_name text not null check (char_length(btrim(display_name)) between 1 and 24),
  avatar text not null default 'crescent'
    check (avatar in ('crescent','full','sunrise','star','stars','lantern','tea','drop')),
  updated_at timestamptz not null default now()
);

create table if not exists public.groups (
  id uuid primary key default gen_random_uuid(),
  name text not null check (char_length(btrim(name)) between 1 and 32),
  kind text not null default 'friends' check (kind in ('friends','family','ramadan')),
  max_members int not null default 10 check (max_members between 2 and 10),
  created_at timestamptz not null default now()
);

create table if not exists public.group_members (
  group_id uuid not null references public.groups(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  role text not null default 'member' check (role in ('owner','member')),
  sharing boolean not null default true,
  joined_at timestamptz not null default now(),
  primary key (group_id, user_id)
);
create index if not exists group_members_user_idx on public.group_members (user_id);
create unique index if not exists group_members_one_owner on public.group_members (group_id) where role = 'owner';

create table if not exists public.group_invites (
  id uuid primary key default gen_random_uuid(),
  group_id uuid not null references public.groups(id) on delete cascade,
  code text not null unique check (code ~ '^[2-9A-HJKMNP-Z]{8}$'),
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  expires_at timestamptz not null default now() + interval '7 days',
  revoked_at timestamptz
);
create index if not exists group_invites_group_idx on public.group_invites (group_id);

-- A person's own live state. Friends never read this table; group_board() turns it into a status.
create table if not exists public.my_status (
  user_id uuid primary key references auth.users(id) on delete cascade,
  state text not null check (state in ('fasting','resting','idle')),
  started_at timestamptz,
  goal_hours numeric check (goal_hours between 1 and 48),
  sacred boolean not null default false,   -- a sacred fast (Ramadan): its length hints at the latitude, so friends never see the hours
  updated_at timestamptz not null default now()
);

-- One row per local calendar day, the day the fast ENDED (like the Days tab).
create table if not exists public.my_days (
  user_id uuid not null references auth.users(id) on delete cascade,
  day date not null,
  outcome text not null check (outcome in ('fast','rest','none')),
  progress real not null default 0 check (progress between 0 and 1),
  goal_hours numeric check (goal_hours between 1 and 48),
  sacred boolean not null default false,
  updated_at timestamptz not null default now(),
  primary key (user_id, day)
);

create table if not exists public.cheers (
  group_id uuid not null references public.groups(id) on delete cascade,
  from_user uuid not null references auth.users(id) on delete cascade,
  to_user uuid not null references auth.users(id) on delete cascade,
  day date not null,
  created_at timestamptz not null default now(),
  primary key (group_id, from_user, to_user, day),
  check (from_user <> to_user)
);

-- Written only through report_member(); read in the Supabase dashboard.
create table if not exists public.reports (
  id uuid primary key default gen_random_uuid(),
  group_id uuid references public.groups(id) on delete set null,
  reported_user uuid references auth.users(id) on delete set null,
  reporter uuid references auth.users(id) on delete set null,
  reason text check (char_length(reason) <= 200),
  created_at timestamptz not null default now()
);

-- For the join rate limit.
create table if not exists public.join_attempts (
  user_id uuid not null references auth.users(id) on delete cascade,
  at timestamptz not null default now(),
  ok boolean not null
);
create index if not exists join_attempts_user_idx on public.join_attempts (user_id, at);

-- ---------- access: nothing is open to clients except a person's own profile, status and days (read) ----------
-- Supabase gives new tables to anon and authenticated by default, so take everything back first.
revoke all on public.profiles, public.groups, public.group_members, public.group_invites, public.my_status,
  public.my_days, public.cheers, public.reports, public.join_attempts from public, anon, authenticated;
alter table public.profiles enable row level security;
alter table public.groups enable row level security;
alter table public.group_members enable row level security;
alter table public.group_invites enable row level security;
alter table public.my_status enable row level security;
alter table public.my_days enable row level security;
alter table public.cheers enable row level security;
alter table public.reports enable row level security;
alter table public.join_attempts enable row level security;

drop policy if exists "read own" on public.profiles;
create policy "read own" on public.profiles for select to authenticated using ((select auth.uid()) = user_id);
drop policy if exists "read own" on public.my_status;
create policy "read own" on public.my_status for select to authenticated using ((select auth.uid()) = user_id);
drop policy if exists "read own" on public.my_days;
create policy "read own" on public.my_days for select to authenticated using ((select auth.uid()) = user_id);
grant select on public.profiles, public.my_status, public.my_days to authenticated;
-- groups, group_members, group_invites, cheers, reports, join_attempts: no policy and no grant = no client access at all.

-- ---------- private helpers (not reachable from the API) ----------
create or replace function friends_private.me() returns uuid
language plpgsql stable set search_path = '' as $$
declare u uuid := (select auth.uid());
begin
  if u is null then raise exception 'not_signed_in' using errcode = '28000'; end if;
  return u;
end $$;

create or replace function friends_private.is_member(p_gid uuid) returns boolean
language sql stable security definer set search_path = '' as $$
  select exists (select 1 from public.group_members m where m.group_id = p_gid and m.user_id = (select auth.uid()));
$$;

create or replace function friends_private.is_owner(p_gid uuid) returns boolean
language sql stable security definer set search_path = '' as $$
  select exists (select 1 from public.group_members m where m.group_id = p_gid and m.user_id = (select auth.uid()) and m.role = 'owner');
$$;

-- The day a client names must be close to today in UTC (every time zone is within one day of it).
create or replace function friends_private.day_ok(p_day date) returns boolean
language sql stable set search_path = '' as $$
  select p_day is not null and abs(p_day - (now() at time zone 'utc')::date) <= 1;
$$;

-- Eight characters from an alphabet without 0, O, 1, I, L (31 symbols, about 850 billion codes).
create or replace function friends_private.new_code() returns text
language plpgsql volatile set search_path = '' as $$
declare
  alpha constant text := '23456789ABCDEFGHJKMNPQRSTUVWXYZ';
  bytes bytea; c text; i int;
begin
  loop
    bytes := extensions.gen_random_bytes(8); c := '';
    for i in 0..7 loop c := c || substr(alpha, (get_byte(bytes, i) % 31) + 1, 1); end loop;
    exit when not exists (select 1 from public.group_invites v where v.code = c);
  end loop;
  return c;
end $$;

create or replace function friends_private.norm_code(p_code text) returns text
language sql immutable set search_path = '' as $$
  select upper(regexp_replace(coalesce(p_code, ''), '[\s-]', '', 'g'));
$$;

-- What one person shows to the group on one day. This is the whole privacy rule in one place:
--   sharing off          -> resting (nothing else)
--   today, resting       -> resting
--   today, fasting       -> fasting / reached, progress measured against THEIR OWN plan, stops at full
--   a stale 'fasting'    -> not shown as fasting (the phone has not reported for goal + 6 hours)
--   otherwise            -> what the stored day says: reached, fasted, resting or none
create or replace function friends_private.status_of(
  p_sharing boolean, s public.my_status, x public.my_days, p_day date, p_today date,
  out o_status text, out o_progress real, out o_goal numeric)
language plpgsql stable set search_path = '' as $$
begin
  if not coalesce(p_sharing, false) then o_status := 'resting'; return; end if;
  if p_day = p_today then
    if s.state = 'resting' then o_status := 'resting'; return; end if;
    if s.state = 'fasting' and s.started_at is not null and s.goal_hours > 0
       and now() - s.updated_at <= (s.goal_hours + 6) * interval '1 hour' then
      o_progress := greatest(0, least(1, extract(epoch from (now() - s.started_at)) / 3600 / s.goal_hours))::real;
      o_goal := case when s.sacred then null else s.goal_hours end;
      if o_progress >= 1 - 1.0 / (60 * s.goal_hours) then o_progress := 1; o_status := 'reached'; else o_status := 'fasting'; end if;
      return;
    end if;
  end if;
  if x.outcome = 'rest' then o_status := 'resting'; return; end if;
  if x.outcome = 'fast' then
    o_progress := x.progress; o_goal := case when x.sacred then null else x.goal_hours end;
    o_status := case when x.progress >= 0.999 then 'reached' else 'fasted' end;
    return;
  end if;
  o_status := 'none';
end $$;

-- When a member goes (leaves, is removed, or their account is deleted): their cheers go too, ownership passes to the
-- longest-standing member, and a group with nobody left is deleted.
create or replace function friends_private.after_member_gone() returns trigger
language plpgsql security definer set search_path = '' as $$
declare nxt uuid;
begin
  delete from public.cheers c where c.group_id = old.group_id and (c.from_user = old.user_id or c.to_user = old.user_id);
  if old.role = 'owner' then
    perform 1 from public.groups g where g.id = old.group_id for update;
    if found then
      select m.user_id into nxt from public.group_members m where m.group_id = old.group_id order by m.joined_at, m.user_id limit 1;
      if nxt is null then delete from public.groups g where g.id = old.group_id;
      else update public.group_members m set role = 'owner' where m.group_id = old.group_id and m.user_id = nxt;
      end if;
    end if;
  end if;
  return old;
end $$;
drop trigger if exists member_gone on public.group_members;
create trigger member_gone after delete on public.group_members for each row execute function friends_private.after_member_gone();

-- ---------- the API ----------
create or replace function public.upsert_profile(p_name text, p_avatar text) returns void
language plpgsql security definer set search_path = '' as $$
declare me uuid := friends_private.me();
begin
  insert into public.profiles (user_id, display_name, avatar) values (me, btrim(p_name), p_avatar)
  on conflict (user_id) do update set display_name = excluded.display_name, avatar = excluded.avatar, updated_at = now();
end $$;

create or replace function public.create_group(p_name text) returns table(group_id uuid, code text)
language plpgsql security definer set search_path = '' as $$
declare me uuid := friends_private.me(); gid uuid; c text;
begin
  perform 1 from public.profiles p where p.user_id = me for update;
  if not found then raise exception 'no_profile'; end if;
  if (select count(*) from public.group_members m where m.user_id = me) >= 3 then raise exception 'group_cap'; end if;
  insert into public.groups (name) values (btrim(p_name)) returning id into gid;
  insert into public.group_members (group_id, user_id, role) values (gid, me, 'owner');
  c := friends_private.new_code();
  insert into public.group_invites (group_id, code, created_by) values (gid, c, me);
  return query select gid, c;
end $$;

-- The current invite. Any member can read it; if there is none (it expired or was reset) the owner gets a fresh one.
create or replace function public.current_invite(p_gid uuid)
returns table(code text, expires_at timestamptz, member_count int, max_members int)
language plpgsql security definer set search_path = '' as $$
declare me uuid := friends_private.me(); inv public.group_invites;
begin
  if not friends_private.is_member(p_gid) then raise exception 'not_member' using errcode = '42501'; end if;
  select i.* into inv from public.group_invites i where i.group_id = p_gid and i.revoked_at is null and i.expires_at > now() order by i.created_at desc limit 1;
  if not found and friends_private.is_owner(p_gid) then
    insert into public.group_invites (group_id, code, created_by) values (p_gid, friends_private.new_code(), me) returning * into inv;
  end if;
  if inv.id is null then return; end if;
  return query select inv.code, inv.expires_at,
    (select count(*)::int from public.group_members m where m.group_id = p_gid),
    (select g.max_members from public.groups g where g.id = p_gid);
end $$;

-- Owner only: the old link stops working at once.
create or replace function public.create_invite(p_gid uuid)
returns table(code text, expires_at timestamptz)
language plpgsql security definer set search_path = '' as $$
declare me uuid := friends_private.me(); inv public.group_invites;
begin
  if not friends_private.is_owner(p_gid) then raise exception 'not_owner' using errcode = '42501'; end if;
  update public.group_invites i set revoked_at = now() where i.group_id = p_gid and i.revoked_at is null;
  insert into public.group_invites (group_id, code, created_by) values (p_gid, friends_private.new_code(), me) returning * into inv;
  return query select inv.code, inv.expires_at;
end $$;

-- Anyone with a link may look: group name, who invited, how many, up to five avatars. Nothing else, and
-- the same empty answer for an unknown, expired, revoked or full invite.
create or replace function public.invite_preview(p_code text)
returns table(group_name text, inviter_name text, member_count int, avatars text[])
language plpgsql stable security definer set search_path = '' as $$
declare inv public.group_invites; g public.groups; n int; who text;
begin
  select i.* into inv from public.group_invites i where i.code = friends_private.norm_code(p_code) and i.revoked_at is null and i.expires_at > now();
  if not found then return; end if;
  select x.* into g from public.groups x where x.id = inv.group_id;
  select count(*)::int into n from public.group_members m where m.group_id = g.id;
  if n >= g.max_members then return; end if;
  select p.display_name into who from public.profiles p
    where p.user_id = coalesce(inv.created_by, (select m.user_id from public.group_members m where m.group_id = g.id and m.role = 'owner'));
  return query select g.name, coalesce(who, ''), n,
    array(select p.avatar from public.group_members m join public.profiles p on p.user_id = m.user_id where m.group_id = g.id order by m.joined_at limit 5);
end $$;

-- Never raises for a bad code (a raise would undo the attempt log): the answer is a status.
-- ok | already | invalid | full | cap | too_many | no_profile
create or replace function public.join_group(p_code text) returns table(status text, group_id uuid)
language plpgsql security definer set search_path = '' as $$
declare me uuid := friends_private.me(); inv public.group_invites; g public.groups;
begin
  perform 1 from public.profiles p where p.user_id = me for update;
  if not found then return query select 'no_profile'::text, null::uuid; return; end if;
  delete from public.join_attempts a where a.user_id = me and a.at < now() - interval '1 day';
  if (select count(*) from public.join_attempts a where a.user_id = me and not a.ok and a.at > now() - interval '1 hour') >= 10 then
    return query select 'too_many'::text, null::uuid; return;
  end if;
  select i.* into inv from public.group_invites i where i.code = friends_private.norm_code(p_code) and i.revoked_at is null and i.expires_at > now();
  if not found then
    insert into public.join_attempts (user_id, ok) values (me, false);
    return query select 'invalid'::text, null::uuid; return;
  end if;
  select x.* into g from public.groups x where x.id = inv.group_id for update;
  if exists (select 1 from public.group_members m where m.group_id = g.id and m.user_id = me) then
    return query select 'already'::text, g.id; return;
  end if;
  if (select count(*) from public.group_members m where m.group_id = g.id) >= g.max_members then
    return query select 'full'::text, null::uuid; return;
  end if;
  if (select count(*) from public.group_members m where m.user_id = me) >= 3 then
    return query select 'cap'::text, null::uuid; return;
  end if;
  insert into public.group_members (group_id, user_id) values (g.id, me);
  insert into public.join_attempts (user_id, ok) values (me, true);
  return query select 'ok'::text, g.id;
end $$;

create or replace function public.leave_group(p_gid uuid) returns void
language plpgsql security definer set search_path = '' as $$
declare me uuid := friends_private.me();
begin
  delete from public.group_members m where m.group_id = p_gid and m.user_id = me;
end $$;

create or replace function public.remove_member(p_gid uuid, p_uid uuid) returns void
language plpgsql security definer set search_path = '' as $$
declare me uuid := friends_private.me();
begin
  if not friends_private.is_owner(p_gid) then raise exception 'not_owner' using errcode = '42501'; end if;
  if p_uid = me then raise exception 'use_leave'; end if;
  delete from public.group_members m where m.group_id = p_gid and m.user_id = p_uid;
end $$;

create or replace function public.rename_group(p_gid uuid, p_name text) returns void
language plpgsql security definer set search_path = '' as $$
declare me uuid := friends_private.me();
begin
  if not friends_private.is_owner(p_gid) then raise exception 'not_owner' using errcode = '42501'; end if;
  update public.groups g set name = btrim(p_name) where g.id = p_gid;
end $$;

create or replace function public.set_sharing(p_gid uuid, p_on boolean) returns void
language plpgsql security definer set search_path = '' as $$
declare me uuid := friends_private.me();
begin
  update public.group_members m set sharing = coalesce(p_on, true) where m.group_id = p_gid and m.user_id = me;
end $$;

-- One call from the phone: the live state plus up to 8 stored days. Everything is validated; a bad shape is refused.
-- p_days: [{"day":"2026-11-06","outcome":"fast|rest|none","progress":0..1,"goal_hours":16,"sacred":false}, ...]
create or replace function public.publish_me(p_state text, p_started_at timestamptz, p_goal_hours numeric, p_days jsonb default '[]', p_sacred boolean default false)
returns void
language plpgsql security definer set search_path = '' as $$
declare me uuid := friends_private.me(); d jsonb; started timestamptz;
begin
  if p_state not in ('fasting','resting','idle') then raise exception 'bad_payload'; end if;
  if p_state = 'fasting' and (p_started_at is null or p_goal_hours is null) then raise exception 'bad_payload'; end if;
  if p_days is null or jsonb_typeof(p_days) <> 'array' or jsonb_array_length(p_days) > 8 then raise exception 'bad_payload'; end if;
  started := case when p_state = 'fasting' then least(p_started_at, now() + interval '5 minutes') end;
  insert into public.my_status (user_id, state, started_at, goal_hours, sacred, updated_at)
  values (me, p_state, started, case when p_state = 'fasting' then p_goal_hours end, coalesce(p_sacred, false) and p_state = 'fasting', now())
  on conflict (user_id) do update set state = excluded.state, started_at = excluded.started_at,
    goal_hours = excluded.goal_hours, sacred = excluded.sacred, updated_at = now();
  for d in select * from jsonb_array_elements(p_days) loop
    begin
      insert into public.my_days (user_id, day, outcome, progress, goal_hours, sacred, updated_at)
      values (me, (d->>'day')::date, d->>'outcome', coalesce((d->>'progress')::real, 0), (d->>'goal_hours')::numeric, coalesce((d->>'sacred')::boolean, false), now())
      on conflict (user_id, day) do update set outcome = excluded.outcome, progress = excluded.progress,
        goal_hours = excluded.goal_hours, sacred = excluded.sacred, updated_at = now();
    exception when others then raise exception 'bad_payload';
    end;
  end loop;
  delete from public.my_days x where x.user_id = me and x.day < (now() at time zone 'utc')::date - 14;
end $$;

create or replace function public.my_groups(p_today date)
returns table(group_id uuid, name text, role text, member_count int, fasting int, reached int, resting int)
language plpgsql stable security definer set search_path = '' as $$
declare me uuid := friends_private.me();
begin
  if not friends_private.day_ok(p_today) then raise exception 'bad_day'; end if;
  return query
  select g.id, g.name, gm.role,
    (select count(*)::int from public.group_members m where m.group_id = g.id),
    (select count(*)::int from public.group_members m left join public.my_status s on s.user_id = m.user_id left join public.my_days x on x.user_id = m.user_id and x.day = p_today,
       lateral friends_private.status_of(m.sharing, s, x, p_today, p_today) st where m.group_id = g.id and st.o_status = 'fasting'),
    (select count(*)::int from public.group_members m left join public.my_status s on s.user_id = m.user_id left join public.my_days x on x.user_id = m.user_id and x.day = p_today,
       lateral friends_private.status_of(m.sharing, s, x, p_today, p_today) st where m.group_id = g.id and st.o_status = 'reached'),
    (select count(*)::int from public.group_members m left join public.my_status s on s.user_id = m.user_id left join public.my_days x on x.user_id = m.user_id and x.day = p_today,
       lateral friends_private.status_of(m.sharing, s, x, p_today, p_today) st where m.group_id = g.id and st.o_status = 'resting')
  from public.group_members gm join public.groups g on g.id = gm.group_id
  where gm.user_id = me
  order by gm.joined_at, g.id;
end $$;

-- Members for the settings screen. Another person's sharing switch is not shown, only your own.
create or replace function public.group_roster(p_gid uuid)
returns table(user_id uuid, display_name text, avatar text, role text, is_me boolean, sharing boolean, joined_at timestamptz)
language plpgsql stable security definer set search_path = '' as $$
declare me uuid := friends_private.me();
begin
  if not friends_private.is_member(p_gid) then raise exception 'not_member' using errcode = '42501'; end if;
  return query
  select m.user_id, p.display_name, p.avatar, m.role, m.user_id = me, case when m.user_id = me then m.sharing end, m.joined_at
  from public.group_members m join public.profiles p on p.user_id = m.user_id
  where m.group_id = p_gid
  order by (m.user_id = me) desc, m.joined_at, m.user_id;
end $$;

-- The only way members see each other. YOU first, then in the order people joined. Never ordered by progress.
-- No timestamp is returned; progress is worked out here from the server clock.
create or replace function public.group_board(p_gid uuid, p_today date, p_day date)
returns table(user_id uuid, display_name text, avatar text, is_me boolean, status text, progress real,
              goal_hours numeric, cheered_by_me boolean, cheers_received int)
language plpgsql stable security definer set search_path = '' as $$
declare me uuid := friends_private.me();
begin
  if not friends_private.is_member(p_gid) then raise exception 'not_member' using errcode = '42501'; end if;
  if not friends_private.day_ok(p_today) or p_day is null or p_day > p_today or p_day < p_today - 6 then raise exception 'bad_day'; end if;
  return query
  select m.user_id, p.display_name, p.avatar, m.user_id = me, st.o_status, st.o_progress, st.o_goal,
    exists (select 1 from public.cheers c where c.group_id = p_gid and c.from_user = me and c.to_user = m.user_id and c.day = p_day),
    case when m.user_id = me then (select count(*)::int from public.cheers c where c.group_id = p_gid and c.to_user = me and c.day = p_day) else 0 end
  from public.group_members m
  join public.profiles p on p.user_id = m.user_id
  left join public.my_status s on s.user_id = m.user_id
  left join public.my_days x on x.user_id = m.user_id and x.day = p_day,
  lateral friends_private.status_of(m.sharing, s, x, p_day, p_today) st
  where m.group_id = p_gid
  order by (m.user_id = me) desc, m.joined_at, m.user_id;
end $$;

-- One silent Cheer per person to each friend per day, only for someone fasting or at their goal that day.
create or replace function public.send_cheer(p_gid uuid, p_to uuid, p_day date) returns void
language plpgsql security definer set search_path = '' as $$
declare me uuid := friends_private.me(); st text;
begin
  if not friends_private.is_member(p_gid) then raise exception 'not_member' using errcode = '42501'; end if;
  if p_to = me then raise exception 'bad_target'; end if;
  if not exists (select 1 from public.group_members m where m.group_id = p_gid and m.user_id = p_to) then raise exception 'bad_target'; end if;
  if not friends_private.day_ok(p_day) then raise exception 'bad_day'; end if;
  select r.o_status into st
  from public.group_members m left join public.my_status s on s.user_id = m.user_id left join public.my_days x on x.user_id = m.user_id and x.day = p_day,
  lateral friends_private.status_of(m.sharing, s, x, p_day, p_day) r
  where m.group_id = p_gid and m.user_id = p_to;
  if st is null or st not in ('fasting','reached') then raise exception 'not_cheerable'; end if;
  insert into public.cheers (group_id, from_user, to_user, day) values (p_gid, me, p_to, p_day) on conflict do nothing;
end $$;

create or replace function public.withdraw_cheer(p_gid uuid, p_to uuid, p_day date) returns void
language plpgsql security definer set search_path = '' as $$
declare me uuid := friends_private.me();
begin
  delete from public.cheers c where c.group_id = p_gid and c.from_user = me and c.to_user = p_to and c.day = p_day;
end $$;

create or replace function public.report_member(p_gid uuid, p_uid uuid, p_reason text default null) returns void
language plpgsql security definer set search_path = '' as $$
declare me uuid := friends_private.me();
begin
  if not friends_private.is_member(p_gid) then raise exception 'not_member' using errcode = '42501'; end if;
  if p_uid = me or not exists (select 1 from public.group_members m where m.group_id = p_gid and m.user_id = p_uid) then raise exception 'bad_target'; end if;
  insert into public.reports (group_id, reported_user, reporter, reason) values (p_gid, p_uid, me, left(p_reason, 200));
end $$;

-- ---------- who may call what ----------
-- Supabase lets anon and authenticated run every new function, so take that back and give it out one by one.
do $$
declare f record;
begin
  for f in select p.oid::regprocedure as sig, p.proname from pg_proc p
           where p.pronamespace = 'public'::regnamespace
             and p.proname in ('upsert_profile','create_group','current_invite','create_invite','invite_preview','join_group','leave_group',
                               'remove_member','rename_group','set_sharing','publish_me','my_groups','group_roster','group_board',
                               'send_cheer','withdraw_cheer','report_member')
  loop
    execute format('revoke all on function %s from public, anon, authenticated', f.sig);
    execute format('grant execute on function %s to authenticated', f.sig);
    if f.proname = 'invite_preview' then execute format('grant execute on function %s to anon', f.sig); end if;
  end loop;
end $$;
