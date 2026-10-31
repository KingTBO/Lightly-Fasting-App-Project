# Changelog

Lightly (轻伴). Every change that reaches GitHub gets a version number, a plain description and a category. Newest first. See [RELEASING.md](RELEASING.md) for the rules.

Categories: **feature**, **fix**, **design**, **copy**, **docs**, **performance**, **chore**. Version numbers are `0.MINOR.PATCH` until the first public launch: a feature or visible design change bumps MINOR, a fix, copy, docs or chore change bumps PATCH. Versions up to 0.19.2 were assigned afterwards from the commit history, so they are approximate; each has a git tag and a labelled issue.

## 0.40.1
- **fix** Took back the screen-stretching part of 0.38.1. On TEEBO's iPhone it made things worse: the bottom of the tab bar was cut off at the edge of the page. The change that stays is that the colour behind the app now follows the screen (sky on Today, plain on Days and Me, light and dark), so the strip under the app is the same colour as the screen instead of navy. The strip itself is still being investigated: it looks like iOS gives the Home Screen app a page that ends about 62 pt above the bottom of the screen.

## 0.40.0
Round 3 of the "feel premium" pass: the concept page reads like a product page, not a spec sheet. The app itself is unchanged.
- **design** "How it reads at a glance" is now a real screenshot of the Today screen with four numbered points on it (the disc, the moon-or-sun line, the timeline, the big number), and a numbered list beside it, instead of four equal cards.
- **design** The remaining card grids ("Playful, never pushy", "New in the app", and the notes on the moon and sun) are now one running list with a hairline between rows, so the lines can be as long or short as the idea needs. The "Try the import" and "Watch it" buttons stay with their rows.
- **design** The "Apple's look, Android first" table and the name and version notes moved off the page to their own page at /concept/notes/, since only people building the product need them. The page keeps a short "Sample content" note and a link there.
- **design** The phone demos now show the same three tabs as the app (Today, Days, Me). The Friends tab is gone from the mocks, and the Friends section says the feature is coming later instead of pointing to a tab that does not exist.

## 0.39.0
Round 3 of the "feel premium" pass: onboarding steps that show the product.
- **design** The plan step now has a small moon in the empty space above Continue. The lit wedge is the share of the day you would fast, so 16:8 lights two thirds, with a line under it, for example "16 h of fasting, 8 h to eat. Start now and you finish at 8:12 AM." Pick another plan and the wedge slides to match and the time updates.
- **design** For people who have fasted before, the "Make it yours" step shows the same preview and updates live as you turn the start-time wheel: "From 8:00 PM, a 16 h fast ends at 12:00 PM." The "You're set" step now draws your plan's wedge, filling counter-clockwise like the real disc, instead of an old moon-phase shape.
- The safety and "have you fasted before" steps stay plain on purpose. The concept page's setup steps match, including the wedge.

## 0.38.1
- **fix** On iPhone, a dark navy band sometimes showed under the tab bar when Lightly was opened from the Home Screen, so the app did not fill the screen. Two changes: the colour behind the app (and the status bar) now always follows the screen you are on (sunrise, sunset, night, and the Days and Me tabs in light or dark), so even a gap would not show a different colour; and when the phone lays the page out shorter than the screen, the app now stretches to the full screen height, so the tab bar sits above the home indicator as designed. If the band is still there, tapping the version line at the bottom of Me shows the screen numbers. The concept page did not change.

## 0.38.0
Round 3 of the "feel premium" pass: a quieter, clearer end of a fast.
- **design** When you end a fast early, the moon now holds the phase you reached for a short beat before the summary opens, instead of jumping straight to the eating window. A fast that reached its goal keeps its celebration as before.
- **design** The summary says what you did against what you aimed for: the hours count up to their value, with a line under them, "of your 16 h goal" when you ended early and "Your 16 h goal, reached" when you made it. The Chinese wording follows.
- **design** "Start Eating Window" is now "Start eating window", and the concept page's summary sheet uses the same sentence case, the same line under the hours, and "Ended early" as its title.

