# Releasing

Every change that goes to GitHub follows this, no exceptions.

1. **Version.** Bump the version in `js/version.js` (`0.MINOR.PATCH`). A feature or visible design change bumps MINOR; a fix, copy, docs or chore change bumps PATCH. Bump `V` in `sw.js` so installed copies update.
2. **Description.** Add an entry at the top of `CHANGELOG.md` in plain language, saying what people will see, with its category (feature, fix, design, copy, docs, performance, chore).
3. **Category.** Start the commit message with the type and version: `fix: line up the In season badge (v0.28.1)`. Open or reference an issue with the matching `type:` label (and an `area:` label), and link the pull request or commit to it.
4. **Concept page.** Anything users can see is mirrored on the concept page in the same change.
5. **Checks, in proportion to the change.** Every change: `node tests/core.test.js`, `node tests/import.test.js`, `node tests/cloud.test.js` (if cloud or sign-in code changed) and the flow test (about 2 minutes), plus a quick look at the screens you touched (a screenshot, or `node qa/run-app.js --screens=idle` for one scenario). The alignment sweeps run in quick mode by default (about 1 minute each): `node qa/run-app.js` and `node qa/run.js index.html concept`. Run the long `--full` sweeps (every width, theme and language, 10 to 15 minutes) only for big layout or design changes (a new screen, a redesigned screen, new spacing rules) and before a bigger release.
6. **Team change log.** After merging, add one short plain-language bullet (version, then one sentence) to the Notion page [Team change log](https://app.notion.com/p/40b24bd28b8d81e39691c9baaf823107), under your own name (Tengbo or Varun) and the matching category, newest first. Details stay in `CHANGELOG.md`.

Labels: `type: feature`, `type: fix`, `type: design`, `type: copy`, `type: docs`, `type: performance`, `type: chore`; areas `area: app`, `area: concept`, `area: cloud`, `area: import`.
