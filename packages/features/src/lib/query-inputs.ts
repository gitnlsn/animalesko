/**
 * Query inputs shared between a view's `useQuery` and the web app's server
 * prefetch.
 *
 * A tRPC query key is derived from its input, so the two have to be deep-equal
 * or the prefetched entry is never read: the page still works, it just hydrates
 * empty and refetches from the browser. Nothing throws and no test fails, which
 * is exactly why the values live here instead of being written twice.
 *
 * Deliberately not a `"use client"` module — the web app imports these from
 * Server Components, and a value exported from a client module cannot be read
 * on the server.
 */

/** Início — the "Pets recentes" strip, not the full feed. */
export const HOME_RECENT_LISTINGS_INPUT = { limit: 2 };

/** Adoção — one page of the feed, filters spread in alongside it. */
export const ADOPTION_PAGE_LIMIT = 50;

/** Serviços — the tab that is open on arrival, and so the only one prefetched. */
export const SERVICES_DEFAULT_TYPE = "PET_SITTER" as const;
export const SERVICES_PAGE_LIMIT = 50;

/**
 * Histórico — the "Todos" tab. The view passes `status: undefined` there, which
 * hashes to the same key as omitting it; the other three tabs fetch on demand.
 */
export const HISTORY_BOOKINGS_LIMIT = 100;

export const MESSAGES_CONVERSATIONS_INPUT = { limit: 30 };

export const MY_PETS_LIST_INPUT = { includeDeceased: false, limit: 50 };

export const GAMIFICATION_PROFILE_INPUT = { limit: 5 };
