import type { CapacitorConfig } from "@capacitor/cli";

/**
 * The consumer app, `apps/app`, packaged as a native binary.
 *
 * `webDir` is Next's static export, so `pnpm build` has to run before
 * `cap sync` — the `sync` script does both.
 *
 * There is deliberately no `server.url` here. Pointing the WebView at the live
 * site is the fastest way to ship and the fastest way to be rejected: App Store
 * guideline 4.2 treats an app that is only a wrapper around a website as not
 * having minimum functionality. The bundle ships inside the binary; only the
 * API is remote.
 */
const config: CapacitorConfig = {
  appId: "org.animalesko.app",
  appName: "Animalesko",
  webDir: "out",

  // iOS serves from capacitor://localhost and Android from http://localhost.
  // Both are listed in the auth server's trustedOrigins — see
  // packages/auth/src/index.ts, `nativeOrigins`.
  android: {
    /**
     * Android serves the bundle from `https://localhost` — `androidScheme`
     * defaults to https, which is why the auth server has to trust that exact
     * origin and not the `http://localhost` you would expect from the fact that
     * nothing is actually encrypted.
     *
     * The consequence is that a plain-HTTP dev server is *mixed content*, and
     * Chromium drops those requests before CORS is even consulted. In
     * production the API is https and the question never arises, so this is
     * opened only when CAP_DEV is set:
     *
     *   CAP_DEV=true pnpm android:run
     *
     * Gating it on an env var rather than editing this line by hand is what
     * stops the permissive value from being committed and shipped.
     */
    allowMixedContent: process.env.CAP_DEV === "true",
  },

  ios: {
    contentInset: "always",
  },

  plugins: {
    SplashScreen: {
      /**
       * A ceiling, not a duration. `NativeBootstrap` calls `SplashScreen.hide()`
       * as soon as the shell mounts, so this only decides how long a launch
       * that has not painted yet is covered.
       *
       * It used to be 1500ms, which held every warm start behind a wait that
       * had nothing to do with the app being ready — and the wait it was
       * nominally covering (Keychain read, session round trip) happens after
       * first paint anyway, behind skeletons. 600ms still hides the white frame
       * before the WebView's first paint on a cold start.
       */
      launchShowDuration: 600,
      launchAutoHide: true,
      backgroundColor: "#ffffff",
      showSpinner: false,
    },

    PushNotifications: {
      // A prompt on first launch, before the user has any reason to want
      // notifications, is the reliable way to get denied. The permission is
      // requested from the notifications screen instead.
      presentationOptions: ["badge", "sound", "alert"],
    },
  },
};

export default config;
