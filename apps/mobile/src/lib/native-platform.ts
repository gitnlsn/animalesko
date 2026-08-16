"use client";

import { Geolocation } from "@capacitor/geolocation";
import { Share } from "@capacitor/share";

import { WEB_URL } from "./api-url.ts";

import type { PlatformAdapter } from "@animalesko/features/platform";

/**
 * The device implementations of the capabilities the shared components use.
 *
 * Installed once, from `MobileProviders`. Everything here is written so a
 * refusal resolves rather than throws — the components treat "no location" and
 * "did not share" as ordinary outcomes, and a rejected promise crossing that
 * boundary would surface as an unhandled error instead of the fallback the UI
 * already has.
 */
export const nativePlatform: PlatformAdapter = {
  async getCurrentPosition() {
    try {
      // Asking outright rather than checking first: `requestPermissions`
      // returns the current grant without a prompt when one already exists, so
      // the extra round trip buys nothing.
      const permission = await Geolocation.requestPermissions();
      if (permission.location === "denied") return null;

      const position = await Geolocation.getCurrentPosition({
        enableHighAccuracy: false,
        timeout: 8000,
      });

      return {
        latitude: position.coords.latitude,
        longitude: position.coords.longitude,
      };
    } catch {
      // Location services off at the OS level, a hardware timeout, or a user
      // who declined. The caller falls back to a default centre.
      return null;
    }
  },

  async share(request) {
    try {
      const { value } = await Share.canShare();
      if (!value) return false;

      await Share.share({
        title: request.title,
        text: request.text,
        url: request.url,
        dialogTitle: "Compartilhar",
      });

      return true;
    } catch {
      // Capacitor rejects when the sheet is dismissed, which is not a failure
      // that should silently copy a link to the clipboard instead.
      return true;
    }
  },

  publicUrl(path) {
    return `${WEB_URL}${path}`;
  },
};
