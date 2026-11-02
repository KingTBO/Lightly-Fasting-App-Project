# Home-screen and lock-screen widgets

Status: **design and plan only.** Nothing here is built. The designs are on the concept page at `concept/widgets/` (live: https://kingtbo.github.io/Lightly-Fasting-App-Project/concept/widgets/), and PNGs of every widget, light and dark, English and 中文, are in the Figma handoff pack (`widgets/`). Written 2026-11-02 for TEEBO.

## 1. The short answer

- **The web app cannot make a real widget on Android or iPhone.** Widgets are drawn by the phone's launcher from native code (Android App Widgets, iOS WidgetKit). A browser can only add an icon ("Add to Home Screen").
- So the widgets come with the **native Android app first**, then iPhone with the iOS release. This matches the build plan (Flutter, Android first).
- What the web app can still do today is small: the installed web app can show shortcuts when you long-press its icon on Android (manifest `shortcuts`), and it can notify while it is open. Neither is a widget, so we do not call them one. Not built; say if you want the shortcuts.

## 2. What a PWA can and cannot do (checked 2026-11-02)

| Platform | Widget from a web app? | Notes |
| --- | --- | --- |
| Android (Chrome, installed PWA) | **No** | Adds an icon and a launcher shortcut menu only. I found no widget support for Chrome on Android in the documentation I could reach; worth one more look right before launch. |
| iPhone (Safari, "Add to Home Screen") | **No** | Icon only. WidgetKit extensions exist only inside a native app. |
| Windows 11 (Edge, installed PWA) | Yes, but a different thing | Microsoft documents PWA widgets for the Windows 11 Widgets Board: a `widgets` array in the manifest, Adaptive Card templates, and a service worker that must do all updating. The page names Windows 11 as the only host. It does not help phones. Source: [Build PWA-driven widgets](https://learn.microsoft.com/en-gb/microsoft-edge/progressive-web-apps-chromium/how-to/widgets) (Microsoft Learn). |

If we ever wrapped the web app instead of using Flutter (Capacitor, or a Trusted Web Activity): a **Trusted Web Activity cannot feed a widget**, because the web page's storage is not readable by native code and a TWA has no JavaScript bridge. **Capacitor** can, with a small custom plugin that writes the widget snapshot (section 4) from JavaScript. Flutter remains the recommendation because the build plan, the moon/sun shader and the notifications all live there. See the build plan: https://claude.ai/artifact/VXemQFNbiax5XUzp3Yf2A3.

## 3. The widgets

All widgets use the app's flat moon/sun disc (not the WebGL one), the same filling wedge (counter-clockwise from 12 o'clock, waning the same way), tabular rounded digits, 24-hour clock, the app's language (not the phone's), and Apple-style colours. The surface follows the phone's light/dark setting. No Material You dynamic colour.

| Widget | Platform | Size | Shows |
| --- | --- | --- | --- |
| Small | Android 2×2, iPhone `systemSmall` | about 160 dp/pt square | Disc, plan chip, caption, big time, one line (ends at...). Whole widget opens the app. No button. |
| Medium | Android 4×2, iPhone `systemMedium` | about 340×160 | Bigger disc, caption, plan chip, big time, start/end times. **Start fast** button when Ready or in the eating window. |
| Lock Screen | iPhone `accessoryCircular`, `accessoryRectangular`, `accessoryInline` | system sizes | Single-colour disc and time left only. |
| Ongoing notification | Android | n/a | Already planned. Disc, time left, End/Open actions as designed. Lock-screen version is private: it only says "Lightly" and "Fasting". |
| Week (second wave) | Android 4×2, iPhone medium | | Streak, total fasts, seven dots (hollow star for a cheat day). Not on Ramadan mode. |
| Sky styles (later, Plus) | both | | Same widgets on the sky colours of Today. The timer widgets themselves stay free. |

Android phones do not show third-party widgets on the lock screen (some tablets do), so there the ongoing notification is the lock-screen surface. Re-check this at build time, Android changes it between versions.

### States (every widget)