## 0.37.0
Round 3 of the "feel premium" pass: one haptic and sound vocabulary.
- **design** Sound and vibration were already on by default; now they follow one fixed vocabulary so the same thing always feels the same. A tiny tick on every wheel detent. A light tap for touches (pressing the disc or the main button, switches, tab changes, Undo). A small tap when the hour turns. A medium tap when a fast starts or when a hold completes. A success pattern with a soft chime when you reach your goal. Nothing fires on routine saves.
- **design** The only sound in the app is now that one soft chime. The hourly tick, the start tone, the save tone and the drag blip are gone. Turning Sound on plays the chime once so you know what you chose. Phones that can't vibrate, such as iPhones in the browser, simply stay silent and still. The Me switch for Vibration only appears where the phone supports it.
- The concept page matches: one chime, the same taps, and the Sound note now says "One soft chime when you reach your goal".

## 0.36.0
- **design** The plan button at the top right of Today now shows the fasting hours, for example "13h", "16h", "18h" or "24h" (16小时 in Chinese), because testers said "16:8" and "13:11" look like a clock. A custom plan shows its own hours ("17h"), and Ramadan still says Ramadan. The plan sheet keeps the 16:8 style names, with the eating hours, since it is a list of plans and not a time. The concept page matches.

## 0.35.1
- **fix** On the concept page, the small progress icons in "Jump to a moment" (Start the fast, Hour 5, Hour 9, Sunrise, Reach the goal, Finish and celebrate, End and eat, and the Ramadan list) still showed the old moon-phase shapes. They now show what the app shows: a wedge of light that fills counter-clockwise from the top, and unwinds the same way while eating. The wording changed from "crescent" and "thin sliver" to "the disc starts to fill from the top", in English and Chinese. The Ramadan phone preview and the "Fuller means closer" card, and the 3D notes, follow. The app itself did not change.

## 0.35.0
- **design** The progress bar on Today now marks the moment the moon turns into the sun, or the sun into the moon, for example "Sunrise 6:08 AM" above the line at the right spot. This was on the concept page from the start but had never been added to the app. It shows during a fast and during the eating window when a sunrise or sunset falls inside it, and not before you start or in Ramadan, which runs dawn to sunset. The Chinese wording is 日出 and 日落.

## 0.34.0
Round 2 of the "feel premium" pass: Days.
- **design** The two stat tiles ("Longest streak" and "Fasts completed") are replaced by one quiet line under the streak ring, for example "7 fasts this month · longest streak 3 days". The milestone chips stay.
- **design** Before your first fast, Days shows no zeros. You see one line ("Fasts you finish show up here as filled days.") and one button, "Start a fast", with the calendar greyed out and no legend.
- **design** A past day with nothing on it says "Nothing logged" and offers two rows with icons: "Add a fast" and, when it is allowed, "Use a cheat day" (hold to confirm, like on Today). A future day still says "Nothing here yet."
- The concept page's Days screen is a static picture of a busy month, so it did not change.

## 0.33.0
Round 2 of the "feel premium" pass: one sheet pattern.
- **design** Every sheet now closes from its title row with a round X (the same as on the concept page) instead of a Cancel, Close or Done pill at the bottom. A sheet keeps one primary button: Save, Choose a file, Send sign-in link and so on. Sheets that only show information or choices have no bottom button at all. The grabber and swipe still work. Sign out and Erase everything keep their Cancel because they are questions you must answer.
- **design** Editing a fast no longer ends in three stacked pills. Delete this fast is a red row inside the form, and deleting shows a toast with Undo for about five seconds that brings the fast back, including on your other devices.
- The concept page's sheets already close from their title row, so it needed no change.

## 0.32.0
- **design** The cheat days sheet is much shorter. It says what a cheat day is in one line, shows how many you have left, and gives the Monday refill in one short sentence. The four rule lines that repeated each other are gone, and the reason a cheat day can't be used today still shows when it applies. The Chinese wording follows.
- **design** Using a cheat day now takes a press and hold, the same gesture as ending a fast, so a stray tap can't spend one. The button fills as you hold and says "Hold to use a cheat day". A short press does nothing. The concept page matches.

