# Lightly Friends: feature brief for a design and coding agent

Written 2026-11-01 for TEEBO (GitHub: KingTBO), owner of Lightly 轻伴. Hand this file to the agent that will **design and build** the Friends feature (for example Codex). It is meant to be read on its own. Where it points at other files, those are in this repo.

Nothing in this brief is built yet. The design reference is in [friends-design.html](friends-design.html) (open it in a browser: EN/中文 and light/dark switches, two live screens). Screenshots of all ten designed screens are next to it: [EN light](friends-screens_en_light.png), [EN dark](friends-screens_en_dark.png), [中文 light](friends-screens_zh_light.png). **Where the mock and this brief disagree, this brief wins** (the mock was made before the 2026-11-01 copy rule, and its SQL sketch has gaps that are fixed below).

Read first, in this order: [AGENTS.md](../../AGENTS.md), [RELEASING.md](../../RELEASING.md), the top of [CHANGELOG.md](../../CHANGELOG.md), then this brief.

---

## 1. The feature in one paragraph

Friends lets a small group of people who each fast on their own plan see how everyone's day is going. You start a group, send one link, and each person shows up as one row: a name, a one-word status, their plan in hours, and the same counter-clockwise moon-and-sun **disc** that fills on the Today screen. A strip of the last seven days lets you tap back to any day. There is one silent interaction, a **Cheer**. There is no chat, no ranking, no streak race, and no push notification in the first version.

## 2. Principles and guardrails (not up for trade-off)

These come from TEEBO and from AGENTS.md. If a design or code choice conflicts with one, the principle wins.

1. **Solo is the main experience.** Friends is a small, optional extra. The Today screen never shows a friend, an invite prompt, a badge or a red dot. The whole app works without an account and without ever opening Friends.
2. **Never share weight.** Weight is not tracked, and nothing about the body goes to a group.
3. **Never push past a person's own plan.** Each disc is measured against that person's own plan and stops at full. No overtime on a friend's row, no "Sam is ahead of you", no nudge either way, no group challenge that rewards longer fasts.
4. **Company, never competition.** No leaderboard, no ordering by progress, no counts of who fasted more. Rows are ordered "you first, then by join date", always.
5. **Resting is private and calm.** A cheat day (弹性日), Time off (休息一下) and a day the person turns sharing off all look the same to the group: a dashed ring and the word Resting. The reason never leaves the phone.
6. **No food logging and no AI coach.** Left out on purpose. Do not add them.
7. **No health or weight gamification.** No fat-burn stages, no body or scale imagery. Rewards, if any, are for consistency, never longer fasts.
8. **Location stays on the phone.** Nothing that reveals a friend's place or local time reaches the group. This is why friend discs are a sun, never a moon at night (see decision 2), and why a sacred fast's length must not be shown (section 12).
9. **Never say "where you are".** Say "sunrise and sunset" or "your day". Same rule for any new copy.
10. **Copy rule (TEEBO, 2026-11-01): short, say each thing once.** A screen has a title and at most one line. If a headline, a sub-line and a note explain the same idea, cut two. Do not turn similar points into three bullets. The privacy lists on the consent screen are the one place a short list is the point. Users are lazy.

Also from the owner: **24-hour time everywhere, no AM/PM**; **Apple's look on every platform** (HIG visual style, motion and typography, no Material styling); **every string in English and Simplified Chinese**; the product is "Lightly" in English and "轻伴" in Chinese; "Cheat day" is "弹性日" and that term is decided.

## 3. Where the owner's decisions stand

The design doc ended with six decisions. Status as of 2026-11-01:

| # | Decision | Status | Default to build with |
|---|---|---|---|
| 1 | Do friends see each other's streak? | **Not answered by TEEBO** | **No.** Out of v1; maybe a per-person opt-in later. Note the concept page currently says friends see a streak ("Cheat day · 9-day streak"); that text must change either way. |
| 2 | Does a friend's disc turn into a moon at night? | **Not answered by TEEBO** | **No.** Every friend disc is a sun in v1. A moon would reveal roughly what time it is for them, which is close to location. Opt-in later. |
| 3 | Keep Cheer in v1? | **Not answered by TEEBO** | **Yes**, silent, one per person to each friend per day. |
| 4 | Past days: partial disc or just done? | **Answered in effect** (TEEBO, 2026-10-31: remove the "Finished" status; show progress simply) | Partial wedge, the word **Fasted**, never "failed" or "early". Reached goal is a full disc. |
| 5 | Tab bar: four tabs, Friends third? | **Not answered by TEEBO** (earlier notes already assumed Today, Days, Friends, Me) | **Yes.** No badge or dot on the Friends tab. |
| 6 | Account required for Friends? | **Not answered by TEEBO** | **Yes.** Only Friends needs sign-in (Google or email). Everything else stays account-free. |

