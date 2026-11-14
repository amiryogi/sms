# Build and deployment

How to build the app for phones and publish it. Builds run on Expo's servers (EAS), so no
Mac or Android Studio is needed, including for iOS.

## Before the first build: decide these

| Item | Now | Why it matters |
|---|---|---|
| App name | "Vidyalaya SMS" (`app.config.ts`) | Shown under the icon and in the stores |
| Bundle id / package | `com.vidyalayasms.app` (placeholder) | **Can't be changed after the first store release.** Use a domain the school or company owns, for example `np.com.<company>.sms` |
| Icon and splash | Expo's defaults in `assets/` | Replace `icon.png` (1024×1024), `android-icon-*.png`, `splash-icon.png` with the product's artwork |
| API URL | `https://sms.nevanhandicraft.com.np/api/v1` in `eas.json` | Preview and production builds talk to it |
| One app or one per school | One app; the school code on the sign-in screen picks the school | A white-label build per school would need its own bundle id and icon |

## Environments

| `APP_ENV` | Bundle id suffix | API URL from | Plain HTTP allowed |
|---|---|---|---|
| `development` | `.dev` | your `.env.development.local` (read by Metro) | yes, for a LAN backend |
| `preview` | `.preview` | `eas.json` | no |
| `production` | none | `eas.json` | no, and the build fails without `https://` |

`EXPO_PUBLIC_*` values are inlined into the app and are public: only the API URL goes there,
never a secret. The three variants can sit on one phone side by side.

## One-time set-up

```bash
cd mobile
npx eas-cli@latest login          # the school's or company's Expo account
npx eas-cli@latest init           # creates the EAS project
```

`eas init` prints a project id. Because the config is `app.config.ts` (dynamic), add it by hand:

```ts
// app.config.ts, inside the returned object
extra: { appEnv: APP_ENV, eas: { projectId: "<the id>" } },
owner: "<expo account or organization>",
```

For a CI server, create an access token in the Expo dashboard and set `EXPO_TOKEN` instead of
logging in.

## Push notifications

Push needs a **development or release build**. Expo Go cannot receive push on Android, and the
app shows "Not available on this device" there (More → Notifications).

1. **Project id.** The app reads it from the `EAS_PROJECT_ID` environment variable (or the
   `extra.eas.projectId` you added above). Without it the More screen says "Not set up in this
   version of the app".
2. **Android (Firebase Cloud Messaging):**
   - create a Firebase project and add an Android app with the package name from
     `app.config.ts` (one per environment suffix you build);
   - download `google-services.json` into `mobile/` and set the `GOOGLE_SERVICES_JSON`
     environment variable to its path (`./google-services.json`) for the build; `app.config.ts`
     passes it to `android.googleServicesFile`. `.gitignore` excludes the file, and EAS Build
     uploads only files git tracks, so for cloud builds store it as an EAS file variable named
     `GOOGLE_SERVICES_JSON` (see "Environment variables" in the EAS docs). It holds public
     identifiers only, so the alternative is to remove it from `.gitignore` and commit it;
   - in Firebase (Settings → Service accounts) generate a private key, then run
     `npx eas-cli@latest credentials` → Android → production → Google Service Account →
     "Manage your Google Service Account Key for Push Notifications (FCM V1)" → set up →
     upload the key. Expo uses it to deliver. This key is secret: never commit it.
   - Source: https://docs.expo.dev/push-notifications/fcm-credentials/
3. **iOS:** `npx eas-cli@latest credentials` creates the APNs key (needs the Apple Developer
   account). Push does not work in the iOS simulator.
4. **Server:** apply the migration (`npm run db:migrate:deploy`) and restart. Nothing else is
   needed: it sends through Expo. See `PUSH_ENABLED` and `EXPO_ACCESS_TOKEN` in
   `backend/.env.example`.
5. **Try it:** sign in on the phone as a parent and allow notifications; More → Notifications
   says "On for this phone". On the web, publish a notice for that child's class. The phone
   shows it within a few seconds; tapping it opens the notice.

