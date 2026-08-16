import { Capacitor } from "@capacitor/core";
import { PushNotifications } from "@capacitor/push-notifications";
import { SecureStorage } from "@aparajita/capacitor-secure-storage";

import type { AuthTokenStore } from "@animalesko/auth/client";

const KEY = "animalesko.session-token";

/**
 * Where the session token lives on a device.
 *
 * The token is a bearer credential: anything holding it is signed in as that
 * user for thirty days, and unlike a cookie it is not protected by SameSite.
 * So on a real device it goes to the Keychain (iOS) or the encrypted
 * SharedPreferences backed by the Keystore (Android) rather than to anything
 * the WebView can read.
 *
 * `next dev` in a desktop browser has neither, and that is the only case the
 * sessionStorage branch serves. It is deliberately sessionStorage and not
 * localStorage: a dev token should not outlive the tab.
 */
const native = Capacitor.isNativePlatform();

export const tokenStore: AuthTokenStore = {
  async read() {
    if (!native) return globalThis.sessionStorage?.getItem(KEY) ?? undefined;

    const value = await SecureStorage.get(KEY);
    return typeof value === "string" ? value : undefined;
  },

  async write(token) {
    if (!native) {
      globalThis.sessionStorage?.setItem(KEY, token);
      return;
    }

    await SecureStorage.set(KEY, token);
  },

  async clear() {
    if (!native) {
      globalThis.sessionStorage?.removeItem(KEY);
      return;
    }

    // Removing a key that was never written throws rather than no-opping, and
    // signing out twice is not an error worth surfacing to the user.
    await SecureStorage.remove(KEY).catch(() => undefined);

    /**
     * Stop push at the same moment the session ends.
     *
     * This runs from the auth client's sign-out hook, by which point the server
     * session is already gone — so calling `push.unregister` would just 401.
     * Deleting the registration on the device instead needs no session, and is
     * strictly better: FCM stops delivering immediately rather than after the
     * server notices. The now-orphaned row is reaped by `sendPush`, which drops
     * any token FCM answers 404 for.
     *
     * Without this, a signed-out phone keeps showing another person's messages.
     */
    await PushNotifications.unregister().catch(() => undefined);
  },
};
