"use client";

/**
 * The narrow set of device capabilities the shared components need.
 *
 * The components are compiled into three hosts — two web apps and a native
 * bundle — from one source, so they cannot import a Capacitor plugin directly:
 * `@capacitor/geolocation` in `pet-alert-board.tsx` would put a native
 * dependency into the Vercel build of apps/app. The host installs an
 * implementation instead, and everything falls back to the browser API when no
 * host does.
 *
 * Only what actually differs is abstracted. Both platforms agree on fetch, on
 * routing (`next/navigation` works in a static export), and on the DOM, so
 * none of that is here.
 */
export interface Coordinates {
  latitude: number;
  longitude: number;
}

export interface ShareRequest {
  title: string;
  text: string;
  url: string;
}

export interface PlatformAdapter {
  /** Current position, or null when unavailable or refused. Never throws. */
  getCurrentPosition(): Promise<Coordinates | null>;

  /**
   * Opens the share sheet. Resolves `false` when there is nothing to share
   * with, so the caller can fall back to the clipboard.
   */
  share(request: ShareRequest): Promise<boolean>;

  /** Absolute origin for links that leave the app. */
  publicUrl(path: string): string;

  /**
   * In-app route to a listing, which is not the same string on both hosts.
   *
   * The web apps serve `/pet/[id]`. The native bundle cannot: a static export
   * has to know every dynamic segment at build time, so that screen ships as
   * `/pet?id=…` instead. A component that hardcodes `/pet/${id}` therefore
   * points at a route that is not in the exported tree, and the WebView falls
   * back to a full document load — the slowest navigation the app can perform,
   * on the single most common tap in it.
   */
  listingHref(id: string): string;
}

/**
 * Browser implementation — what both web apps use, and what `next dev` uses
 * when the native bundle is opened in a desktop browser.
 */
export const webPlatform: PlatformAdapter = {
  getCurrentPosition() {
    return new Promise((resolve) => {
      if (!globalThis.navigator?.geolocation) {
        resolve(null);
        return;
      }

      globalThis.navigator.geolocation.getCurrentPosition(
        (position) =>
          resolve({
            latitude: position.coords.latitude,
            longitude: position.coords.longitude,
          }),
        // Permission denied or timed out. A refusal is a normal outcome here,
        // not an error: the caller has a fallback centre.
        () => resolve(null),
        { timeout: 8000 },
      );
    });
  },

  async share(request) {
    if (!globalThis.navigator?.share) return false;

    try {
      await globalThis.navigator.share(request);
      return true;
    } catch (error) {
      // Dismissing the sheet is not a failure, but it is also not a reason to
      // then copy to the clipboard behind the user's back.
      if ((error as Error).name === "AbortError") return true;
      return false;
    }
  },

  publicUrl(path) {
    return `${globalThis.location?.origin ?? ""}${path}`;
  },

  listingHref(id) {
    return `/pet/${id}`;
  },
};

let platform: PlatformAdapter = webPlatform;

/** Called once by a host that has something better than the browser API. */
export function setPlatform(adapter: PlatformAdapter): void {
  platform = adapter;
}

export function getPlatform(): PlatformAdapter {
  return platform;
}
