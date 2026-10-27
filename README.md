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

## Run and check

```
python3 -m http.server 8000          # then open http://localhost:8000
node tests/core.test.js
NODE_PATH=$(npm root -g) node qa/run-app.js [shots-dir]   # needs Playwright; exits 1 on any alignment issue
```

Deploys with GitHub Pages from `main` / root.
