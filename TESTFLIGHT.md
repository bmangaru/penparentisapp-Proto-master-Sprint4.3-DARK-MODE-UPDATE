# Getting Pen Parentis onto TestFlight

Run these in PowerShell, in the project folder. They need your own Expo and
Apple logins, so they can't be run for you.

## Whose project it is

The app is set up under **your own** Expo account and Apple ID (it was under
the `ronycodedevs-team` Expo account before):

- **app.json** has no `owner` and no `extra.eas.projectId` any more: step 4
  below creates a fresh project on your account and writes both back in.
- **Bundle ID** (iPhone) and **package** (Android): `com.brianmangaru.penparentis`.
  Change it now if you'd like a different one: once a build is in App Store
  Connect, the bundle ID can't be changed for that app.
- `"name": "Pen Parentis"` (under the icon) and `"runtimeVersion"` stay.
- **eas.json**: `"channel"` on the preview and production builds (unchanged).

## One time

1. Apple Developer Program ($99/year) on the Apple ID you'll use.
2. Add the over-the-air update package (it must be in the build):
   ```
   npx expo install expo-updates
   ```
3. Check everything is the right version for this Expo SDK:
   ```
   npx expo-doctor
   npx expo install --check
   ```
4. Log in to **your** Expo account (sign up free at expo.dev if needed), make
   the project yours, and turn on over-the-air updates:
   ```
   npx eas-cli@latest login
   npx eas-cli@latest whoami
   npx eas-cli@latest init
   npx eas-cli@latest update:configure
   ```
   `init` creates the project on your account and adds `owner` and
   `extra.eas.projectId` to app.json; `update:configure` adds the
   `updates.url` for that project. Check app.json afterwards: `owner` should
   be your username.

## Build and send to TestFlight

```
npx eas-cli@latest build --platform ios --profile production
npx eas-cli@latest submit --platform ios --latest
```

- The first build asks to sign in to Apple and to create the certificate and
  profile: say yes; EAS keeps them.
- The first submit can create the app in App Store Connect for you.
- Apple then processes the build (usually 10–30 minutes). In App Store
  Connect → TestFlight: add yourself and others as **internal testers**
  (immediate), or add an **external** group (email / public link; the first
  build of a version needs a short Beta App Review).
- Testers install the TestFlight app and accept the invite.

## Updating the beta

**Code only** (screens, tour, text, notifications logic: almost every round):
```
npx eas-cli@latest update --channel production --environment production --message "Round 147"
```
Testers get it the next time they open the app (sometimes after closing and
reopening it once).

**A new build** is needed when something native changes: a new package with
native code, app.json (name, icon, splash, permissions, plugins), or a new
Expo SDK. Build and submit again (the build number goes up by itself). If you
also change `version` in app.json (e.g. 1.0.1), older builds stop getting
updates meant for the new version.

## Good to know

- Keep using Expo Go (`npx expo start -c`) for day-to-day testing.
- The Streak saver's 🌙 Rest day button needs a real build, so check it on
  the TestFlight build.
- `"supportsTablet": true` means the app also runs as an iPad app. That's fine
  for TestFlight; for the App Store later you'd need iPad screenshots (or set
  it to false to make it iPhone only).