## 0.31.0
Round 2 of the "feel premium" pass, second part: the browser's own date, time and list controls are gone.
- **design** Start times (when you edit a running fast, or edit or add a past one), your usual start time and the nearest city in setup now use Lightly's own wheels. A row shows the value in a small capsule with tabular numerals; tap it and a wheel opens in place with a day, hour, minute and AM or PM column that snap, scroll by touch, mouse wheel or arrow keys, and follow the language. The same look on every phone and browser, with no system popup.
- The concept page's setup steps use the same wheels, and the flow tests drive them by scrolling.

## 0.30.0
Round 2 of the "feel premium" pass, first part: a calmer Today readout.
- **design** On Today, the other timer value (Elapsed or Left) moves up onto the label line beside "Time left", so the number stands alone with one line above it instead of one above and one below.
- **design** The hint under the timer only shows at moments: when a stage changes, at each new hour, and when you open the app. It fades out after about six seconds. Most of the time you see just the moon and the number. Notes that carry a fact (your plan before you start, a break in progress) stay.
- **design** The streak card stays hidden until your first fast is saved. After that it says what is true now ("3 days in a row" or "No streak running") and the cheat-day count lives only inside its sheet.
- The concept page matches.

## 0.29.1
- **fix** On "Is any of this true for you?" in setup, picking or clearing an option no longer makes the whole screen flash. The step was redrawing itself and replaying its entrance animation each time a note appeared or went away. Now only the note fades in. The concept page's setup has the same fix, and a flow test guards it.

## 0.29.0
Round 1 of the "feel premium" pass (colours, logo and type faces are unchanged).
- **design** The moon now hides the stars behind it, and no star sits on the text on Today. Stars that would land there fade out and come back when the layout moves.
- **design** One icon style: the edit mark next to the start time is a real icon (it was a text symbol), the tick on the location step is the same tick as everywhere else, chevrons and ticks share one line weight, and the Today tab shows a moon at night and a sun by day, following your real sky.
- **design** Rows with a second line (for example "Use my location / Stays on your phone") get more room above and below, and the app now uses one spacing scale (4, 8, 12, 16, 24, 32). On Today, the moon, label and number sit closer together, with more space before the timeline and the streak card.
- **design** Bold text is kept for the key item on each screen. The plan chip, the label above the timer, tab names, section headers, badges, weekday letters and secondary buttons are now medium weight.
- **design** The import step in setup shows a plain file icon instead of five coloured tiles that imitated other apps.
- **copy** "Start fast" and "Hold to end fast" are in sentence case like every other label.
- **copy** Zero units are left out: "1 h past your goal" instead of "+1 h 0 m over your goal", "16 h" instead of "16 h 0 m", and a saved 16-hour fast reads "16h". The Chinese wording follows.
- **copy** The Reminders note now says what you get: "You'll hear when you reach your goal, as long as Lightly was opened recently."
- The concept page matches (copy, tab icon, stars, weights, import step).

## 0.28.9
- **copy** The Time off descriptions are back in the pop-up sheet (Travel and I feel unwell), because the 0.28.8 change was on the wrong thing. The line under the Time off row in Me is removed instead. The concept page's Me row already had none.

## 0.28.8
- **copy** The Time off sheet is less packed: Travel and "I feel unwell" no longer have a description line under them, just the name and the arrow. The concept page matches.

## 0.28.7
- **fix** Switching Appearance no longer flashes the text on the sheet. Some parts faded with their own delay, so text passed through grey between black and white. Now every colour changes in the same instant and the blur stays steady. The concept page matches.

## 0.28.6
- **fix** Switching Appearance no longer makes the blur drop out and come back. The colours now fade together while the 4 px blur behind the sheet stays in place the whole time. The concept page matches.

## 0.28.5
- **fix** The Appearance sheet has the soft 4 px blur behind it again, with the lighter dim, so it looks like the other sheets while you can still see the colours change. The concept page matches.

## 0.28.4
- **fix** Switching between Today and the other tabs now changes the background colour at once. It used to fade over more than a second, because Today has the sky behind it and the other tabs a plain background. The screens still slide and fade as before.

## 0.28.3
- **fix** Switching Appearance is now a clean cross-fade of the whole screen. Some parts were still fading in on their own inside the cross-fade, so not everything changed at once. Now every part is in its new colours from the first frame. The concept page matches.