Also decided by TEEBO on 2026-10-31: the first release is a **standard** feature (invite friends into a group, fast together, see each member's status per day, use the counter-clockwise disc icons as status), and **friends do see each person's plan as hours** (16h, 18h) next to the status word, because people fast on different plans. They never see hours elapsed, start or end times, or the reason someone is resting.

How to proceed: TEEBO asked on 2026-11-01 for this brief so an agent can design and code the feature, but has not yet ruled on decisions 1, 2, 3, 5 and 6. Build with the defaults above, keep each one easy to flip (one constant or one switch, not scattered), list the five in the PR description, and **ask TEEBO to confirm them before the first public release**. Build behind a preview flag (section 17) so nothing reaches ordinary users before that.

## 4. What exists today in the repo (so you build on it, not around it)

- A real, installable PWA at the repo root, deployed by GitHub Pages from `main`. **No build step, no framework, no dependencies.** Plain scripts loaded from `index.html`; add new files to `SHELL` in `sw.js`. Live: https://kingtbo.github.io/Lightly-Fasting-App-Project/
- `js/core.js` pure logic, UMD, unit-tested in Node (`tests/core.test.js`). **Put rules here or in a new pure file, not in the UI.** Useful already: `dayKey(ms)` (local `YYYY-MM-DD`), `addDays`, `mondayOf`, `isDone(f)` (a fast is done if it lasted its goal, with one minute of grace), `planById`, `PLANS` (13, 16, 18, 20, 23, 24, 36, custom 12 to 23), `flexBlock`, `fastDays(fasts)` (a fast belongs to the day it **ended**; the Days tab does the same).
- `js/app.js` UI and state. State is `S` in `localStorage` key `lightly:v1`: `S.cur` = `{start, goalH, planId, reached}` while fasting, `S.fasts` = `[{id,start,end,goalH,plan}]`, `S.flex.used` = cheat-day date keys, `S.off` = Time off periods, `S.unwell`, `S.lang` (`'en'|'zh'`), `S.prefs`. Helpers: `L(en, zh)` for every string, `esc()`, `openSheet(html)` bottom sheets, `toast(msg, undo)`, `fx('light'|'success'|...)` haptics and sound, `showTab(name)`, delegated click handling on `data-*` attributes.
- Tab bar: three tabs (`data-tab="today|days|me"`) in a floating glass bar. **`.tab-ind` has `width:calc((100% - 12px)/3)` and a `--ti` index, so it is hard-coded for three tabs.** Going to four tabs means changing it, re-checking the 440, 390 and 375 pt widths, and the scroll-to-hide behaviour of the bar.
- `js/cloud.js` is the Supabase client: **plain `fetch` against REST and auth, no SDK.** It has `getAuth()`, `token()` (refreshes), `push`/`pull` of the backup row, and a private `call(path, opts)`. You will need to export an `rpc(name, args)` helper built on `call` (and an anonymous variant for the invite preview).
- Supabase project `eqvdxzbnumuudkqfkyyb`, URL and publishable key already in `js/config.js` (public by design). Only one table exists today: `public.lightly_state` (one backup row per user, RLS own-row). Sign-in works with Google and email magic link. Apple sign-in is a deferred stub; WeChat and phone sign-in belong to a separate China track.
- Sign-in redirects already carry a packed copy of state in `?r=`; `LightlyCloud.takeCarried()` restores it. **The invite code must survive that round trip too** (section 6.6).
- The Me tab account card shows a generic person icon. **The eight "sky avatars" planned for signed-in people are not built yet** (crescent, full moon, sunrise, morning star, constellation, lantern, cup of tea, water drop; see the avatar mock). Friends needs them, so they are in scope here (section 6.4). The Eclipse avatar (unlocked after 30 fasts) and own-photo upload are **not** in v1.
- The concept page `concept/index.html` is the product landing page. It has a "Fast with friends" section tagged "Coming later · optional" with a three-row example and outdated copy (streak). Phone mockups on it show three tabs.

## 5. Scope of v1

**In**
- Groups of up to **10** people; up to **3** groups per person.
- Invite by **link, code or QR**; code valid 7 days; owner can reset it.
- Friends tab (4th tab), group screen with a **7-day strip** (today and the 6 days before), one summary line, one row per person.
- A row = sky avatar, name, status word, plan in hours, disc. Tap a row for a one-person sheet with their last 7 days as discs.
- **Cheer**: silent, one per person per day to each friend, only on today, only for someone fasting or reached goal.
- Group settings: Share my status switch, invite link reset, members, remove a member (owner), report a name, leave group.
- Invite page (opens in the browser from a link) and a plain-words consent sheet before joining.
- Name and sky-avatar setup the first time someone creates or joins a group.
- English and Chinese, light and dark, Reduce Motion and Reduce Transparency honoured.
- Poll for updates (no realtime, no push).

**Later (do not build, but do not block):** push notifications (needs the native apps), Realtime Broadcast, moon-at-night as an opt-in, streak sharing as an opt-in, family and Ramadan group kinds, own-photo avatars.

**Not planned:** leaderboards or ranking, chat or free text between members, sharing weight or food, group challenges that push longer fasts, any "who is ahead" copy.

## 6. User stories, screens and flows

### 6.1 User stories

1. As someone who fasts alone, I never see Friends unless I open it. Today looks exactly as before.
2. As a signed-in person, I can start a group, name it, and send an invite link, code or QR in under a minute.
3. As a friend with the link, I see the group name and who invited me, then decide what to share before I join.
4. As a member, I see at a glance who is fasting, who reached their goal, who is resting, and on which plan, without any hour counts or times.
5. As a member, I can tap a past day and see the same list for that day, and tap a person to see their week.
6. As a member, I can send one silent Cheer to someone who is fasting or has reached their goal, and I can see that I did.
7. As a member, I can turn **Share my status** off and the group sees only Resting. I can leave at any time and vanish from the group at once.
8. As an owner, I can reset the invite link, remove a member, and report a name.
9. As someone who has never made an account, I am told clearly that only Friends needs one, and that the rest of Lightly keeps working without it.
10. As a Chinese-language user, every screen reads naturally in 中文 and nothing clips.

### 6.2 Designed screens (ten, see the mock and screenshots)

| # | Screen | Notes |
|---|---|---|
| 1 | Friends tab, signed in, no group | Three discs (empty, filling, full), title, one line, **Start a group**, link **Enter an invite code**. |
| 2 | Friends tab, signed out | Same hero, one button **Sign in**, one line saying everything else works without an account. |
| 3 | New group (sheet) | One field, one primary pill, round X to dismiss, like every other Lightly sheet. |
| 4 | Invite friends (sheet) | QR, code in 4+4 groups, **Share link** (system share sheet), **Copy**, validity and spots used. |
| 5 | Group, today | Header (name, sub-line, **Invite**), 7-day strip, summary line, rows, floating tab bar. Live in the mock. |
| 6 | Group, a past day | Same list; Cheer hidden; a fast that ended early shows the share reached; the word is **Fasted**. |
| 7 | One person (sheet) | Avatar, name, plan, big disc, last-7-days discs, **Cheer \<name\>**. |
| 8 | Group settings | Share my status (first and plainest), invite link with **Reset**, members with Owner label, **Leave group** as a red row. Remove and report sit behind a swipe on a member. |
| 9 | Invite page (browser) | Group name, who invited, avatars only. **No statuses before joining.** |
| 10 | Consent (sheet) | "What the group sees": a yes list and a never list, then **Join**. |

### 6.3 Screens and states the mock did not cover (you design these)

Follow the same patterns (sheets with a round X, one primary pill, destructive row in red, toast with Undo, large title). Recommendations in italics are mine, not decided.

- **More than one group.** The mock shows one group. *With one group the tab opens straight into it; with two or three, show a grouped list (name, "6 people", "3 fasting") that pushes the group screen with a Back button, plus rows for New group and Enter a code at the bottom.*
- **Name and avatar setup** (first create or join): a sheet with a name field (1 to 24 characters) and the eight sky avatars. **Never prefill the name from the email address, and never show an email to a group.** *Editing later: tap the account card in Me.*
- **Enter an invite code** sheet: one field, spaces and case ignored, `O`, `0`, `I`, `1`, `L` forgiven.
- **Errors and edge states:** invalid or expired invite (one generic message, section 13), group full, already in three groups, already a member (open the group), too many attempts, offline, load failed, removed from a group while looking at it.
- **Leave group** and **Remove member** confirmations (simple sheets, Cancel is fine; these are reversible by rejoining).
- **Own row when sharing is off:** the person sees their own row as Resting like everyone else does, so it is never a surprise.
- **Invitee who has not finished onboarding.** *Keep the code, run the normal onboarding (they need a plan before a status makes sense), then open the consent sheet from the Friends tab. Do not make the invite page require an account to look at.*
- **The four-tab bar** and the Friends tab icon (the mock uses two overlapping people outline).
- **Group list empty states in Chinese** and long Chinese group names (up to 32 characters must not clip).

### 6.4 Avatars and names

Avatar keys (stored as text): `crescent`, `fullmoon`, `sunrise`, `morningstar`, `constellation`, `lantern`, `tea`, `drop`. Flat, calm, no food, body or scale imagery. Names are user content: 1 to 24 characters, trimmed. They are the only free text in the feature, which is why report, remove and leave exist (App Store rules for user-generated content).

### 6.5 Invite flow

1. Owner creates a group (name 1 to 32 characters). The app creates the first invite and opens the Invite sheet.
2. Link: `<app origin and path>?join=K7QM4XD9` (the app is static hosting, so a query parameter, not a path; build it from `location.origin + location.pathname` like `cloud.js` does, and keep the base in one constant for a future custom domain). Code: 8 characters from `23456789ABCDEFGHJKMNPQRSTUVWXYZ` (31 symbols, about 850 billion codes), shown as `K7QM 4XD9`. QR encodes the link.
3. The link opens the invite page (screen 9) in whichever browser the friend uses. It calls an anonymous preview that returns only group name, inviter's display name, member count and up to five avatar keys.
4. Friend taps **Join**. Not signed in: sign in (Google or email), then continue. Signed in: name and avatar setup if they have no profile, then the consent sheet, then joined.
5. **The code must survive sign-in.** Store it (`localStorage`, key such as `lightly:join`) on landing, and also carry it through the sign-in `redirect_to` alongside `?r=`, because a magic link can open in a different browser with empty storage. The Supabase redirect allow-list already has the `**` wildcard.
6. If someone installed the PWA but taps the link in Safari, Safari is signed in, not the installed app. That is an existing limitation (see README); do not try to fix it here.

## 7. The status model (what the disc and word mean)

Five states are shown. The server returns one of: `fasting`, `reached`, `fasted`, `resting`, `none`.

| Server value | Word EN / 中文 | Disc | When |
|---|---|---|---|
| `fasting` | Fasting / 断食中 | Counter-clockwise wedge from 12 o'clock, `progress` of the person's own plan | Today only: a fast is running and progress < 1 |
| `reached` | Reached goal / 达成目标 | Full disc, soft glow | Progress ≥ 1 (with the same one-minute grace as `isDone`). The disc **stops at full**; no overtime. |
| `fasted` | Fasted / 已断食 | Wedge of the share reached, same bright fill (no muted look, no dot) | A finished fast that did not reach its goal (today after it ended, or a past day) |
| `resting` | Resting / 休息中 | Dashed ring | Cheat day used, Time off active, or sharing turned off |
| `none` | Not fasting / 没有断食 | Empty ring | No fast that day, or stale (below) |

- **There is no "Finished" state.** TEEBO removed it: a disc is just progress, the same whether the fast is running or ended earlier.
- The row shows the plan as hours next to the word for `fasting`, `reached` and `fasted`: "Fasting · 16h" / "断食中 · 16小时". `resting` and `none` show no plan. The disc is always measured against that person's own `goal_hours`, so a full 13h disc is a full disc.
- On a past day a fast that was running at the time shows as `reached` or `fasted` from the stored day outcome, never `fasting`.
- Disc drawing: reuse the app's wedge code (counter-clockwise from 12, `wedgePath` in `js/app.js`, mirrored in the concept page). Sun gradient from the mock (`#FFF4C8` to `#FFC93C` to `#FF9F1C`). 30 pt on a row, larger in the member sheet, 28 pt in the week row.
- **Stale rule:** a `fasting` state whose `updated_at` is older than `goal_hours + 6 h` is shown as `none` (the phone has not reported for a long time). This only changes what friends see; it never touches the person's own timer, which keeps counting past the goal.
- The summary line counts: "Today · 3 fasting · 1 reached goal · 1 resting". No percentages, no "most", no ranking words.

## 8. Data model and Supabase

Put the SQL in `supabase/friends.sql` (idempotent, like `supabase/schema.sql`). **Applying it changes the live database, so wait for TEEBO's go-ahead before applying it to project `eqvdxzbnumuudkqfkyyb`.** Prefer a Supabase branch or a rolled-back transaction while testing. After applying, run the Supabase security advisor and fix findings.

### 8.1 Tables

```sql
-- Sketch. Fix details as you test. Every table: RLS on, no grants to anon.
create extension if not exists pgcrypto with schema extensions;

create table public.profiles (
  user_id uuid primary key references auth.users(id) on delete cascade,
  display_name text not null check (char_length(btrim(display_name)) between 1 and 24),
  avatar text not null default 'crescent'
    check (avatar in ('crescent','fullmoon','sunrise','morningstar','constellation','lantern','tea','drop')),
  updated_at timestamptz not null default now()
);

create table public.groups (
  id uuid primary key default gen_random_uuid(),
  name text not null check (char_length(btrim(name)) between 1 and 32),
  kind text not null default 'friends' check (kind in ('friends','family','ramadan')),
  owner_id uuid not null references auth.users(id) on delete cascade,
  max_members int not null default 10 check (max_members between 2 and 10),
  created_at timestamptz not null default now()
);

create table public.group_members (
  group_id uuid not null references public.groups(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  role text not null default 'member' check (role in ('owner','member')),
  sharing boolean not null default true,
  joined_at timestamptz not null default now(),
  primary key (group_id, user_id)
);
create index on public.group_members (user_id);

create table public.group_invites (
  id uuid primary key default gen_random_uuid(),
  group_id uuid not null references public.groups(id) on delete cascade,
  code text not null unique check (code ~ '^[2-9A-HJKMNP-Z]{8}$'),
  created_by uuid not null references auth.users(id) on delete cascade,
  created_at timestamptz not null default now(),
  expires_at timestamptz not null default now() + interval '7 days',
  revoked_at timestamptz
);

-- The person's own live state. Friends never read this table.
create table public.my_status (
  user_id uuid primary key references auth.users(id) on delete cascade,
  state text not null check (state in ('fasting','resting','idle')),
  started_at timestamptz,                       -- only when fasting
  goal_hours numeric check (goal_hours between 1 and 48),
  updated_at timestamptz not null default now()
);

-- One row per local calendar day (the day the fast ENDED, like the Days tab).
create table public.my_days (
  user_id uuid not null references auth.users(id) on delete cascade,
  day date not null,
  outcome text not null check (outcome in ('fast','rest','none')),
  progress real not null default 0 check (progress between 0 and 1),
  goal_hours numeric check (goal_hours between 1 and 48),
  updated_at timestamptz not null default now(),
  primary key (user_id, day)
);

create table public.cheers (
  group_id uuid not null references public.groups(id) on delete cascade,
  from_user uuid not null references auth.users(id) on delete cascade,
  to_user uuid not null references auth.users(id) on delete cascade,
  day date not null,
  created_at timestamptz not null default now(),
  primary key (group_id, from_user, to_user, day),
  check (from_user <> to_user)
);

create table public.reports (            -- written only through report_member(); read in the dashboard
  id uuid primary key default gen_random_uuid(),
  group_id uuid, reported_user uuid, reporter uuid,
  reason text check (char_length(reason) <= 200),
  created_at timestamptz not null default now()
);

create table public.join_attempts (      -- for rate limiting join_group()
  user_id uuid not null, at timestamptz not null default now(), ok boolean not null
);
```

Optionally a tiny `blocks(user_id, blocked_user_id)` so someone can refuse invites from a person who reported or harassed them; `join_group` checks it. This is the "block invites" item in the design; keep it minimal.

### 8.2 Functions (all writes go through these; no insert, update or delete policies on the group tables)

All are `security definer`, `set search_path = ''`, fully schema-qualified, with `revoke all ... from public, anon` and `grant execute ... to authenticated`. **Supabase grants execute on new functions to `anon` and `authenticated` by default, so the explicit revoke is required.** The single deliberate exception is `invite_preview`, granted to `anon`.

| Function | Who | What it does |
|---|---|---|
| `upsert_profile(name, avatar)` | self | Create or update own profile. |
| `create_group(name)` | self | Needs a profile. Enforces 3 groups per person. Inserts group, owner membership, first invite. Returns group id and code. |
| `create_invite(gid)` | owner | Revokes the active invite, makes a new 8-character code with `extensions.gen_random_bytes`, 7 days. |
| `invite_preview(code)` | **anon** | Returns group name, inviter display name, member count, up to 5 avatar keys. Returns the same empty result for unknown, expired, revoked and full. No statuses, no ids of other users. |
| `join_group(code)` | self | Checks code, expiry, revoked, not already a member (then just return the group), member limit and the 3-group cap, blocks. Locks the group row (`for update`) so two joins cannot exceed the limit. Logs to `join_attempts`; after about 10 failures in an hour, raise a "too many tries" error. |
| `leave_group(gid)` | self | Removes membership. If the owner leaves, the longest-standing member becomes owner. If nobody is left, delete the group. |
| `remove_member(gid, uid)` | owner | Remove someone else. Cannot remove self (use leave). |
| `rename_group(gid, name)` | owner | |
| `set_sharing(gid, on)` | self | Per group. |
| `publish_me(state, started_at, goal_hours, days jsonb)` | self | One call that upserts `my_status` and up to 8 `my_days` rows. Clamp `started_at` to at most now + 5 minutes. Validate everything; reject bad shapes. |
| `my_groups()` | self | Group id, name, role, member count, counts per status for today (for the list screen). |
| `group_members(gid)` | member | Names, avatars, roles, joined order. Used by settings. |
| `group_board(gid, today date, d date)` | member | The only way friends see each other (below). |
| `send_cheer(gid, to_user, day)` / `withdraw_cheer(...)` | member | Both must be members, not self, `day = today` as passed, the target must be `fasting` or `reached` on that day. One row per (group, from, to, day). |
| `report_member(gid, uid, reason)` | member | Insert into `reports`. |
| `delete_my_account()` | self | See open question (section 18): needs an Edge Function with the service role. |

### 8.3 `group_board`, the privacy-critical function

```sql
-- Returns one row per member, YOU first then by joined_at. Never order by progress.
-- Raw started_at / ended times are never returned; progress is computed here.
create or replace function public.group_board(gid uuid, today date, d date)
returns table (user_id uuid, display_name text, avatar text, is_me boolean,
               status text, progress real, goal_hours numeric,
               cheered_by_me boolean, cheers_received int)
language plpgsql stable security definer set search_path = '' as $$
begin
  if not public.is_group_member(gid) then raise exception 'not a member' using errcode = '42501'; end if;
  if d > today or d < today - 6 then raise exception 'day out of range'; end if;
  -- for each member m (join profiles p, left join my_status s, left join my_days x on x.day = d):
  --   if not m.sharing                                  -> 'resting', progress null, goal null
  --   elsif d = today and s.state = 'resting'           -> 'resting'
  --   elsif d = today and s.state = 'fasting'
  --         and now() - s.updated_at <= (s.goal_hours + 6) * interval '1 hour'
  --                                                     -> p := least(1, hours since started_at / goal_hours)
  --                                                        'reached' if p >= 1 - 1/60/goal_hours else 'fasting'
  --   elsif x.outcome = 'rest'                          -> 'resting'
  --   elsif x.outcome = 'fast'                          -> 'reached' if x.progress >= 0.999 else 'fasted'
  --   else                                              -> 'none'
  -- cheered_by_me: exists cheer from auth.uid() to m.user_id for gid on d
  -- cheers_received: count of cheers to m.user_id on d, only on the viewer's own row, else 0
end $$;
```

Helper used by every policy and RPC:

```sql
create or replace function public.is_group_member(gid uuid) returns boolean
language sql stable security definer set search_path = '' as $$
  select exists (select 1 from public.group_members where group_id = gid and user_id = auth.uid());
$$;
```

### 8.4 Row Level Security

- **RLS on every table.** No policies for `anon` on any table.
- `profiles`: select **own row only**. Friends' names and avatars reach the phone only inside `group_board`, `group_members` and `my_groups`. (The mock said "readable by people who share a group"; this is tighter and simpler.) Writes only through `upsert_profile`.
- `my_status`, `my_days`: select, insert, update only where `user_id = auth.uid()`. Friends never select them.
- `groups`, `group_members`, `group_invites`, `cheers`, `reports`, `join_attempts`: **no direct client access** except a member may `select` their own `group_members` and `groups` rows; everything else via the functions above. `group_invites` and `reports` are not selectable by clients at all (the owner gets the current code from `create_invite` or from a small `current_invite(gid)` function).
- Leaving is immediate because every read checks **current** membership. Deleting an account cascades through every table (all foreign keys use `on delete cascade`).
- Never put the `service_role` key anywhere in the repo.

## 9. Client behaviour

**Files.** Suggested: `js/friends.js` (pure, UMD, no DOM: build the 7-day list, map server status to word and disc, compute day outcomes from `S`, normalise invite codes, plan label; unit-tested in Node) and the UI in `app.js` or a second UI file. Add `friends.js` to `sw.js` `SHELL`. Extend `cloud.js` with `rpc()`.

**Publishing my status (`publish_me`).** Send on: fast start, end, start-time edit, fast delete or add in Days, plan change mid-fast, cheat day used, Time off start and end, sign-in, joining a group, switching sharing, and **app open or return to foreground** (heartbeat, throttle to about once a minute). Queue the latest payload while offline and send when back online (only the newest matters). Payload:

- `state`: `fasting` if `S.cur` and not in Time off; `resting` if Time off is active or today is in `S.flex.used`; else `idle`.
- `started_at`, `goal_hours` from `S.cur` (`goalH`, as updated by a plan change).
- `days`: the last 7 local days. Per day, using the **device's local calendar date** (`dayKey`, the day a fast ended): the fast with the highest `min(1, hours / goalH)` that ended that day gives `outcome: 'fast'`, that `progress` and its `goal_hours`; a cheat day or Time off day gives `rest`; otherwise `none`. A plain "unwell" check-in only pauses long fasts, so check how `S.unwell` and `S.off` behave in `js/app.js` before mapping it to `rest`, and ask TEEBO if unsure.
- Publish **nothing** while signed out or in no group. On sign-out, send a best-effort `idle` first.

**Reading.** On opening the Friends tab, on pull to refresh, and every **60 seconds** while the tab is visible and the page is foregrounded (stop on `visibilitychange` hidden). A fast moves about 1% every 10 minutes, so polling reads as live. Keep the last good result and show it with a quiet offline line if a call fails; never show a spinner over existing rows. Pass the viewer's local date as `today`.

**Where local data lives.** Friends data (group list cache, join code) goes in its **own** `localStorage` key, not in `S`. That keeps it out of the cloud backup, the `?r=` carry, and the export file. The Me export must not contain friends data. Decide what **Erase everything** does to it (clear the cache; the account and memberships stay on the server until the person leaves; do not add text to the erase sheet).

**Time zones.** Each person's day rows are in **their own** local date. The viewer asks for `d` in the viewer's date. A friend in another zone may be a few hours ahead or behind; that is accepted and not displayed. Do not show or log anyone's time zone.

## 10. Notifications

**v1 has none.** No push, no email, no badge, no red dot, no sound, no vibration for friend activity. A Cheer shows up as a small sun next to your name the next time you open Friends (a number if more than one). Do not request notification permission for Friends.

For later, so the data can support it: quiet push for a Cheer at most once a day, never "X finished and you haven't", never about someone being behind, respecting Do Not Disturb; an iftar moment for Ramadan family groups. That needs the native apps and a `push_tokens` table; leave it out of v1.

## 11. Edge cases checklist

- Offline publish and offline read (above). Two devices on one account: the later write wins; `updated_at` is server time.
- Edit the start time of a running fast: progress changes at once for friends on the next poll.
- A fast that spans midnight belongs to the day it ends; today's row stays `fasting` until it ends.
- Plan changed mid-fast: `goal_hours` updates; the friend's plan label and disc update; the `reached` state can go back to `fasting`.
- Ending a fast early: today shows `fasted` with the share reached. Never a red state or the words "failed", "early", "missed".
- Time off or cheat day starts mid-fast: show `resting` from then.
- A running fast past its goal: `reached`, disc stays full, no overtime shown to others.
- Sharing off: group sees Resting; the person's own screen shows their row as Resting too.
- Last member leaves: group deleted. Owner leaves: ownership passes on.
- Removed while viewing: next poll returns an error; return to the list with one line, no scary wording.
- Invite code collision on creation: retry. Code typed with spaces, lowercase, or `O`/`0`/`I`/`1`/`L`.
- Group full at join time (race): one friend gets the "full" message.
- Same person opens the link twice, or is already a member: open the group.
- Member limit and 3-group cap are enforced in the database, not only in the UI.
- Clock skew: progress is computed on the server from `now()`; `started_at` is clamped.
- **Sacred fasts (Ramadan, later):** a Ramadan day's length reveals roughly the latitude. When Ramadan groups are built, do not show hours for them; show the word only.
- **5:2** has no timer: it shows `none` on light days unless TEEBO says otherwise. Ask.
- Very long names (24 characters) in both languages; names with emoji or RTL text must not break the row.

## 12. Copy (EN and Simplified Chinese)

Shortened to the copy rule. Do not add lines. Keep the wording calm; sentence case; 24-hour time; "Cheer" is 加油; "Cheat day" is 弹性日; Time off is 休息一下. Keys are suggestions.

| Where | EN | 中文 |
|---|---|---|
| Tab | Friends | 朋友 |
| Empty title | Fast together, when you want company | 想要人陪时，一起断食 |
| Empty line | Start a group and send one link. | 建一个小组，发一个链接。 |
| Empty buttons | Start a group · Enter an invite code | 建一个小组 · 输入邀请码 |
| Signed-out line | Friends needs an account. Everything else works without one. | 朋友功能需要账号，其他功能不需要。 |
| Signed-out button | Sign in | 登录 |
| New group | New group · Group name · Up to 10 people. · Create and invite | 新建小组 · 小组名称 · 最多 10 人。 · 创建并邀请 |
| Your name sheet | Your name in groups · Name · Continue | 你在小组里的名字 · 名字 · 继续 |
| Invite sheet | Invite friends · Invite code · Share link · Copy · Copied | 邀请朋友 · 邀请码 · 分享链接 · 复制 · 已复制 |
| Invite note | Valid for 7 days. Share it only with people you know. | 7 天内有效，请只发给你认识的人。 |
| Group sub-line | 6 people · Oct 25 to 31 | 6 人 · 10 月 25 日至 31 日 |
| Group button | Invite | 邀请 |
| Summary | Today · 3 fasting · 1 reached goal · 1 resting | 今天 · 3 人断食中 · 1 人达成目标 · 1 人休息 |
| Status words | Fasting · Reached goal · Fasted · Resting · Not fasting | 断食中 · 达成目标 · 已断食 · 休息中 · 没有断食 |
| Row | Fasting · 16h | 断食中 · 16小时 |
| You | You | 我 (the chip), 你 (the name) |
| Cheer | Cheer · Cheered · Cheer Mei | 加油 · 已加油 · 给美琪加油 |
| Member sheet | Last 7 days | 过去 7 天 |
| Cheer note | Silent. Mei sees a small sun next to her name. | 静音的。美琪会在名字旁看到一个小太阳。 |
| Settings | Group settings · Share my status · Invite link · Expires in 6 days · Reset · Members · Owner · Show all 6 | 小组设置 · 分享我的状态 · 邀请链接 · 6 天后过期 · 重置 · 成员 · 群主 · 显示全部 6 人 |
| Sharing note | Off: the group sees Resting and nothing else. | 关闭后，小组只会看到“休息中”。 |
| Member actions | Remove · Report name | 移除 · 举报名字 |
| Leave | Leave group · Leave Morning crew? · You disappear from the group right away. | 退出小组 · 退出晨光小组？ · 你会立刻从小组里消失。 |
| Invite page | Maya invited you to Morning crew · 5 people fast together here. · Join Morning crew · What the group sees | 小雅邀请你加入晨光小组 · 5 个人在这里一起断食。 · 加入晨光小组 · 小组能看到什么 |
| Consent title | What the group sees | 小组能看到什么 |
| Consent: sees | Your name and sky avatar · Your plan, like 16h · Whether you are fasting, reached your goal or resting, as a disc | 你的名字和天空头像 · 你的计划，比如 16 小时 · 你是在断食、已达成目标还是在休息，用一个圆盘表示 |
| Consent: never | Your weight or anything about your body · Hours fasted or exact times · Your location, or why you rest | 你的体重或任何身体信息 · 已断食的小时数或具体时间 · 你的位置，或你休息的原因 |
| Consent footer | Leave any time and you vanish at once. | 随时可以退出，你会立刻消失。 |
| Invalid invite | This invite isn't valid any more. Ask for a new one. | 这个邀请已失效，请向对方要一个新的。 |
| Group full | This group is full. | 这个小组已满员。 |
| Group cap | You're in 3 groups already. Leave one to join another. | 你已经在 3 个小组里了。退出一个才能加入新的。 |
| Rate limit | Too many tries. Try again in an hour. | 尝试次数太多，请一小时后再试。 |
| Already in | You're already in Morning crew. | 你已经在晨光小组里了。 |
| Offline | Offline. Showing the last update. | 已离线，显示的是上次更新。 |
| Load failed | Couldn't load. Pull to refresh. | 加载失败，下拉刷新。 |

The mock's long lines (the invite-page paragraph, the sign-in hint under the invite button, the second sentence on the empty state) were cut on purpose. If a screen still repeats itself, cut more. Check every Chinese string for length at 360 pt width.

## 13. Acceptance criteria

The feature is done when all of these hold, in English and Chinese, light and dark.

**Product**
1. With no account, or with an account and no group, Today, Days and Me look and behave exactly as before. There is no prompt, badge or dot about Friends anywhere outside the Friends tab.
2. Friends needs sign-in; the signed-out Friends tab says so in one line and signs in with the existing Google or email flow.
3. I can create a group, get a link, code and QR, and a second account can join with each of the three.
4. A joined member appears in the list on the other phone within about a minute, with the right word, plan hours and disc.
5. Tapping a day in the strip shows that day for everyone; Cheer is hidden on past days; the word on past days is Fasted or Reached goal, never "Fasting".
6. Tapping a person opens their last 7 days as discs.
7. Cheer: one per person per day; a second tap withdraws it; the recipient sees a small sun next to their name on next open.
8. Share my status off makes me Resting to everyone immediately; leaving removes me immediately.
9. Owner can reset the link (the old code stops working at once), remove a member, and anyone can report a name.
10. Nothing in any response friends can receive contains weight, hours elapsed, start or end times, location, the reason for resting, or a streak.
11. Rows are never ordered by progress. No ranking words anywhere.

**Design and quality**
12. Matches Apple's look (large title, sheets with a round X, one primary pill, glass floating tab bar, red destructive row) and the app's own tokens; no Material styling.
13. `qa/run-app.js` passes with **0 alignment issues** for the new screens: 16 px side margin, 44 pt tap targets (except standard switches and inline links), icons centred with labels, no clipped text, nothing outside the phone. Contrast meets WCAG AA in both themes.
14. Four tabs fit at 440, 390 and 375 pt wide and at 320 pt; the tab indicator is correct on every tab and the bar still hides on scroll down and returns on scroll up.
15. Reduce Motion: same states and colours, no movement. Reduce Transparency honoured.
16. Every string exists in English and Chinese; times are 24-hour.
17. The concept page's Friends section matches the shipped feature (section 16).

**Security**
18. A non-member, an ex-member, and an anonymous caller read nothing from any table or function except `invite_preview`'s minimal result. The Supabase security advisor shows no new warnings for these tables and functions.
19. The member cap (10), the group cap (3), code expiry, revocation and the join rate limit are enforced in the database.

## 14. Tests the PR must include

Follow the proportional rule in RELEASING.md, but a new feature with a new tab and new screens counts as a big layout change, so run the full sweep once before the first release.

- `tests/friends.test.js` (pure logic, Node): week list, status mapping for every row of the table in section 7, stale rule, day outcome from `S` (fast ended at 23:50 and 00:10, cheat day, Time off, no fast), plan label for 13, 16, 18, 20, 23, 24, 36 and custom, invite code normalisation and validation, "you first then join order, never by progress".
- Extend `tests/cloud.test.js` (its mock Supabase) with the new RPC calls: success, error, offline queue, and the code surviving the sign-in redirect.
- `tests/flow.test.js`: Friends tab hidden when the flag is off, present when on; signed-out state; create group, invite sheet, join with a code (mocked), tap a day, tap a person, Cheer, share off, leave. Remember the flow test flakes on slow sandboxes and fails in the first hours after midnight in Asia/Shanghai; rerun, and say so in the PR rather than skipping anything.
- **Database tests** as SQL files under `supabase/tests/` run inside a transaction that rolls back, setting the role and JWT claims for each case (`set local role authenticated; set local "request.jwt.claims" = '{"sub":"<uuid>"}'`). Must prove: non-member and ex-member cannot call `group_board`; sharing off returns `resting` and no progress; `group_board` never returns a timestamp column; limit of 10 and cap of 3 hold under two concurrent-style joins; expired, revoked and unknown codes give the same result; `anon` can call only `invite_preview`; cheers reject self, non-members, past days and idle targets. You can run these through the Supabase tools with `execute_sql`, since the dev sandbox cannot reach `supabase.co` from Node.
- `qa/run-app.js` scenarios for the new screens (add a `--screens=friends` style scenario). The alignment check is the one TEEBO cares about most.

## 15. Release rules (every change, no exceptions)

From RELEASING.md and AGENTS.md; they are the source of truth.

1. **Version.** Bump `js/version.js` (`0.MINOR.PATCH`) and `V` in `sw.js`. A feature or visible design change bumps MINOR; fix, copy, docs, chore bump PATCH. Another PR may have taken the next number, so fetch `main` first.
2. **CHANGELOG.md** entry at the top, plain language, saying what people will see, with its category (feature, fix, design, copy, docs, performance, chore).
3. **Commit and PR.** Commit message starts `feature: ... (v0.XX.0)`. The PR says in plain language what changed, why, and what was tested. Labels: `type: feature` (or the matching type) and an area (`area: app`, `area: concept`, `area: cloud`). Link an issue if you open one.
4. **Mirror on the concept page** (`concept/index.html`, strings switch with `data-zh`) in the same change: replace the "Coming later" Friends section and its example rows with the real thing (plan hours, no streak, Resting, Cheer), and add the Friends tab to the phone mockups.
5. **Merging.** TEEBO has said agents merge their own PRs. Make sure checks pass; if one fails, say so in the PR and to TEEBO before anything else; never merge over a red check; never skip or delete a test to get green. After merging, say what shipped and ask TEEBO to verify it live.
6. **Team change log.** After merging, add one bullet (`vX.Y.Z one plain sentence`) under your own name (Tengbo or Varun) and category on the Notion page [Team change log](https://app.notion.com/p/40b24bd28b8d81e39691c9baaf823107). If you cannot reach Notion, say so in the PR.
7. Do not add a build step, framework or dependency without asking. Never commit secrets or personal data. Never force-push `main`.

## 16. Concept page, Notion, docs

- Update `concept/index.html` as above. Run `NODE_PATH=$(npm root -g) node qa/run.js index.html concept` (about 1 minute, quick mode).
- The Lightly Notion workspace (root https://app.notion.com/p/40724bd28b8d81eaa756f46083b12bed) has a design-system page; add a short Friends note when the feature ships.
- Update `AGENTS.md`: the "Solo first" line says Friends is not built yet; change it when it ships. Keep README's layout section in step if you add files.

## 17. Suggested slicing (each is its own PR and version)

1. **Backend and logic, hidden.** `supabase/friends.sql`, `supabase/tests/`, `js/friends.js` with unit tests, `rpc()` in `cloud.js`. No UI. (PATCH or MINOR; ask TEEBO before applying SQL.)
2. **Friends tab behind a preview flag.** A Me switch "Friends (preview)" like the existing Ramadan preview; four-tab bar only when on; signed-out and empty states, name and avatar setup, create group, invite sheet.
3. **Group screen.** Strip, rows, discs, member sheet, Cheer, settings, leave, remove, report, polling.
4. **Invite page and join flow.** `?join=` handling, consent sheet, sign-in carry-through, errors.
5. **Launch.** Concept page and AGENTS.md, full alignment sweep, TEEBO confirms the five open decisions, remove the flag.

## 18. Open questions (ask TEEBO; do not guess)

1. Decisions 1, 2, 3, 5 and 6 in section 3 (defaults given).
2. **Custom email sending.** The default Supabase email sender is limited to a few emails an hour for the **whole project**. Friends makes sign-in part of every invite, so custom SMTP (for example Resend or Postmark) must be set up before launch.
3. **Account deletion.** App Store rules require in-app account deletion once an app can create accounts. Supabase cannot delete `auth.users` from the browser; it needs an Edge Function with the service role. Not needed for the web v1, needed before an iOS release.
4. **Sign in with Apple** is required on iOS if Google is offered. Deferred by TEEBO, but Friends makes accounts more prominent.
5. **China.** Friends needs Google or email; mainland users wait for the separate WeChat and phone track.
6. Multiple-group navigation and the invitee-before-onboarding order (section 6.3): confirm the recommendations or choose.
7. What Erase everything does to group memberships, and whether a "unwell" check-in counts as Resting (section 9).
8. 5:2 days: Not fasting or Resting.
9. Does the recipient of a Cheer see who sent it, or only a small sun and a count? (The design shows a small sun only.)

## 19. Reference

- Design mock: [friends-design.html](friends-design.html) · screenshots [EN light](friends-screens_en_light.png), [EN dark](friends-screens_en_dark.png), [中文 light](friends-screens_zh_light.png).
- Owner's standing rules: [AGENTS.md](../../AGENTS.md), [RELEASING.md](../../RELEASING.md).
- Existing sign-in and backup code: `js/cloud.js`, `supabase/schema.sql`, README "Sign-in and backup".
- Live app: https://kingtbo.github.io/Lightly-Fasting-App-Project/ · concept page: `/concept/`.
