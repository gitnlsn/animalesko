# `apps/mobile`

The consumer app (`apps/app`) packaged as native iOS and Android binaries with
[Capacitor](https://capacitorjs.com) 8.

It is a Next.js app with `output: "export"` — a folder of HTML/JS that ships
inside the binary. It has no server of its own. Every screen is a thin client
page around a component from `@animalesko/features`, which `apps/app` renders
too, so there is one copy of the UI rather than one per platform.

The API stays where it was: `apps/app` on Vercel, serving `/api/trpc` and
`/api/auth`.

|                         |                                                           |
| ----------------------- | --------------------------------------------------------- |
| Bundle / application id | `org.animalesko.app`                                      |
| Web bundle              | `out/` (git-ignored)                                      |
| Native projects         | `ios/`, `android/` — **committed**; they hold real config |

## Everything goes through one script

`scripts/mobile.sh` holds the actual sequences; the pnpm scripts are thin
aliases so the two cannot drift.

```sh
cd apps/mobile
./scripts/mobile.sh help       # the full list
./scripts/mobile.sh doctor     # what is installed, what is missing, current version
```

|                              |                                                               |
| ---------------------------- | ------------------------------------------------------------- |
| `dev-android`                | build → sync → install → launch, on a running emulator/device |
| `dev-ios`                    | build → sync → open Xcode                                     |
| `release-android`            | guarded release build → `.aab` for the Play Console           |
| `release-ios`                | guarded release build → opens Xcode ready to Archive          |
| `bump [major\|minor\|patch]` | raises the version on **both** platforms at once              |

The release commands refuse to run rather than produce something broken: a
non-https API URL, an API URL pointing at a local address, or a missing Android
keystore all stop the build. Each of those would otherwise only fail at upload —
or worse, ship.

## Running it locally

Requires Xcode (iOS) or Android Studio + an AVD (Android), plus the workspace
running: `pnpm db:up && pnpm dev`.

### Android

```sh
pnpm --filter @animalesko/mobile dev:android
```

On an **emulator** that builds against `http://10.0.2.2:3000` — the alias every
Android emulator maps to the host's loopback. Inside the emulator `localhost` is
the emulator itself, so it cannot be used directly.

On a **USB device** there is no such alias, so the command sets up
`adb reverse tcp:3000 tcp:3000` and builds against `http://localhost:3000`
instead. Know that this tunnel is not durable: it dies with the adb server and
does not always survive a force-stop of the app, and **`adb reverse --list` goes
on reporting a mapping that is already refusing connections** — so it is not a
check. Re-run `dev:android` when the app stops reaching the API.

With more than one device attached, set `ANDROID_SERIAL`; the command refuses to
guess and tells you the serials it found.

Three Android-only traps, all already handled, all worth knowing because the
symptom is an app that renders empty states while the server log looks healthy:

- **The app cannot reach the API and nothing says so.** `output: "export"` bakes
  the home screen's numbers in at build time, so it still renders; only the
  calls that need the server fail. Sign-in is usually the first one noticed.
  `adb -s <serial> logcat -s Capacitor/Console` shows the `Failed to fetch`.

- **The bundle is served from `https://localhost`, not `http://`.** Capacitor's
  `androidScheme` defaults to https. That exact origin has to be trusted by the
  auth server — see `nativeOrigins` in `packages/auth/src/index.ts`.
- **A plain-HTTP dev server is therefore mixed content**, and Chromium drops
  those requests before CORS is consulted. `dev-android` sets `CAP_DEV=true`,
  which flips `allowMixedContent` on for that build only; the release commands
  deliberately do not. In production the API is https and this never arises.

### iOS

```sh
pnpm --filter @animalesko/mobile dev:ios    # then ⌘R in Xcode
```

The simulator shares your machine's network, so `http://localhost:3000` works
without a tunnel.

### Pointing at an API

`NEXT_PUBLIC_API_URL` is baked in at build time and is **required** — the build
fails without it. It is the absolute URL of the `apps/app` deployment.

Whatever origin the app runs on must also be trusted by the auth server. The
three Capacitor origins are hard-coded in `packages/auth`; anything else (a LAN
address, a preview deployment) goes in `AUTH_TRUSTED_ORIGINS`.

## Releasing

Both stores want a **new version on every upload**. Play rejects a duplicate
`versionCode`; App Store Connect rejects a duplicate build number.

```sh
cd apps/mobile

pnpm bump                 # patch by default; also: bump minor / bump major
git commit -am "release: v$(./scripts/mobile.sh version | head -1 | awk '{print $2}')"

pnpm release:android      # -> android/app/build/outputs/bundle/release/app-release.aab
pnpm release:ios          # -> opens Xcode; Product > Archive > Distribute
```

`bump` raises `versionCode`/`versionName` and iOS's
`CURRENT_PROJECT_VERSION`/`MARKETING_VERSION` together, so the two platforms
never report different versions for the same build.

Both release commands build against `PROD_API_URL`
(default `https://app.animalesko.org`) and deliberately **without** `CAP_DEV`.

### One-time setup before the first release

**Android — create an upload key.** Gradle's `release` type is unsigned by
default, and Play refuses an unsigned bundle, so this has to exist before
`bundleRelease` produces anything uploadable:

```sh
cd android
keytool -genkey -v -keystore upload-keystore.jks \
  -keyalg RSA -keysize 2048 -validity 10000 -alias upload

cat > keystore.properties <<'EOF'
storeFile=../upload-keystore.jks
storePassword=…
keyAlias=upload
keyPassword=…
EOF
```

Both files are gitignored. `app/build.gradle` also reads
`ANDROID_KEYSTORE_FILE` / `_PASSWORD` / `ANDROID_KEY_ALIAS` /
`ANDROID_KEY_PASSWORD` from the environment, so CI can pass them as secrets.

Enable **Play App Signing**: Google then holds the real signing key and this is
only the _upload_ key, which means losing it is recoverable. Losing an app
signing key is not.

Until a keystore exists the release build stays unsigned rather than failing —
a fresh clone still builds and tests — so check for
`app-release.aab` being signed before you rely on it.

**iOS — needs the Apple Developer Program.** `DEVELOPMENT_TEAM` is unset in the
Xcode project because there is no team yet. Signing is `Automatic`, so once the
account exists, selecting the team in Xcode is the whole configuration.

### Distribution tracks

Ship to Play **internal testing** and **TestFlight** first. Neither costs a
review round trip, and both surface the things a simulator cannot — real push
delivery, real permission prompts, real network conditions.

## Push notifications are off by default

`NEXT_PUBLIC_PUSH_ENABLED` gates registration and defaults to `false`.

That is not caution for its own sake. `PushNotifications.register()` reaches
straight for Firebase, and on Android with no `google-services.json` it throws
`Default FirebaseApp is not initialized` on a plugin thread — an uncaught
native exception that **crashes the app**, on the screen right after sign-in.
It is not a rejected promise, so no JavaScript `try/catch` can intercept it.

It also avoids spending the permission prompt. iOS asks exactly once per
install, so a "no" collected while nothing can send a notification is a "no"
forever.

To turn it on:

1. Create a Firebase project and add both apps (`org.animalesko.app`).
2. Put `google-services.json` in `android/app/` and
   `GoogleService-Info.plist` in `ios/App/App/`.
3. Upload the APNs key to Firebase (needs the Apple Developer account).
4. Set `FCM_SERVICE_ACCOUNT` on the Vercel project — without it `sendPush` is
   a deliberate no-op and nothing is delivered.
5. Build with `PUSH_ENABLED=true`.

## What forces a new store release — and what does not

This is the useful consequence of keeping the API remote. Where a change lives
decides how it reaches users:

| Changed                                                            | How it reaches users     | Store release?                              |
| ------------------------------------------------------------------ | ------------------------ | ------------------------------------------- |
| `packages/api`, `packages/db`, `packages/auth`, API route handlers | `git push` → Vercel      | **No.** Live for installed apps immediately |
| `apps/app/src/app/**` (the web pages)                              | Vercel                   | **No.** Mobile has its own pages            |
| `packages/features`, `packages/ui` (shared components)             | Compiled into the bundle | **Yes**                                     |
| `apps/mobile/**`                                                   | Compiled into the bundle | **Yes**                                     |
| Plugins, permissions, icon, splash, bundle id                      | Native project           | **Yes**                                     |

So business logic, contracts, queries, pricing, notification copy, new
procedures and bug fixes in the data layer all ship without touching a store.
Only a change to what is _drawn_ — or to the native shell — needs a release.

Two things to keep in mind:

- **Old versions keep calling the API.** Once the app is out there, `appRouter`
  is a public contract with clients you cannot force to upgrade. Additive
  changes are safe; renaming or removing a procedure, or tightening a Zod
  schema, breaks every installed copy until its user updates. This is new — the
  web app could never be stale.
- **OTA updates are permitted** for JS/asset-only changes by both stores (Apple
  guideline 3.3.2 allows interpreted code that does not change the app's
  purpose). `@capgo/capacitor-updater` turns a shared-component fix from a
  multi-day review into a push. Native changes still need a real release. Not
  installed here — worth adding once release cadence justifies it.
