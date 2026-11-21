# Lightly (轻伴) — Figma handoff package

Everything a designer needs to rebuild Lightly in Figma, generated from the running app (`index.html`, 390 × 844 pt, 28 Oct 2026 build).

## What is in here

| Folder | What it is | Editable in Figma? |
|---|---|---|
| `screens/<light\|dark>/<en\|zh>/*.svg` | Every screen and state as vector SVG: text is real text (one text layer per line), shapes are rectangles and paths, icons are vectors, layers are grouped and named. | Yes. Drag the file onto a Figma page. |
| `reference-png/<light\|dark>/<en\|zh>/*.png` | Flat pictures of the same states, 390 pt wide at 2x (780 px). Use as an overlay to check your rebuild. | No (images) |
| `tokens/tokens-studio.json` | Colours (light, dark, 7 sky moods), type styles, spacing, radius, motion, in Tokens Studio format. | Import with the free Tokens Studio plugin, then "Create variables / styles". |
| `tokens/figma-variables.json` | The same colours, spacing and radius as Figma collections and modes (Color: Light/Dark; Sky: 7 modes; Layout). | Needs a variables-import plugin or a short script (see below). |
| `tokens/tokens.json`, `tokens/tokens.css` | Plain JSON and CSS custom properties, the single source for developers. | n/a |
| `foundations/foundations-light.svg`, `-dark.svg` | One sheet with every colour swatch, the sky moods, type specimens and radii, named and editable. | Yes |
| `icons/*.svg` | Tab icons (Today, Days, Me, Today selected), chevrons, avatar, check. 24 pt grid, 1.7 pt round stroke, black (recolour with the `label` token). | Yes |
| `moon-sun/*.svg` | The moon and the sun at 0, 25, 50, 75 and 100 % (full = goal reached), plus the waning eating-window state. Lit area is a clip path on a gradient disc. | Yes |
| `tools/` | The scripts that produced all of this. Re-run them after any UI change (see the end). | n/a |

## Import into Figma (about two minutes)

1. Create a Figma file with two pages, `Screens Light` and `Screens Dark`. Make frames only if you want to group them; each SVG already carries its own 390 × 844 root.
2. Select all SVG files in a folder (for example `screens/light/en/`) in Finder or Explorer and drag them onto the canvas. Figma places each as a group. Ungroup once if you want a frame (Cmd/Ctrl + Alt + G wraps in a frame, then rename it).
3. Install the **Tokens Studio** plugin, load `tokens/tokens-studio.json`, and use "Styles & variables → Create variables". That gives you the Light and Dark modes and the text styles.
4. Fonts: install **SF Pro** (Text, Display, Rounded) from developer.apple.com/fonts, and **PingFang SC** (macOS has it). Android builds use Inter and Noto Sans SC. The SVGs name `SF Pro Text/Display/Rounded` first, with Inter as fallback, so Figma will use SF Pro where installed. If Figma shows "missing font", pick the replacement once for all.

## Layer names

Figma uses the SVG `id` as the layer name, so every group is named for what it is, in this pattern:

`Role/Visible-text`, for example `Button/Start-Fast`, `Row/Reminders`, `Card/Reminders`, `Sheet/Your-plan`, `TabBar`, `SegmentedControl`, `Switch`, `NavBar`, `LargeTitle`, `TimerReadout`, `Timeline`, `MoonSun`, `StreakCard`, `Chip`, `Badge`, `Calendar`, `Onboarding`. Inside a group you find `…/Fill`, `…/Text` and `…/Vector`. Roles map to the component list below. Spaces become hyphens. Duplicate names get a number suffix. The root group of each file is `Lightly/<state>/<theme>/<language>`.

## Screens and states (file names)

