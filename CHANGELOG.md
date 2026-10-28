# Changelog

Lightly (轻伴). Every change that reaches GitHub gets a version number, a plain description and a category. Newest first. See [RELEASING.md](RELEASING.md) for the rules.

Categories: **feature**, **fix**, **design**, **copy**, **docs**, **performance**, **chore**. Version numbers are `0.MINOR.PATCH` until the first public launch: a new feature or visible behaviour change bumps MINOR, a fix or small polish bumps PATCH.

## 0.28.0 (2026-10-28)
- **fix** The yellow "In season" badge on the Ramadan row in the plan sheet now sits next to the title and lines up with it.
- **design** Progress now fills the disc as a wedge growing counter-clockwise from 12 o'clock with a soft edge, and unwinds the same way in the eating window. Sunrise and sunset keep the plain fade. (Earlier tries at a moon-to-sun sweep were replaced.)
- **feature** Finishing a fast that reached its goal plays a short celebration: the disc blooms like a sunrise, a check draws in, small lights drift out. The same for every fast length. Reduce Motion gets a soft fade. Also playable on the concept page.
- **feature** Onboarding has an optional "Bring your fasts with you" screen for people who have fasted before, with neutral 3D tiles and Skip for now.
- **design** The Card timer style is removed. Classic and Hero remain, Hero by default.
- **docs** The concept page gains a Days tab, Me settings that match the app, an Edit times sheet and a "New in the app" section.
- **docs** Added this changelog, release rules and issue labels.

## 0.27.0 and 0.26.0 (2026-10-28)
- **design** Experiments with a moon-to-sun sweep animation (clockwise, then counter-clockwise, then a timed animation). Superseded by 0.28.0.

## 0.25.0 (2026-10-28)
- **feature** Import from another app (Me, Your data): reads a Zero export (`firestore.json` or `biodata.json`), a Lightly backup, or any CSV or JSON with start and end times. Preview first, nothing added until you confirm, duplicates and overlaps skipped, the file never leaves the phone.
- **feature** The tab bar slides away when you scroll down and returns when you scroll up.
- **fix** Better fit on small and notched phones; the Start button no longer hides behind the tab bar on the smallest screens.
- **chore** iPhone launch images, a size readout (tap the Me footer) and a larger device matrix in the UI check, while investigating the strip at the bottom of the Home Screen app.

## 0.20.0 (2026-10-27)
- **design** Shooting stars now and then under the night sky.
- **design** Tabs use one blue accent; Me settings open pickers instead of cramped rows; the usual start time is aligned right.
- **design** Fluid tab bar with a gliding pill and screen cross-fade; smoother onboarding.
- **feature** The timer shows hours, minutes and seconds with rolling digits; three temporary styles; tap to swap left and elapsed.

## 0.15.0 (2026-10-27)
- **feature** Plan ladder: 13:11 first, 16:8 after three completed fasts, then the rest step by step; setup step for people who have fasted before; overtime display; editable end time.
- **copy** Plan rows lead with the fasting hours only.
- **fix** The Suggested badge aligns with the plan name.

## 0.10.0 (2026-10-27)
- **feature** Email sign-in and cloud backup on Supabase, with link-only emails, a sign-in link that restores your settings and lands on Me.
- **docs** The concept page doubles as the product landing page and mirrors the app.

## 0.1.0 (2026-10-27)
- **feature** First working web app at the site root: real timer, moon and sun by local sunrise and sunset, plans, Days, Me, onboarding, installable and offline.
