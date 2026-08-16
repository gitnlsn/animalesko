"use client";

import { customSessionClient } from "better-auth/client/plugins";
import { createAuthClient } from "better-auth/react";

import type { Auth } from "./index.ts";

/**
 * Where a native client keeps its session token.
 *
 * Deliberately an interface rather than a concrete implementation: this package
 * is imported by the two Next apps as well as the Capacitor bundle, and pulling
 * a Capacitor plugin in here would put a native dependency in the web builds.
 * `apps/mobile` supplies a Keychain / Keystore-backed store; nothing else
 * supplies one at all.
 *
 * Every method may be async because a secure enclave read is.
 */
export interface AuthTokenStore {
  read(): string | undefined | Promise<string | undefined>;
  write(token: string): void | Promise<void>;
  clear(): void | Promise<void>;
}

export interface AnimaleskoAuthClientOptions {
  /**
   * Use `baseURL` verbatim instead of following the live origin.
   *
   * Required under Capacitor, where the bundle is served from
   * `capacitor://localhost` (iOS) or `http://localhost` (Android) and the live
   * origin is therefore never the API host.
   */
  pinBaseURL?: boolean;

  /**
   * Enables bearer-token sessions. Given a store, the client reads the token
   * onto every request and captures a freshly minted one off every response.
   * Omitted on web, where cookies do this and are the safer carrier.
   */
  tokenStore?: AuthTokenStore;
}

/**
 * Auth client for both apps and for the native bundle.
 *
 * On the web each app passes its own origin so requests land on that app's own
 * /api/auth route, and the live origin always wins over the passed fallback:
 * the fallback comes from a NEXT_PUBLIC_* variable inlined at build time, so if
 * it is unset or stale the client would post credentials at the wrong host.
 *
 * Native inverts that. There is no meaningful live origin, so `pinBaseURL`
 * turns the argument back into the authority, and `tokenStore` swaps the cookie
 * for an `Authorization: Bearer` header that the server's `bearer()` plugin
 * converts back into a session.
 */
export function createAnimaleskoAuthClient(
  baseURL: string,
  options: AnimaleskoAuthClientOptions = {},
) {
  const { pinBaseURL = false, tokenStore } = options;

  const resolvedBaseURL =
    pinBaseURL || typeof window === "undefined" ? baseURL : window.location.origin;

  return createAuthClient({
    baseURL: resolvedBaseURL,
    // Mirrors the server's customSession plugin so `session.data.organizations`
    // and `.roles` are typed on the client instead of being `unknown`.
    plugins: [customSessionClient<Auth>()],

    ...(tokenStore
      ? {
          fetchOptions: {
            auth: {
              type: "Bearer" as const,
              // Read per request rather than cached in a module variable: the
              // store is the single source of truth, and a token refreshed by
              // another part of the app must be picked up here immediately.
              token: () => Promise.resolve(tokenStore.read()),
            },

            onSuccess: async (context) => {
              // Sign-out has to drop the stored token as well as the server
              // session. Skipping this would leave a token on the device that
              // still reads as signed-in until it expires — 30 days later.
              const url = String(context.request.url);
              if (url.endsWith("/sign-out")) {
                await tokenStore.clear();
                return;
              }

              // `bearer()` emits this on any response that establishes a
              // session, which covers sign-in, sign-up and rotation.
              const token = context.response.headers.get("set-auth-token");
              if (token) await tokenStore.write(token);
            },
          },
        }
      : {}),
  });
}

export type AnimaleskoAuthClient = ReturnType<typeof createAnimaleskoAuthClient>;
