# Lightly 轻伴

A fasting timer that follows the sky. Moon at night, sun by day, set by your real sunrise and sunset. Solo-first, English and 中文.

**Live:** https://kingtbo.github.io/Lightly-Fasting-App-Project/ (open on a phone, then Add to Home Screen)

## Layout

- `index.html` + `css/` + `js/` is the app. No build step, no dependencies.
  - `js/core.js` sun maths, plans, long-fast unlock rules, streaks and cheat days (pure logic, tested in Node).
  - `js/app.js` the UI and the localStorage state.
  - `js/sphere.js` the 3D moon and sun (one WebGL shader, flat SVG fallback).
- `sw.js` + `manifest.webmanifest` make it installable and offline.
- `concept/` the design concept page and the moon/sun timer demo.
- `qa/run-app.js` the alignment check for the app (16 px margin, 44 pt targets, centring). `qa/run.js` is the older one for the concept page.
- `tests/core.test.js` unit tests for the rules.

## Sign-in and backup (optional)

Everything works signed out; an account only backs up fasts and settings. Email sign-in is built (magic link by default, with an optional 6-digit code) on Supabase's REST API, with no SDK. It stays off until `js/config.js` has a project URL and anon key:

1. Create a free project at supabase.com. In the SQL editor run `supabase/schema.sql` (one table, Row Level Security so people only see their own row).
2. Authentication > Providers: keep Email on. The default Supabase email works as is: it carries a "Sign in" link, and the app tells people to tap it. Editing the template needs custom SMTP (a paid-plan or own-provider feature). Only if you set up custom SMTP and add `{{ .Token }}` to the Magic Link template, set `code:true` in `js/config.js` to also show a code field.
3. Authentication > URL Configuration: add the site URL (`https://kingtbo.github.io/Lightly-Fasting-App-Project/`) to the redirect allow-list.
4. Put the Project URL and the anon public key in `js/config.js` (the anon key is meant to be public; never the service_role key).

Limits to know about: Supabase's built-in email sender is rate-limited on the free plan (a few emails per hour for the whole project), so the app has a 60 second "Send again" cooldown and a friendly message on 429. For real users, plug in an SMTP provider (Resend, Postmark, etc.) under Authentication > SMTP. A magic link signs in whichever browser opens it: if someone installed the app to the home screen but taps the link in Safari, Safari is signed in, not the installed app. Custom SMTP plus `code:true` fixes that case, since the code can be typed into the installed app.

Apple and Google buttons are placeholders, and WeChat and mainland phone sign-in belong to a separate China build (see the build plan).

## Run and check

```
python3 -m http.server 8000          # then open http://localhost:8000
node tests/core.test.js
NODE_PATH=$(npm root -g) node tests/flow.test.js
NODE_PATH=$(npm root -g) node tests/cloud.test.js --e2e   # merge rules + sign-in against a mock Supabase
NODE_PATH=$(npm root -g) node qa/run-app.js [shots-dir]   # needs Playwright; exits 1 on any alignment issue
```

Deploys with GitHub Pages from `main` / root.
