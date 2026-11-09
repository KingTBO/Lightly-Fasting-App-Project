# Lightly 轻伴

A fasting timer that follows the sky. Moon at night, sun by day, set by your real sunrise and sunset. Solo-first, English and 中文.

**Live:** https://lightly-fasting-app.tengbo-zhuang.workers.dev/ (open on a phone, then Add to Home Screen). The code lives on GitHub (this repository), with a backup copy on GitLab: https://gitlab.com/lightly-group/lightly-fasting-app. The old GitHub Pages address, https://kingtbo.github.io/Lightly-Fasting-App-Project/, serves the same code.

## Layout

- `index.html` + `css/` + `js/` is the app. No build step, no dependencies.
  - `js/core.js` sun maths, plans, long-fast unlock rules, streaks and cheat days (pure logic, tested in Node).
  - `js/app.js` the UI and the localStorage state.
  - `js/sphere.js` the 3D moon and sun (one WebGL shader, flat SVG fallback).
- `sw.js` + `manifest.webmanifest` make it installable and offline.
- `concept/` the design concept page and the moon/sun timer demo.
- `qa/run-app.js` the alignment check for the app (16 px margin, 44 pt targets, centring). `qa/run.js` is the older one for the concept page. Both run a quick sweep by default; add `--full` for every width, theme and language (see RELEASING.md for when).
- `tests/core.test.js` unit tests for the rules.

## Sign-in and backup (optional)

Everything works signed out; an account only backs up fasts and settings. Email sign-in is built (magic link by default, with an optional 6-digit code) on Supabase's REST API, with no SDK. It stays off until `js/config.js` has a project URL and anon key:

1. Create a free project at supabase.com. In the SQL editor run `supabase/schema.sql` (one table, Row Level Security so people only see their own row).
2. Authentication > Providers: keep Email on. The default Supabase email works as is: it carries a "Sign in" link, and the app tells people to tap it. Editing the template needs custom SMTP (a paid-plan or own-provider feature). Only if you set up custom SMTP and add `{{ .Token }}` to the Magic Link template, set `code:true` in `js/config.js` to also show a code field.
3. Authentication > URL Configuration: add `https://lightly-fasting-app.tengbo-zhuang.workers.dev/**` (with the two stars) to the redirect allow-list (keep the old GitHub Pages address there too, so it keeps working). The sign-in link carries a small copy of the person's settings and recent fasts in `?r=`, so if the link opens in a different browser it still lands on Today instead of onboarding; without the wildcard Supabase drops that and falls back to the Site URL.
4. Put the Project URL and the anon public key in `js/config.js` (the anon key is meant to be public; never the service_role key).
5. Delete account (one time): deploy `supabase/functions/delete-account` (Dashboard > Edge Functions, or `supabase functions deploy delete-account --no-verify-jwt`; it checks the person's token itself). Supabase hands the function its service role key at run time, so nothing secret is in the app or the repo. The public page people can use without the app is `delete-account/` (https://lightly-fasting-app.tengbo-zhuang.workers.dev/delete-account/); Google Play's Data safety form asks for that link. Steps for the form: [docs/delete-account.md](docs/delete-account.md).

Limits to know about: Supabase's built-in email sender is rate-limited on the free plan (a few emails per hour for the whole project), so the app has a 60 second "Send again" cooldown and a friendly message on 429. For real users, plug in an SMTP provider (Resend, Postmark, etc.) under Authentication > SMTP. A magic link signs in whichever browser opens it: if someone installed the app to the home screen but taps the link in Safari, Safari is signed in, not the installed app. Custom SMTP plus `code:true` fixes that case, since the code can be typed into the installed app.

Apple and Google buttons are placeholders, and WeChat and mainland phone sign-in belong to a separate China build (see the build plan).

## Run and check

```
python3 -m http.server 8000          # then open http://localhost:8000
node tests/core.test.js
NODE_PATH=$(npm root -g) node tests/flow.test.js
NODE_PATH=$(npm root -g) node tests/cloud.test.js --e2e   # merge rules + sign-in against a mock Supabase
NODE_PATH=$(npm root -g) node qa/run-app.js [shots-dir] [--full] [--screens=idle,ob]   # needs Playwright; quick by default (about 1 min); exits 1 on any alignment issue
```

Deploys with Cloudflare (Workers & Pages; no build command, the repo root is served as is). Cloudflare is currently connected to the `main` branch of the GitLab backup, so after a change merges to `main` on GitHub, the same commit also goes to GitLab `main` (a fast-forward push), and the site updates within a minute or two. To deploy straight from GitHub instead, reconnect the Worker's build to this repository in the Cloudflare dashboard (Settings, Build, Git repository). GitHub Pages is the previous home and serves the same files.

## Credits

The figures behind the star signs on the Friends screen (`img/sky/*.webp`) are processed from engravings in *Urania's Mirror* (Sidney Hall, London, 1825), which are in the public domain; the scans are on Wikimedia Commons (Category: Urania's Mirror). Each was inverted, turned into an alpha mask and softened at the edges, so the app can colour it. The same credit is in the Terms of Use, section 6.