What is sent, and to whom: notice published (its audience); assignment published and work graded
(the section's students and their parents); report cards published (same); a student marked
absent today (parents). A notification holds a title and one line, never marks or amounts.

## Builds

| Purpose | Command | Result |
|---|---|---|
| Try it on Android phones | `npx eas-cli build -p android --profile preview` | an APK link to install directly |
| Develop with native modules | `npx eas-cli build -p android --profile development`, then `npx expo start` | a dev client that loads your local code |
| iOS test build | `npx eas-cli build -p ios --profile preview` | needs an Apple Developer account ($99/year); EAS manages certificates; install through TestFlight or registered devices |
| Store release | `npx eas-cli build -p all --profile production` | an AAB (Play) and IPA (App Store); version numbers increase automatically (`appVersionSource: remote`) |

The JavaScript bundles for both platforms compile locally (`npx expo export -p android` and
`-p ios`, checked at every phase).

**Not yet done:**
- **No EAS build has run.** This machine is not logged in to Expo.
- **No device has run the app.** See "First run on a phone" below for what to check.

## Store submission

```bash
npx eas-cli submit -p android --profile production   # needs a Play service-account key
npx eas-cli submit -p ios --profile production       # needs App Store Connect access
```

**Store listing needs:**
- **Privacy policy:** the app shows student data; you need a URL for the listing.
- **Data safety / app privacy:** the app collects nothing for itself. It shows school records
  from the school's own server, keeps a copy on the phone for offline use (deleted at
  sign-out), and has no analytics or ads.
- **Permissions:** camera and photos only to attach work to assignments (`expo-image-picker`
  texts in `app.config.ts`).
- **Review sign-in:** a demo account for the store reviewer, on a demo school. Never the
  production school.

## Over-the-air updates

Not set up. `expo-updates` would let JavaScript fixes reach phones without a store release. Add
it when the release process is settled (`npx expo install expo-updates`, then `eas update`).

## First run on a phone: what to check

These can't be verified without a device:
0. **Push:** the steps under "Push notifications" above, on Android and on iOS; then sign out
   and publish another notice: nothing arrives.
1. **Sign-in and restore:** sign in; close and reopen the app; you are still signed in.
   Airplane mode → reopen → "can't reach the server", still signed in.
2. **Forced password change:** an account with an admin-set password goes straight to
   "Choose your own password".
3. **Attendance:**
   - mark a section;
   - go offline: Save is disabled and the marks stay;
   - back online: save works;
   - kill the app before saving and reopen: the draft comes back.
4. **Marks entry:**
   - the decimal keyboard appears;
   - a mark above the full marks shows "Above …";
   - save, then reopen: the marks are there.
5. **Report card:**
   - "Printed sheet" shows the school's layout;
   - Share PDF opens the share sheet with an A4 PDF named after the student, with the logo,
     on one page;
   - Print opens the system dialog.
6. **Assignment hand-in:** file, photo and camera attach; a file over 5 MB is refused; hand in
   once.
7. **Record payment** (test school only): the receipt opens. Turn data off mid-request and
   retry: only one receipt.
8. **Dark mode and brand colour:**
   - switch Appearance in More;
   - the school's colour shows on buttons;
   - text stays readable in both modes.
9. **Back navigation:** the Android back button and the iOS swipe work on detail screens. Back
   from a tab's root leaves the app.
10. **Sign-out:** sign out, then sign in as someone else. Nothing of the first person shows,
    including offline.

## Production checklist

- [ ] Bundle id, name, icon and splash final (table at the top).
- [ ] `eas.json` production `EXPO_PUBLIC_API_URL` is the live HTTPS API.
- [ ] Backend reachable from phones over HTTPS with a valid certificate (Android rejects
      self-signed).
- [ ] Privacy policy URL ready; store data-safety forms filled as above.
- [ ] Device checks above pass on at least one Android and one iOS phone.
- [ ] API_GAPS.md proposals decided, especially per-device logout (#2): today, signing out of
      the app signs the person out of the web too.