| State | Disc | Caption | Big number | Tap |
| --- | --- | --- | --- | --- |
| Ready | Empty | "16-hour plan" | "Ready" | Open Today. Medium: Start fast |
| Fasting | Fills | "Time left" | Time left, ticking | Open Today |
| Goal reached | Full, stays full | "Goal reached" | Elapsed, still ticking | Open Today |
| Eating window | Empties | "Eating window left" | Time left in the window | Open Today. Medium: Start fast |
| Rest or break | Empty | "Day 2 of 5" | "Rest" or "Break" | Open Today, no Start button |

Moon or sun follows the user's local sunrise and sunset, exactly as in the app. Ramadan mode shows "Dawn to sunset" and "Sunset has come" (the same strings as the app), no streak, no plan chip. Copy comes from the app's own strings so English and 中文 stay identical (`L(en, zh)`).

After the goal the widget stays quiet: the disc stays full, the number keeps counting, and there is no colour change, no "stop now" wording and no widget notification. Extra time is not scored.

## 4. What the widget reads (the snapshot)

The app writes one small JSON object, "the snapshot", to storage the widget can read. It is rewritten on every change (start, end, edit start time, plan change, time off, language or theme change, app open) and once a day. The widget never reads the app's database.

```json
{
  "v": 1,
  "lang": "en",
  "mode": "fast",              // ready | fast | eat | break
  "planLabel": "16:8",         // null in Ramadan mode and on the lock screen
  "ramadan": false,
  "startMs": 1762108200000,    // epoch ms, null when not fasting
  "goalMs": 57600000,          // goal length
  "eatEndMs": null,            // end of the eating window, when mode is eat
  "eatLenMs": null,
  "breakDay": null,            // e.g. {"n":2,"of":5,"kind":"rest"}
  "skyChanges": [1762121400000, 1762160400000],  // next sunrise and sunset times (epoch ms), 3 days
  "firstSky": "moon",          // moon or sun right now
  "weekDots": ["on","on","on","cheat","on","on","today"],   // second wave only
  "streak": 7, "total": 42,    // second wave only
  "updatedMs": 1762152000000
}
```

Everything else is derived on the phone widget side: elapsed = now − startMs, left = goalMs − elapsed, disc fill = elapsed / goalMs, moon vs sun by comparing now with `skyChanges`. So a widget keeps being right even if the app has not run for a day. Sunrise and sunset times are computed in the app from the location the user already chose, and only the resulting times are shared, never coordinates, so no background-location permission is needed.

**Never in the snapshot:** weight, name, email, the user's photo, coordinates, safety or unwell flags, break reason (only "Rest" or "Break"), friends, account state.

**Where it lives.** Android: the app's private `SharedPreferences` (not exported). iPhone: an App Group container shared only with the app's own widget extension. Android and iOS widgets are signed with the app, so no other app can read them.

## 5. How it gets built

### Flutter (recommended)

