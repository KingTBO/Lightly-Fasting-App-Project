# Changelog

Lightly (轻伴). Every change that reaches GitHub gets a version number, a plain description and a category. Newest first. See [RELEASING.md](RELEASING.md) for the rules.

Categories: **feature**, **fix**, **design**, **copy**, **docs**, **performance**, **chore**. Version numbers are `0.MINOR.PATCH` until the first public launch: a feature or visible design change bumps MINOR, a fix, copy, docs or chore change bumps PATCH. Versions up to 0.19.2 were assigned afterwards from the commit history, so they are approximate; each has a git tag and a labelled issue.

## 0.22.0
- **design** The last onboarding step no longer asks "where you are". It is now "Match the sky to your day", says plainly that your location is used on this phone only to work out sunrise and sunset and is never uploaded or shared, and makes "Use my location" the main button. "Choose a city instead" is a quiet link underneath; the city list only appears if you ask for it or if location is not available.
- **copy** In Me, the row and sheet are now "Sunrise and sunset" (日出日落), with the same privacy wording and "Or choose a city" under the location button. The concept page matches, in English and Chinese.

## 0.21.5
- **design** The 3, 7, 10, 14 day quick picks now use a highlight that slides smoothly to the chosen day, and the day count, return date and arrows update in place instead of redrawing the sheet. With Reduce Motion it changes without sliding.

## 0.21.4
- **design** Travel sheet redesigned: a large day count with round minus and plus buttons, quick picks for 3, 7, 10 and 14 days, a divider above the return date, and a Back button. The unwell sheet also has Back now.
- **feature** While you are on a break, Today says "Break" (travel) or "Rest" (feeling unwell) with the day count, instead of "Ready". Start Fast is greyed out and cannot be pressed, a short line explains why, and the pill at the top reads "End break". The timeline is hidden during a break.
- **fix** The break pill showed the day count without "days" in Chinese.

## 0.21.3
- **design** The I feel unwell card uses a plain heart icon, without the bandage.

## 0.21.2
- **design** Time off cards use drawn icons again (a plane and a heart with a bandage) instead of emoji, so they look the same on every phone.

## 0.21.1
- **design** Time off uses the ✈️ and ❤️‍🩹 emoji for Travel and I feel unwell instead of line icons, in the app and on the concept page.

## 0.21.0
- **feature** New Time off sheet in Me, under Care (it replaces "I feel unwell"). Choose Travel and pick 1 to 14 days, or choose I feel unwell and a two-week break starts right away. A pill on Today shows which day of the break it is, and you can end the break early from there or from Me.
- **feature** Break days keep your streak, like cheat days, without growing it. They show as dotted days in the calendar. A break for feeling unwell also keeps long fasts paused for the two weeks, even if you end it early.
- **design** The big titles Today, Days and Me at the top of each tab are gone.
- **chore** Removed the Plan row in Me (the plan is still changed from the chip on Today) and the Redo setup row.

## 0.20.0
- **design** The app now has one accent: the sun yellow. The selected tab, links, back buttons, calendar arrows, check marks and tick boxes no longer use system blue. In light mode links and the selected tab use dark ink and a deep amber, because yellow text is too faint on white.
- **design** On Today the stars no longer run through the time and the sentences under the moon, and they no longer show across the moon itself. Secondary text on the night sky is a little brighter.
- **design** The floating tab bar has a plainer selected pill, slightly larger labels (larger still in Chinese), and content now fades out under it instead of being cut off.
- **design** Me: Usual start time shows "Not set" like any other row until you choose a time, instead of a blank browser time field. The Timer style row is gone (the large light numerals stay).
- **copy** Locked plans in onboarding say "After 3 fasts" instead of "Opens as you go".

## 0.19.4
- **chore** (this change) Added `scripts/tag-history.sh`, which creates the version tags for the past changes. The tags could not be pushed from the automated session, so they need to be pushed once from a normal clone.

## 0.19.3
- **docs** (this change) Past changes now carry version numbers, tags, releases and labelled issues. Version numbers before this one were assigned afterwards, so they are approximate.

## 0.19.2
- **docs** (commit 3ccf32e) Added the changelog, release rules, a version number and issue labels.

## 0.19.1
- **fix** (commit 60993a9) The In season badge on the Ramadan plan now lines up with its title.

## 0.19.0
- **design** (commit 836163e) Progress now fills the disc as a wedge growing counter-clockwise from 12 o'clock, and unwinds the same way while eating.

