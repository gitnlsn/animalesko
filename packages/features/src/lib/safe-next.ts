/**
 * Where a `?next=` may legitimately send someone after they sign in.
 *
 * Deliberately not a `"use client"` module: the web app's `/entrar` route has
 * to apply the same rule on the server, and a function imported out of a client
 * module arrives there as a client reference rather than something callable.
 */

/**
 * Where signing in lands you when nothing sent you to `/entrar`.
 *
 * "Meus pets" rather than Início: someone who chose to sign in wants the part
 * of the app that needed an account, and the home feed is readable without one.
 */
export const DEFAULT_SIGNED_IN_ROUTE = "/meus-pets";

/**
 * Narrows `next` to a destination inside this app.
 *
 * `next` arrives from the query string, so it is attacker-controlled. Handing
 * it to `router.push` unchecked is an open redirect: App Router turns an
 * absolute URL into a full cross-origin navigation, so
 * `/entrar?next=https://evil.example` walks the visitor off the site at the
 * exact moment they have just typed their password — onto a page that then gets
 * to imitate us.
 *
 * Only a single-slash-rooted path survives. `//evil.example` and
 * `/\evil.example` look like paths but are protocol-relative URLs, which is why
 * `startsWith("/")` on its own is not the check.
 */
export function safeNext(next: string | null | undefined): string {
  if (!next || !next.startsWith("/")) return DEFAULT_SIGNED_IN_ROUTE;
  if (next.startsWith("//") || next.startsWith("/\\")) return DEFAULT_SIGNED_IN_ROUTE;

  return next;
}
