# Releasing

Every change that goes to GitHub follows this, no exceptions.

1. **Version.** Bump the version in `js/version.js` (`0.MINOR.PATCH`). A feature or visible design change bumps MINOR; a fix, copy, docs or chore change bumps PATCH. Bump `V` in `sw.js` so installed copies update.
2. **Description.** Add an entry at the top of `CHANGELOG.md` in plain language, saying what people will see, with its category (feature, fix, design, copy, docs, performance, chore).
3. **Category.** Start the commit message with the type and version: `fix: line up the In season badge (v0.28.1)`. Open or reference an issue with the matching `type:` label (and an `area:` label), and link the pull request or commit to it.
4. **Concept page.** Anything users can see is mirrored on the concept page in the same change.
5. **Checks.** Run `node tests/core.test.js`, `node tests/import.test.js` and the flow test before pushing.

Labels: `type: feature`, `type: fix`, `type: design`, `type: copy`, `type: docs`, `type: performance`, `type: chore`; areas `area: app`, `area: concept`, `area: cloud`, `area: import`.
