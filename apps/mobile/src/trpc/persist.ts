"use client";

import { dehydrate, hydrate } from "@tanstack/react-query";
import superjson from "superjson";

import type { DehydratedState, QueryClient } from "@tanstack/react-query";

/**
 * Last-known data, kept across launches.
 *
 * The web apps prefetch on the server, so their first paint already has data in
 * it. A static export has no server: every screen mounts empty, fires its query
 * over the network, and shows a placeholder until the answer arrives — on every
 * cold start, for data that has not changed since yesterday.
 *
 * Writing the cache to storage turns that first paint into real content that
 * revalidates behind itself. The queries still run; what changes is that the
 * user reads the feed while they run instead of watching a skeleton.
 *
 * Deliberately hand-rolled rather than pulled from `@tanstack/query-persist-*`:
 * it is forty lines against a new dependency in a bundle that ships inside a
 * binary, and the parts that need judgement here — what to keep, how stale is
 * too stale, what happens on sign-out — are exactly the parts a generic
 * persister would make us configure anyway.
 */

const STORAGE_KEY = "animalesko.query-cache.v1";

/**
 * Older than this and the snapshot is dropped unread.
 *
 * Not a correctness boundary — `staleTime` still forces a revalidation on
 * mount, so nothing stale is ever *trusted*. It bounds how wrong the very first
 * frame is allowed to look before showing a placeholder is the kinder answer.
 */
const MAX_AGE_MS = 24 * 60 * 60 * 1000;

/**
 * Above this the write is skipped entirely.
 *
 * localStorage is synchronous and single-threaded with rendering, so a snapshot
 * large enough to be slow to serialise is one that would jank the very
 * interaction it exists to speed up.
 */
const MAX_BYTES = 1_500_000;

interface Snapshot {
  savedAt: number;
  state: DehydratedState;
}

function storage(): Storage | null {
  try {
    return globalThis.localStorage ?? null;
  } catch {
    // Storage can be unavailable outright — disabled by policy, or a WebView
    // running without a persistent profile. Losing the cache is survivable;
    // throwing on boot is not.
    return null;
  }
}

/** Fills the client from the last snapshot. Call before anything reads it. */
export function restoreQueryCache(client: QueryClient): void {
  const store = storage();
  if (!store) return;

  try {
    const raw = store.getItem(STORAGE_KEY);
    if (!raw) return;

    const snapshot = JSON.parse(raw) as Snapshot;
    if (!snapshot.savedAt || Date.now() - snapshot.savedAt > MAX_AGE_MS) {
      store.removeItem(STORAGE_KEY);
      return;
    }

    hydrate(client, snapshot.state, { defaultOptions: { deserializeData: superjson.deserialize } });
  } catch {
    // A snapshot written by an older build, or half-written when the OS killed
    // the app. Either way it is not worth reasoning about — start cold.
    store.removeItem(STORAGE_KEY);
  }
}

/** Mirrors every cache change back to storage, coalesced. */
export function persistQueryCache(client: QueryClient): void {
  const store = storage();
  if (!store) return;

  let pending: ReturnType<typeof setTimeout> | undefined;

  const write = () => {
    pending = undefined;

    try {
      const state = dehydrate(client, {
        serializeData: superjson.serialize,
        // Only settled, successful queries. Persisting a pending one would
        // restore a screen that is permanently loading, and persisting an error
        // would replay a failure the network may have long since recovered from.
        shouldDehydrateQuery: (query) => query.state.status === "success",
        shouldDehydrateMutation: () => false,
      });

      const serialized = JSON.stringify({ savedAt: Date.now(), state } satisfies Snapshot);

      if (serialized.length > MAX_BYTES) {
        store.removeItem(STORAGE_KEY);
        return;
      }

      store.setItem(STORAGE_KEY, serialized);
    } catch {
      // Quota exceeded is the realistic case. Drop the snapshot rather than
      // leaving a truncated one behind for the next launch to choke on.
      try {
        store.removeItem(STORAGE_KEY);
      } catch {
        // Nothing further to try.
      }
    }
  };

  /**
   * Coalesced because a single screen settling can fire this a dozen times, and
   * `dehydrate` walks the whole cache each call. Signing out clears the cache,
   * which reaches here as an ordinary change and overwrites the snapshot with
   * an empty one — that is what keeps one account's data out of the next
   * session, so this subscription must outlive nothing short of the app.
   */
  client.getQueryCache().subscribe(() => {
    if (pending) return;
    pending = setTimeout(write, 1000);
  });
}
