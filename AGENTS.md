# AGENTS.md

Instructions for coding agents (Codex, Claude Code, and others) working on Lightly 轻伴, a fasting timer that follows the sky. The owner is TEEBO (GitHub: KingTBO). These are the same rules the Claude threads follow, so a change looks the same whoever made it.

Read these first instead of re-deriving them. This file only points at them and adds what they do not say:

- [README.md](README.md): what the product is, file layout, how to run it, sign-in setup.
- [RELEASING.md](RELEASING.md): the release rules. They are the source of truth for versions, changelog, labels and checks.
- [CHANGELOG.md](CHANGELOG.md): newest first; read the top few entries to see the house style.
- [concept/notes/index.html](concept/notes/index.html): platform and naming notes.

## What this repo is

A real, installable web app (PWA) at the repo root, deployed by GitHub Pages from `main`. No build step, no dependencies, no framework. Live: https://kingtbo.github.io/Lightly-Fasting-App-Project/

- `js/core.js` pure logic (sun maths, plans, long-fast unlock rules, streaks, cheat days). Unit-tested in Node. Put rules here, not in the UI.
- `js/app.js` UI and state (`localStorage` key `lightly:v1`). `css/app.css` styles. `js/sphere.js` the moon/sun.
- `js/cloud.js`, `js/config.js`, `supabase/schema.sql` optional email and Google sign-in with backup. Everything must keep working signed out. Never commit a `service_role` key or any secret; the anon key in `js/config.js` is public by design.
- `js/friends.js` the pure rules for Friends (what a phone shares, status words and discs, invite codes and links), tested by `node tests/friends.test.js`. `supabase/friends.sql` is its database (not applied to the live project until the owner says so); its tests run with `scripts/test-friends-db.sh` on a local Postgres. The Friends brief is `docs/friends/` once merged.
- `js/friends-ui.js` the Friends tab and its sheets (hidden behind the "Friends (preview)" switch in Me until launch); `js/qr.js` a small QR encoder for the invite (tests: `node tests/qr.test.js`, decodes with jsqr when installed with `npm i --no-save jsqr`); the browser test is `tests/friends-ui.test.js`.
- `js/import.js` imports fasts from other apps. Never put a user's export or password in the repo.
- `js/avatars.js` the profile-picture list (placeholder sky pictures designers can swap, see the comment at its top) and the crop maths. Tested by `node tests/avatars.test.js` (add `--e2e` with Playwright for the browser flow).
- `concept/` is the product landing page. `app/` is a redirect stub for an old URL; leave it.
- `.agents/` and `.claude/skills/` hold Supabase helper skills; do not edit them.

## Run and test

```
python3 -m http.server 8000                                   # open http://localhost:8000
node tests/core.test.js                                       # unit tests for the rules
node tests/import.test.js
NODE_PATH=$(npm root -g) node tests/launch.test.js         # opens from the saved copy on a slow network (service worker)
node tests/friends.test.js                                    # Friends rules (what a phone shares, words, discs, invite codes)
scripts/test-friends-db.sh                                    # Friends database privacy tests, on a throwaway local Postgres (psql and a running server)
NODE_PATH=$(npm root -g) node tests/friends-ui.test.js        # Friends tab in the browser against a mock Supabase (about 30 seconds)
node tests/qr.test.js                                         # QR encoder
node tests/avatars.test.js                                    # profile pictures (NODE_PATH set or --e2e also runs the browser flow)
NODE_PATH=$(npm root -g) node tests/location.test.js          # "Use my location" in setup: working state, one request, 8 s fallback, late fix, refusal (about 40 seconds)
NODE_PATH=$(npm root -g) node tests/setup-plan.test.js        # the plan step of setup: pre-selected plan, custom hours, start time, reminder, first-timer note and bounce (app and concept, about 1 minute)
NODE_PATH=$(npm root -g) node tests/swipe.test.js             # swipe right to go back in setup: backwards only, wheels left alone, Reduce Motion (about 1 minute)
NODE_PATH=$(npm root -g) node tests/wheel.test.js             # wheel pickers: momentum, snap at rest, looping, 24-hour columns, haptic ticks (about 1 minute)
NODE_PATH=$(npm root -g) node tests/cloud.test.js --e2e       # only if cloud or sign-in code changed
NODE_PATH=$(npm root -g) node tests/signin-return.test.js     # coming back from a sign-in link never shows Today (a few seconds)
NODE_PATH=$(npm root -g) node tests/body.test.js              # optional weight in onboarding: about you, units, skip, who keeps a weight (adults, no BMI cut-off), gender, the opt-out of the check-in, the monthly check-in (about 30 seconds)
NODE_PATH=$(npm root -g) node tests/care.test.js              # Care mode: health answers, plan caps, no streaks or cheat days, the 14-day wait (about 30 seconds)
NODE_PATH=$(npm root -g) node tests/flow.test.js              # end-to-end flows, about 2 minutes, needs Playwright
NODE_PATH=$(npm root -g) node qa/run-app.js --screens=idle    # alignment check for one scenario (idle, mid, goal, eat, empty, ob)
NODE_PATH=$(npm root -g) node qa/run.js index.html concept    # alignment check for the concept page
```

How much to test is set by the size of the change (RELEASING.md, step 5):