- Use the [`home_widget`](https://pub.dev/packages/home_widget) package to write the snapshot and ask the widget to redraw (`saveWidgetData`, `updateWidget`), and its interactivity callback for the Start fast button. The widgets themselves are native: Android (Kotlin and XML, or Glance) and iPhone (SwiftUI in a WidgetKit extension). Flutter cannot draw inside a widget.
- The snapshot is built in Dart from the same rules as the app (`core.js` rules ported). One function, `buildSnapshot(state)`, covered by unit tests; golden test: the same inputs as `tests/core.test.js`.

### Android

- **Live number without updates:** a `Chronometer` in a `RemoteViews` layout counts down by itself (count-down mode, API 24+). The timer needs no app process and no polling. This is the one place Glance is awkward (it has no Chronometer of its own; it can wrap a RemoteViews layout), so version 1 uses classic `AppWidgetProvider` + XML for the timer text.
- **Disc:** pre-render about 72 frames of the disc (moon, sun, filling, waning) as drawables, and pick the frame from elapsed/goal. 16 h / 72 is about 13 minutes per frame, which is smooth enough; no custom drawing is needed in a widget.
- **Updates:** the system only refreshes on its own every 30 minutes at best (`updatePeriodMillis` is clamped to 30 minutes). Use that as a safety net, plus our own updates when the app changes the snapshot, plus an inexact alarm about every 10 minutes while a fast runs to move the disc. Avoid exact alarms (they need a permission).
- **Appearance:** use the system widget corner radius on Android 12+, fixed Lightly colours, and the system light and dark theme. Provide a preview layout and a description for the widget picker. Minimum tap target 48 dp.
- **Resizing:** small = 2×2 cells, medium = 4×2; also allow the user to resize to 3×2 by reflowing to the small layout.

### iPhone (WidgetKit, with the iOS release)

- **Live number:** `Text(timerInterval:countsDown:)` ticks in the widget without reloads.
- **Disc:** a timeline with one entry about every 10 minutes for the next 24 hours, each drawing the disc for its date. WidgetKit has a daily budget of roughly 40 to 70 reloads, so use long timelines and reload only when the snapshot changes.
- **Lock Screen** (`accessoryCircular`, `accessoryRectangular`, `accessoryInline`): single-colour drawing; disc and time only. Mark the plan or any text beyond the time `.privacySensitive()` so it hides when the user chooses to redact on the Lock Screen.
- **Start fast button:** iOS 17 interactive widgets with an App Intent. On iOS 16 fall back to opening the app with a link (`lightly://start`).
- **Live Activity and Dynamic Island** is a separate piece of work after the widgets (the concept page already shows it).

## 6. Tap actions

| Action | Where | How |
| --- | --- | --- |
| Open Today | Whole widget, every size, every state | Android: `PendingIntent` to the main activity. iPhone: `widgetURL(lightly://today)`. |
| Start fast | Medium widget when Ready or in the eating window | Starts a fast now with the user's current plan, then updates the snapshot. Android: broadcast to a receiver that calls into the Flutter background callback. iOS 17 and later: App Intent. Does nothing if a break is on; opens the app instead, and the app explains why (as today). |
| End fast | **Never from a widget** | Ending is a hold in the app, so a pocket tap cannot do it and the app never nudges either way. |
| Edit start time, plan, anything else | Never from a widget | Open the app. |

## 7. Privacy and safety

- The snapshot holds the minimum in section 4. It is never uploaded, and the widget makes no network calls.
- Fasting itself can be health-related for some people (the privacy policy treats the safety flag that way), so the **Lock Screen shows only the disc and the time**. No plan name, no streak, no cheat days, no Ramadan or break wording. Rest or break shows as "Rest" or "Break" on the home screen, never the reason.
- No widget notifications, no badges, no urgency colours, no wording that pushes past the plan. After the goal the widget is calm. No weight, no body imagery, no fat-burn stages, no food, no coach.
- Chosen language comes from the app setting.
- Accessibility: every widget has one spoken summary ("Fasting, 1 hour 28 minutes left, ends 10:30"), text scales with the system size, contrast meets WCAG AA in light and dark, widgets never animate (so nothing to turn off for Reduce Motion).
- The Google Play data safety form and the Apple privacy label do not change because of widgets: nothing new is collected.

## 8. Order of work

1. **Android small and medium** (about 1 to 1.5 weeks after the timer MVP exists, my estimate): snapshot, Chronometer, disc frames, Start fast, picker preview, light/dark, English and 中文. Ships with the closed beta.
2. **Android ongoing notification** polish (private lock-screen version).
3. **iPhone small, medium and Lock Screen** (about 1.5 to 2 weeks, plus the Swift/SwiftUI knowledge, with the iOS release). Needs the Apple Developer account first.
4. **Live Activity and Dynamic Island.**
5. **Week widget and sky styles** (Lightly Plus) once the free widgets are live.

Build first: Android small and medium.

## 9. Open questions for TEEBO

1. **Start fast button on the medium widget.** Recommended yes (ending stays in the app only). Say no if you want the widgets strictly read-only.
2. **Default look.** Recommended: clear white or dark surface that follows the phone, so it reads on every wallpaper. Sky colours become the Plus style.
3. **Long-press shortcuts in the web app** (Today, Days). Small and honest, available on Android today. Want it?
4. **China.** Xiaomi, Oppo and Vivo phones run normal Android widgets. Huawei's HarmonyOS uses its own "service cards", which belong to the separate China track.
5. **Check before launch:** whether Chrome on Android has begun to support PWA widgets, and whether Android lets apps put widgets on the lock screen of phones.
