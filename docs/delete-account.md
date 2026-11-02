# Delete account: how it works, and what Google Play asks for

## What happens when someone deletes their account

1. In the app (Me, Delete account, signed in only) or on the public page, the person confirms: 3 second lock, then a 2 second hold.
2. The app sends the person's own access token to the Supabase Edge Function `delete-account`.
3. The function checks the token, deletes that person's row in `lightly_state` (their backup, which also holds the profile picture and settings) and then the account itself (`auth.admin.deleteUser`), using the service role key Supabase gives the function. Nothing secret is in the app or this repo.
4. The app signs out and asks whether to keep or erase the fasts still on the phone. Failure at any step leaves the account as it was and the app says so.

What is **not** collected, so there is nothing else to delete: no names, no precise location (only a city name, never coordinates, goes to the backup), no analytics, no ads, no payments.

## The public page (Play Console needs a URL)

https://kingtbo.github.io/Lightly-Fasting-App-Project/delete-account/ (English and 中文, switch at the top). It names the app, lists the steps, and works without the app installed: sign in with Google or an email link, optionally download the backup, hold to delete.

## Play Console steps (Tengbo)

1. Play Console > your app > **App content** (under Policy and programs) > **Data safety** > Start.
2. **Data collection and security**: "Does your app collect or share any of the required user data types?" Yes, collected (not shared). Tick **Personal info > Email address** (account sign-in) and **App activity > Other user-generated content** or **Health and fitness > Health info** (fasting times and plan backed up to the account). Purpose for each: **App functionality** and **Account management**. Required, not optional, only for people who choose to sign in. Not shared with third parties.
3. "Is all of the user data collected by your app encrypted in transit?" Yes (HTTPS). "Do you provide a way for users to request that their data be deleted?" **Yes**.
4. **Delete account URL** (Data deletion section): paste the public page URL above. Also say that people can delete inside the app (Me, Delete account) and that deleting removes the account, backup and profile picture right away.
5. Save and submit with the next release. Also add the privacy policy URL in **App content > Privacy policy** (the page above does not replace it).

## Things only Tengbo can do

- Supabase: deploy the edge function (if the Supabase connector deploy in the thread did not already do it). Dashboard > Edge Functions > `delete-account` should show Active.
- Open question: Supabase may keep database backups for a few days on paid plans. If Play asks for a retention period, state what the Supabase plan does.
- Open question: a support email address on the public page, for people who can no longer sign in at all.