- **Every change:** the unit tests, the flow test, and a quick look at the screens you touched (a screenshot, or `qa/run-app.js --screens=...` for one scenario).
- **Full sweep (`--full`, 10 to 15 minutes):** only for big layout or design changes (a new or redesigned screen, new spacing rules) and before a bigger release. Do not run it for routine changes; the owner has said full sweeps are too slow.
- The flow test's onboarding steps sometimes flake on slow sandboxes, also on `main`. Rerun it, and say in the PR that it flaked and then passed. It also depends on the time of day: the test runs in Asia/Shanghai time (set `TEST_TZ=<zone>` to use another one, though some steps are timing-sensitive on a slow sandbox and can flake in any zone), and in the first hours after midnight there the edit-start-time step shows "Yesterday" instead of "Today" and fails on `main` too. If that is the only failure, say so in the PR. Never skip or delete a test to get green.

## Release rules (every change, no exceptions)

1. **Version.** Bump `js/version.js` (`0.MINOR.PATCH`) and the `V` cache name in `sw.js` (for example `lightly-v78` to `lightly-v79`) so installed copies update. A feature or visible design change bumps MINOR; a fix, copy, docs or chore change bumps PATCH. Check the top of CHANGELOG.md for the current version; another PR may have taken the next one.
2. **Changelog.** Add an entry at the top of `CHANGELOG.md` in plain language, saying what people will see, with its category: feature, fix, design, copy, docs, performance, or chore.
3. **Commit and PR.** The commit message starts with the type and version: `fix: line up the In season badge (v0.28.1)`. The PR description says in plain language what changed and why, and what was tested. Give the PR the matching label (`type: feature`, `type: fix`, `type: design`, `type: copy`, `type: docs`, `type: performance`, `type: chore`) and an area label (`area: app`, `area: concept`, `area: cloud`, `area: import`).
4. **Issue (optional but preferred).** Open a GitHub issue with the same labels for a change or fix and link it from the PR.
5. **Concept page.** Anything people can see in the app is mirrored on the concept page (`concept/index.html`, the product landing page) in the same change. Its text switches language with `data-zh` attributes.
6. **Merging.** TEEBO has said agents merge their own PRs; they do not need to merge for you. Make sure the checks pass first. If a check fails, say so in the PR and to TEEBO before doing anything else, and never merge over a red check. After merging, say what shipped and ask TEEBO to verify it live. Anything that is not a Lightly PR still needs TEEBO's go-ahead.

7. **Team change log.** Each contributor (and their agent) adds every merged change to the Notion page [Team change log](https://app.notion.com/p/40b24bd28b8d81e39691c9baaf823107) under their own name (Tengbo or Varun), in the matching category, newest first: version plus one plain sentence, for example `v0.49.1 Updated timer sound to the stock Android click`. Never write in another person's section. If you cannot reach Notion, say so in the PR so the owner can add it.

## Design rules

- **Apple's look on every platform.** Follow Apple's Human Interface Guidelines for visual style, motion and typography, on Android and the web as well as iOS. No Material styling. Apple celebrates with restraint (one object, real material, a ring closing), not colour washes, rays or gold gradients.
- **Alignment (checked by `qa/run-app.js`):** 16 px side margin, tap targets of at least 44 pt (except standard switches and inline links), icons centred with their labels, no clipped text, nothing outside the phone. Text contrast must meet WCAG AA in light and dark.
- **Motion:** honour Reduce Motion (same colours, no movement), and Reduce Transparency.
- **Today's vertical layout** uses weighted spacers (`.sp`, flex 1 : .5 : 1.5). When you change it, check 440x956, 390x844 and 375x667.
- **Wait for a pick.** TEEBO often publishes design options and chooses a letter. Do not build an option until it has been picked.

## Language: English and Chinese

Every user-visible string ships in English and Simplified Chinese (use the `L(en, zh)` helper in `js/app.js`; `data-zh` on the concept page). Add both in the same change, check the Chinese for length (it must not clip), and keep the tone calm.

## Product guardrails

These protect people who fast, and they are not up for trade-off:

- **Never share weight.** If weight is ever tracked, it is never shown to friends, groups or anyone else.
- **Never push past the person's own plan.** No nudge either way, nothing that grows past the goal. After the goal the timer keeps counting quietly; the app does not urge people to stop or to continue. Ending early stays kind (no red).
- **No food logging and no AI coach.** They were left out on purpose. Do not add them.
- **No health or weight gamification.** No fat-burn stages, no body or scale imagery. Rewards are for consistency, never for longer fasts.
- **Long fasts stay gated.** The 24 h and 36 h plans unlock with progress, and a safety flag means they are never offered. The rules live in `js/core.js` and are described in the CHANGELOG; do not loosen them.
- **Solo first.** Fasting alone is the main experience. Friends and groups are a small optional extra and are not built yet.
- **Privacy.** Location is used on the phone only, never uploaded or shared. Never say "where you are". Ramadan and other sacred fasts are free, calm, dry-fast aware, and the app never presents itself as a religious authority.

## Do not

- Add a build step, a framework or a dependency without asking.
- Commit secrets, keys, personal data or exports.
- Skip hooks or checks, rewrite history on `main`, or force-push.
- Change the product name, "Lightly" in English and "轻伴" in Chinese.