Onboarding: `01-onboarding-welcome`, `02`…`05-onboarding-step1…4` (fasted before, safety, plan, location).
Today: `10-today-idle`, `11-today-just-started`, `12-today-evening-moon`, `13-today-night-moon`, `14-sheet-edit-start-time`, `15-today-first-light`, `16-today-sunrise-turn` (moon turning into sun), `17-today-goal-reached`, `19-sheet-fast-saved`, `20-today-eating-window`, `24-today-ramadan`.
Plan sheets: `21-sheet-plans`, `22-sheet-plans-more`, `23-sheet-plans-ramadan`. Cheat days: `25-sheet-cheat-days`.
Days: `30-days`, `31-days-day-selected`, `32-sheet-edit-fast`, `33-sheet-add-fast`, `34-days-empty`. Import: `35-sheet-import`, `36-sheet-import-preview`.
Me: `40-me-signed-out`, `41-sheet-email-signin`, `42-sheet-location`, `43-sheet-unwell`, `44-sheet-erase`.
Files ending `-full-scroll` are the same screen on a 1700 pt tall phone so the whole scrolling list is visible (Days, Me, plan sheet).

## What cannot be native, and what to rebuild

Be clear about the limits. I cannot author a `.fig` file from here, so nothing is a real Figma component, auto layout frame, variant, or variable-bound fill yet. What you get are faithful vector layers.

- **Components:** the SVGs are flat. Rebuild these once as components with variants, then replace the pasted groups: Primary button (and the hold-to-end fill), Secondary / Dark / Destructive button, Chip, Segmented control (item, selected), Switch (on/off), List row (with value, chevron, stack with caption), Grouped card, Plan option (selected, badge), Streak card with dots, Tab bar (item, selected), Sheet (grabber, title, lede), Nav large title, Calendar day (done, ended early, cheat day, today, selected), Field, Toast.
- **Auto layout:** margins are 16 pt, rows 48 pt min, tap targets 44 pt min. Use the `space` tokens when you set up frames. The positions in the SVG are fixed pixels.
- **Variables:** colours in the SVG are baked hex values. After Tokens Studio creates the variables, bind fills to them (`label`, `card`, `tint`, …). Day/night sky is one variable collection with 7 modes.
- **Glass:** the tab bar, chips and streak card are frosted glass in the app (background blur 20–24 px). The SVG carries only the translucent fill. Re-add Background blur in Figma.
- **Shadows:** drop shadows are exported as effects. The inner highlight on the tab bar is not.
- **Moon and sun:** in the app they are a WebGL sphere (moon has a baked crater texture). The SVG uses the flat fallback, a gradient disc with a lit wedge. The reference PNGs show the same flat version. The real 3D look must be designed or captured from the app. The soft edge on the lit wedge uses a blur mask in the app and a clip path in `moon-sun/*.svg`.
- **Motion:** not in SVG. Values are in `tokens.json` under `motion` (spring `cubic-bezier(0.16, 1, 0.3, 1)`, sheet 500 ms open and 320 ms close, press 100 ms at 0.97 scale, hold to end 1.2 s). Figma Smart Animate can approximate them.
- **Fonts:** the screens were rendered with Inter (SF Pro is not available in the build environment), so line breaks and widths can differ a little from a real iPhone. The reference PNGs show the Inter look.
- **Not covered:** the finish celebration (bloom, check, sparks) is an animation, so it is not captured as a frame (see the motion values and `app.js` `celebrate()`), the signed-in Me tab (needs a live account), the Apple/Google sign-in sheets (stubs), the Friends tab (not built), push notification and widget designs (not built yet).

## Regenerating after UI changes

From the repo root, with Playwright installed:

```
node design-handoff/tools/tokens.js          # tokens from the source object (edit it when css/app.css changes)
node design-handoff/tools/icons.js
node design-handoff/tools/foundations.js
NODE_PATH=$(npm root -g) node design-handoff/tools/export.js          # all screens, 4 combos, about 20 minutes
SCHEME=dark LANG_ONLY=zh NODE_PATH=$(npm root -g) node design-handoff/tools/export.js 21   # one combo, states starting with 21
```
