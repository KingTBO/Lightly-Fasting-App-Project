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

Everything works signed out; an account only backs up fasts and settings. Email sign-in is built (6-digit code or magic link) on Supabase's REST API, with no SDK. It stays off until `js/config.js` has a project URL and anon key:

1. Create a free project at supabase.com. In the SQL editor run `supabase/schema.sql` (one table, Row Level Security so people only see their own row).
2. Authentication > Providers: keep Email on. Authentication > Email Templates > Magic Link: include `{{ .Token }}` so the email carries the 6-digit code.
3. Authentication > URL Configuration: add the site URL (`https://kingtbo.github.io/Lightly-Fasting-App-Project/`) to the redirect allow-list.
4. Put the Project URL and the anon public key in `js/config.js` (the anon key is meant to be public; never the service_role key).

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