## 0.28.2
- **fix** Switching Appearance (Auto, Light, Dark) now fades the whole screen smoothly in one piece. Before, some parts changed instantly and others slowly, so it looked half-switched. With Reduce Motion it changes instantly.
- **design** The Appearance sheet now stays open after you choose, with a light dim and no blur, so you can see the change behind it. Close it with Done. The concept page's Appearance row now works the same way.

## 0.28.1
- **chore** The alignment checks are much faster: they now run a quick sweep by default (about 1 minute instead of 15 or more), run in parallel, and can be limited to some screens. The full sweep is still there with `--full`, for big layout changes and bigger releases. RELEASING.md says when to use which.

## 0.28.0
- **feature** "Continue with Google" is on the Me tab. It sends you to Google through Supabase and brings you back to the Me tab, with your fasts backed up and merged the same way as email sign-in. Until Google is switched on in the Supabase project, the button shows a short message and email keeps working. The concept page shows the button too.

## 0.27.1
- **fix** On Days, the date you tap is now clearly highlighted with a bold ring, including on the yellow filled days. Before, a tapped yellow day looked unchanged.
- **design** Days starts with no date selected, and the day description (and its fasts) appears only after you tap a date. Leaving and coming back clears the selection. The concept page matches.

## 0.27.0
- **design** Swiping between months is smoother: the old month slides away while the new one slides in beside it, carrying the speed of your swipe, and the card eases to the new height. The streak ring no longer redraws every time you change month or tap a day.
- **feature** Days has a round edit button at the bottom right. It slides in from the right once you tap a date: a pencil to change the fast on that day, or a plus to add one you forgot. It replaces the "Add a fast for this day" row under the calendar. The concept page matches.

## 0.26.0
- **feature** Days: swipe the calendar. Swipe right for earlier months, left for later ones; it follows your finger and springs back at the first and last month.
- **feature** Days: tap the month and year to open a floating picker over the blurred background, with a shortcut for every month and a year row. It appears only once you have more than one month of fasts, and only months with data can be chosen.
- **feature** The top of Days is now a milestone area: a ring that fills toward your next streak milestone (3, 7, 14, 30, 60, 100 days), plain-word numbers ("Longest streak", "Fasts completed"), earned milestone badges, and a "Your longest streak" badge when you are on a record. It replaces the three small numbers (streak, best, fasts).
- **design** The "Use a cheat day for this day" row is gone from Days, since cheat days live on the Today screen. The concept page matches all of this.

## 0.25.1
- **design** The blur behind sheets is lighter still, 4 px. The concept page matches.

## 0.25.0
- **design** The blur behind sheets is softer (6 px instead of 14 px), so the screen behind stays recognisable. The concept page matches.

## 0.24.0
- **design** Sheets now blur what is behind them instead of only darkening it: plans, Time off, edit times, cheat days, import and the rest. The dim is lighter, and the blur fades in and out with the sheet, including while you drag it down. With Reduce Transparency on, or where blur is unsupported, you get a plain darker dim instead. The concept page matches.

## 0.23.0
- **feature** Setup now ends with a "You're set" screen in the app too: your plan, how Lightly follows the sun, and when your first fast can start, then "Open Lightly". The concept page already had it; it now says "Sunrise and sunset".
- **design** The safety questions moved to the last step before that summary. If anything applies, the plan is set to 13:11 there and longer fasts stay off.
- **design** "Have you fasted before?" is fuller: four plan tiles (13:11, 16:8, 18:6, 20:4) light up as you choose, showing where you start and what opens later. No food or weight pictures. The concept page matches, and it no longer loses the Continue button after the doctor note.

## 0.22.2
- **fix** The Time off sheet no longer shows two huge black arrows. The Travel and "I feel unwell" options now have the small grey arrow every other list has, so their text has room again, in English and 中文, light and dark. The concept page shows the same arrows.

## 0.22.1
- **fix** Your precise location now really stays on the phone. The cloud backup and the sign-in link used to carry the saved coordinates; they now carry only that you use your location, and each phone keeps its own coordinates. A new phone signing in picks a nearby city until you allow location there.

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

