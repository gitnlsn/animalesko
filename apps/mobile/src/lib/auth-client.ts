"use client";

import { createAnimaleskoAuthClient } from "@animalesko/auth/client";

import { API_URL } from "./api-url.ts";
import { tokenStore } from "./token-store.ts";

/**
 * The native auth client.
 *
 * Differs from the web apps' client in exactly two ways, both forced by the
 * platform: the base URL is pinned (there is no meaningful live origin inside a
 * WebView) and sessions ride an `Authorization: Bearer` header out of the
 * Keychain instead of a cookie the WebView could never send cross-origin.
 */
export const authClient = createAnimaleskoAuthClient(API_URL, {
  pinBaseURL: true,
  tokenStore,
});

export const { signIn, signUp, signOut, useSession } = authClient;