## 0.18.0
- **design** (commit 7391f02) Made the sweep a visible animation (replaced later).

## 0.17.0
- **design** (commit 448655a) Made the sweep counter-clockwise (replaced later).

## 0.16.0
- **design** (commit 90a9918) First try at a clockwise moon-to-sun sweep (replaced later).

## 0.15.1
- **docs** (commit c532ddb) The concept page gains a Days tab, Me settings that match the app and an Edit times sheet.

## 0.15.0
- **feature** (commit b456df8) Removed the Card timer style and added an optional import step to onboarding.

## 0.14.1
- **docs** (commit 901c401) The concept page can play the celebration and has a 'New in the app' section.

## 0.14.0
- **feature** (commit 1cfcd72) A short celebration when a fast reaches its goal.

## 0.13.4
- **fix** (commit 861c194) Undid the stretch, added iPhone launch images and a size readout in the Me footer.

## 0.13.3
- **fix** (commit bb7f45f) Tried stretching the app to the real screen height in Home Screen mode (later undone).

## 0.13.2
- **fix** (commit da5ba83) Tried filling the whole screen on phones to remove the strip at the bottom of the Home Screen app.

## 0.13.1
- **chore** (commit 12ef375) Added the Supabase agent skills to the repository.

## 0.13.0
- **feature** (commit 40b15b8) Import fasts from Zero and other apps, the tab bar hides while you scroll down, and better fit on every phone size.

## 0.12.0
- **design** (commit 9fe7aee) Shooting stars now and then under the night sky.

## 0.11.0
- **design** (commit 4574cdd) One blue accent for the tabs, Me settings open as pickers, and the usual start time is aligned right.

## 0.10.0
- **design** (commit 96774a5) A fluid tab bar with a gliding highlight, smoother screen changes and smoother onboarding.

## 0.9.0
- **feature** (commit 29f4134) The timer shows hours, minutes and seconds with rolling digits, with temporary style choices.

## 0.8.0
- **feature** (commit 3573d66) Plans open step by step (13:11 first, 16:8 after three fasts), a setup step for experienced fasters, overtime display and editable end times.

## 0.7.5
- **copy** (commit 2b23cda) Plan descriptions show only the fasting hours, and the Chinese plan names match the app.

## 0.7.4
- **copy** (commit b3f4df1) Plan rows lead with the fasting hours.

## 0.7.3
- **fix** (commit a24bc7f) The Suggested badge now lines up with the plan name in onboarding.

## 0.7.2
- **fix** (commit 3a9f08b) After a sign-in link you land on the Me tab.

## 0.7.1
- **fix** (commit 481f110) After a sign-in link, your onboarding choices are kept so you are not asked again.

## 0.7.0
- **feature** (commit 61e7d88) Turned on cloud backup for the live project.

## 0.6.0
- **feature** (commit bc861d0) Email sign-in now works with link-only emails, with a resend timer and a clear expired-link message.

## 0.5.4
- **chore** (commit 9aac783) Made the database setup safe to run again and limited access to signed-in people.

## 0.5.3
- **fix** (commit 79de577) Fixed a stray style rule left behind on the concept page.

## 0.5.2
- **docs** (commit e5879df) Removed the 'Not Boring Weather' section from the concept page.

## 0.5.1
- **docs** (commit 8add621) The concept page now mirrors the app and works as the landing page, with Open the app buttons.

## 0.5.0
- **feature** (commit 0608a98) Optional email sign-in and cloud backup (switched off until configured).

## 0.4.1
- **fix** (commit 56d67e8) The streak card no longer collides with the Start button on shorter phones.

## 0.4.0
- **design** (commit f7f274a) Welcome screen: one name per language and an animated moon you can touch.

## 0.3.0
- **design** (commit 48c45bc) A design pass: clearer text contrast, steadier motion, focus rings and sheets that drag smoothly.

## 0.2.2
- **fix** (commit 2e3cdd4) Fixed the welcome icon and its centring, and added icon and centring checks.

## 0.2.1
- **chore** (commit 9b39478) Added automatic end-to-end tests, and fixed the wording to 'hour to eat' in the singular.

## 0.2.0
- **feature** (commit c0cce62) The site root becomes a working app: a real timer, a sky that follows sunrise and sunset, plans, a Days calendar, a Me tab and first-time setup.

## 0.1.0
- **feature** (commit ad0213f) First installable version: a timer you can add to the Home Screen, with icons and offline support.

