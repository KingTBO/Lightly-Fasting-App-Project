# Vibration and the phone's silent mode

**Rule (TEEBO, 2026-11-03):** on Android, Lightly's vibration keeps working when the phone is on silent, the same way the system keyboard still buzzes when you type. Only the **Vibration** switch on the Me tab turns it off. Nothing in Lightly may look at the ringer or silent state.

## What the code does today (web app)

- All haptics go through one function, `buzz()` in `js/app.js`. Its only condition is `S.prefs.haptics` (the Me tab switch). It does not read the ringer, the silent switch or any other setting, and nothing else in `js/app.js` can suppress a vibration.
- The Me tab shows the Vibration switch only where the browser can vibrate (`canTick()`: `navigator.vibrate`, or iPhone Safari's tap workaround).
- Sound is different: the chime and the wheel tick are Web Audio, and iPhone Safari mutes Web Audio on the silent switch. That is why the code comment says the page follows the silent switch. It does not apply to vibration.

## What the web app cannot do

On Android, `navigator.vibrate()` is handled by the browser, not by us. Chromium's Android implementation (`VibrationManagerImpl.java`) only calls the vibrator when `AudioManager.getRingerMode() != RINGER_MODE_SILENT` (and the VIBRATE permission is held). This was read in the Chromium source at one older revision (commit 70adfd46…); newer revisions were not checked, and nobody has tried it on a real phone for this change. So in Chrome, and in an installed copy of the web app (also Chrome), **silent mode stops our vibration and we cannot override it from web code.** The keyboard is exempt because it uses the system's touch-feedback path, which the browser API does not reach.

Other limits: iPhone Safari has no vibrate API at all (the hidden `<input switch>` tap is a best-effort trick, see `tests/haptic.html`); desktop browsers do nothing; a phone with system touch feedback / vibration switched off stays quiet, which is the user's own system choice.

## What the Android app must do (not built yet)

Use the system haptic path, not the ringer-gated one:

- Standard taps and ticks (`select`, `light`, `medium`): `View.performHapticFeedback` (Flutter: `HapticFeedback.selectionClick()` / `lightImpact()` / `mediumImpact()`, which call it). These follow the system "touch feedback" setting, like the keyboard, not the ringer mode.
- Patterned buzzes (`success`, `nope`): `Vibrator.vibrate(VibrationEffect, VibrationAttributes.createForUsage(USAGE_TOUCH))` on Android 13+ (older versions: `AudioAttributes.USAGE_ASSISTANCE_SONIFICATION`). Touch-usage vibrations are governed by the touch-feedback setting.
- Keep the in-app Vibration switch as the only Lightly-level off.
- **Verify on real phones** (a Pixel and one Samsung or Xiaomi): ringer on, vibrate only, silent, and Do Not Disturb. The wheel ticks, a goal reached and the hold-to-end button must buzz in all four unless the switch is off.
