"use client";

import { App } from "@capacitor/app";
import { Capacitor } from "@capacitor/core";
import { setPlatform, webPlatform } from "@animalesko/features/platform";
import { Keyboard, KeyboardResize } from "@capacitor/keyboard";
import { SplashScreen } from "@capacitor/splash-screen";
import { Style, StatusBar } from "@capacitor/status-bar";
import { useRouter } from "next/navigation";
import { useEffect } from "react";

import { nativePlatform } from "~/lib/native-platform.ts";
import { WEB_URL } from "~/lib/api-url.ts";

/** The origins the WebView itself serves the bundle from: Android uses
 *  https://localhost, iOS capacitor://localhost. */
const NATIVE_SCHEMES = ["https:", "capacitor:"];

/**
 * Everything that only makes sense on a device.
 *
 * The adapter is installed at module scope rather than in an effect: a
 * component can call `getPlatform()` during its first render, which happens
 * before any effect runs, and getting the browser implementation that once
 * would mean silently asking for location through the wrong API.
 *
 * `listingHref` is the exception that has to be decided differently, because it
 * is a property of *this build* rather than of the device running it. Geolocation
 * and the share sheet genuinely depend on whether Capacitor is there; the route
 * shape does not — apps/mobile is the static export whether it is opened in the
 * WebView or in a desktop browser through `next dev`, and `/pet/[id]` is absent
 * from its exported tree either way.
 *
 * Deciding it from `isNativePlatform()` would also break hydration. These pages
 * are prerendered in Node at build time, where Capacitor reports false, so every
 * listing link would be written into the HTML as `/pet/{id}` and then hydrate as
 * `/pet?id={id}`. React repairs the attribute and complains, but the real cost is
 * the window before hydration finishes: a tap in it follows the href that is
 * actually in the document, which is the full-page load this was meant to remove.
 */
setPlatform(
  Capacitor.isNativePlatform()
    ? nativePlatform
    : { ...webPlatform, listingHref: nativePlatform.listingHref },
);

/**
 * Renders nothing. Wires the native shell: status bar, keyboard behaviour,
 * splash dismissal, hardware back, and deep links.
 */
export function NativeBootstrap() {
  const router = useRouter();

  useEffect(() => {
    if (!Capacitor.isNativePlatform()) return;

    void StatusBar.setStyle({ style: Style.Light });
    // The header is a blue gradient, so the Android status bar sits on top of
    // it rather than above it.
    if (Capacitor.getPlatform() === "android") {
      void StatusBar.setOverlaysWebView({ overlay: false });
      void StatusBar.setBackgroundColor({ color: "#26558f" });
    }

    // `Native` resizes the WebView itself, which keeps the fixed bottom nav
    // above the keyboard instead of letting it float over the text field.
    void Keyboard.setResizeMode({ mode: KeyboardResize.Native });

    void SplashScreen.hide();
  }, []);

  useEffect(() => {
    if (!Capacitor.isNativePlatform()) return;

    /**
     * Universal Links and App Links arrive as the full https URL the user
     * tapped. Only the path is meaningful to the router, and `/pet/{id}` has to
     * be rewritten: the native build serves that screen as `/pet?id=` because a
     * static export cannot prerender an unknown dynamic segment.
     */
    const listener = App.addListener("appUrlOpen", ({ url }) => {
      let parsed: URL;
      try {
        parsed = new URL(url);
      } catch {
        return;
      }

      // Accept only the two shapes a real deep link can take: an https link
      // to our own host, or the WebView's own origin. The previous condition
      // ignored a URL only when the host mismatched *and* the scheme was
      // http(s), so any custom-scheme URL skipped the host check entirely and
      // was pushed straight into the router — an arbitrary app could steer the
      // user's screen, and a bare `scheme://host/` navigated to the home tab
      // for no visible reason.
      const isOwnWebOrigin = parsed.protocol.startsWith("http") && WEB_URL.endsWith(parsed.host);
      const isNativeOrigin =
        NATIVE_SCHEMES.includes(parsed.protocol) && parsed.host === "localhost";
      if (!isOwnWebOrigin && !isNativeOrigin) return;

      const petId = /^\/pet\/([^/?#]+)/.exec(parsed.pathname)?.[1];
      if (petId) {
        router.push(`/pet?id=${encodeURIComponent(petId)}`);
        return;
      }

      router.push(`${parsed.pathname}${parsed.search}`);
    });

    return () => {
      void listener.then((handle) => handle.remove());
    };
  }, [router]);

  useEffect(() => {
    if (!Capacitor.isNativePlatform()) return;

    // Android's hardware back button does nothing by default in a WebView, so
    // the first press would otherwise exit the app from any screen. Backing out
    // of the root is the one case where exiting is right.
    const listener = App.addListener("backButton", ({ canGoBack }) => {
      if (canGoBack) {
        globalThis.history.back();
        return;
      }
      void App.exitApp();
    });

    return () => {
      void listener.then((handle) => handle.remove());
    };
  }, []);

  return null;
}
