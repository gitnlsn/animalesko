/**
 * Where a `?next=` may legitimately send a provider after they sign in.
 *
 * A local copy rather than an import from `@animalesko/features`: that package
 * is the consumer app's component library — it would pull leaflet and
 * react-hook-form into this build for one pure function — and its default
 * destination is `/meus-pets`, which does not exist here.
 */

/** Where signing in lands a provider when nothing sent them to `/entrar`. */
export const DEFAULT_SIGNED_IN_ROUTE = "/";

/**
 * Narrows `next` to a destination inside Plus.
 *
 * `next` arrives from the query string, so it is attacker-controlled. Handing
 * it to `router.push` unchecked is an open redirect: App Router turns an
 * absolute URL into a full cross-origin navigation, so
 * `/entrar?next=https://evil.example` walks a provider off the panel at the
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
