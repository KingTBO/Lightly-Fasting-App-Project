# Privacy policy and terms: how they work, and what is still open

Public pages (English and 中文, switch at the top, or add `?lang=zh`):

- Privacy Policy: https://kingtbo.github.io/Lightly-Fasting-App-Project/privacy/
- Terms of Use: https://kingtbo.github.io/Lightly-Fasting-App-Project/terms/

Both are **drafts for a lawyer to review**, marked so at the top. They are written from what the app really does (checked in the code on 2 November 2026) and are not legal advice. The files are plain HTML (`privacy/index.html`, `terms/index.html`), styled by `legal/legal.css`, language switch in `legal/legal.js`. The Me tab links to them (About group) and so do the delete-account page and the concept page.

## Real data practices the privacy page is based on (re-check when these change)

- Signed out: everything lives in the phone's own storage (`localStorage` key `lightly:v1`). Nothing is sent to us.
- Location: the phone gives coordinates, rounded to 0.01 degree, used only on the phone for sunrise and sunset. `scrub()` in `js/cloud.js` removes them from every backup and sign-in link, so only a city name leaves the phone.
- Signed in: Supabase (project in Ireland, eu-west-1) holds the account (email, plus Google name and photo address if Google is used) and one `lightly_state` row per person: fasts, plan, goal, cheat days, time off, settings, display name, profile picture (256 px copy, or which sky picture), city name, and `profile.safety`.
- `profile.safety` is one yes/no flag. The individual answers to the safety questions (pregnant or breastfeeding, diabetes medication, past eating disorder) live only in memory during onboarding and are not saved. The flag is health-related and is in the backup on purpose: without it a new phone would offer long fasts to someone who was meant not to see them.
- No ads, no analytics, no crash reporting, no cookies, no third-party scripts or fonts. Third parties that see data: Supabase (account, backup, sign-in email), Google (only if "Continue with Google"; the app also loads the Google photo from Google), GitHub Pages (hosts the app; sees IP addresses).
- Deletion: in-app Delete account and the public delete-account page remove the account, backup and profile picture at once (Edge Function `delete-account`). See `docs/delete-account.md`.
- No weight, no food, no payments, no contacts, no camera or microphone (the photo picker only reads the one photo chosen).

If a change touches any of these (analytics, a new field in the backup, a new service, payments, friends), update the privacy page in the same change, and the Play Data safety form.

## What only the owner can decide or supply

Highlighted `[bracketed]` items on both pages:

1. Legal entity name and postal address (Play requires the entity named on the store listing to appear in the policy).
2. A privacy contact email and a support email (also wanted on the delete-account page).
3. Governing law and court for the terms.
4. Retention periods: how long Supabase keeps database backups after a deletion (depends on the Supabase plan), and how long logs are kept.
5. Whether Lightly launches in mainland China at first. The PIPL wording is a placeholder; Android-first outside mainland China avoids the cross-border consent and local-rule work for now.
6. The 18+ age limit (assumed in both pages).
7. For EU/UK users, explicit consent for the health-related backup: a line at sign-in ("Back up my fasts to my account; this includes health-related information") is the usual way. Not built yet; ask the lawyer for the exact words, then it is a small app change.

## Google Play steps (owner)

1. Play Console, App content, **Privacy policy**: paste the privacy URL above. It must be a public page (not a PDF), and the app must also link to it (the Me tab About group does).
2. App content, **Data safety**: must match the policy (see `docs/delete-account.md`; add that the app does not collect location off the device).
3. App content, **Health apps declaration**: Lightly is a fitness and wellness timer, not a medical device. The Terms already say so.
4. Data deletion URL: https://kingtbo.github.io/Lightly-Fasting-App-Project/delete-account/
5. Keep the developer name on the listing identical to the entity named in the policy.
