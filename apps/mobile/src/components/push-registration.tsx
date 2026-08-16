"use client";

import { useSession } from "@animalesko/features";
import { Capacitor } from "@capacitor/core";
import { PushNotifications } from "@capacitor/push-notifications";
import { useRouter } from "next/navigation";
import { useEffect, useRef } from "react";

import { useTRPC } from "~/trpc/react.tsx";
import { useMutation } from "@tanstack/react-query";

/**
 * Registers this device for push once someone is signed in.
 *
 * Renders nothing. Waits for a session on purpose — a token belongs to an
 * account, and registering before sign-in would either fail the protected
 * procedure or, worse, attach the device to whoever signs in next.
 *
 * The OS permission prompt is deliberately *not* fired on first launch. Asking
 * before the user has any reason to want notifications is the reliable way to
 * be denied permanently, and iOS only ever asks once. `requestPermissions` here
 * runs after sign-in, which is the first moment notifications mean anything.
 */
export function PushRegistration() {
  const trpc = useTRPC();
  const router = useRouter();
  const { signedIn } = useSession();

  const register = useMutation(trpc.push.register.mutationOptions());
  // Registration is idempotent server-side but the listeners are not: adding
  // them twice would route one tap twice.
  const wired = useRef(false);

  useEffect(() => {
    if (!Capacitor.isNativePlatform() || !signedIn || wired.current) return;
    wired.current = true;

    const platform = Capacitor.getPlatform() === "ios" ? "IOS" : "ANDROID";

    const listeners = [
      PushNotifications.addListener("registration", (token) => {
        register.mutate({ token: token.value, platform });
      }),

      PushNotifications.addListener("registrationError", (error) => {
        // Not surfaced to the user: they did not ask for this, and the app is
        // fully usable without it. The in-app notification list still works.
        console.error("Push registration failed", error);
      }),

      // Tapping a notification while the app is backgrounded. `href` is what
      // `sendPush` puts in the data payload.
      PushNotifications.addListener("pushNotificationActionPerformed", (action) => {
        const href = action.notification.data?.href;
        if (typeof href === "string" && href.startsWith("/")) router.push(href);
      }),
    ];

    void (async () => {
      const permission = await PushNotifications.requestPermissions();
      if (permission.receive !== "granted") return;
      await PushNotifications.register();
    })();

    return () => {
      void Promise.all(listeners).then((handles) => {
        for (const handle of handles) void handle.remove();
      });
    };
    // `register` is a stable mutation object; including it would re-run this on
    // every render of the provider tree.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [signedIn, router]);

  return null;
}
