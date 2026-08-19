import { defaultShouldDehydrateQuery, QueryClient } from "@tanstack/react-query";
import superjson from "superjson";

export function createQueryClient(): QueryClient {
  return new QueryClient({
    defaultOptions: {
      queries: {
        // Long enough that navigating back to a page doesn't refetch, short
        // enough that data isn't visibly stale.
        staleTime: 30 * 1000,

        /**
         * How long an unused answer is kept, as opposed to how long it is
         * trusted.
         *
         * The default is five minutes, which on a phone is short enough that
         * leaving the app to read a message and coming back lands on empty
         * screens again. Nothing here is expensive to hold and everything is
         * revalidated on mount anyway, so the cache is kept for a day and the
         * user gets content to look at while the refetch runs.
         */
        gcTime: 24 * 60 * 60 * 1000,
        retry: (failureCount, error) => {
          // Retrying a 401/403/404 just delays the error the user needs to see.
          const code = (error as { data?: { code?: string } }).data?.code;
          if (code && ["UNAUTHORIZED", "FORBIDDEN", "NOT_FOUND", "CONFLICT"].includes(code)) {
            return false;
          }
          return failureCount < 2;
        },
      },
      dehydrate: {
        serializeData: superjson.serialize,
        // Lets a Server Component stream a still-pending query to the client
        // rather than blocking the response on it.
        shouldDehydrateQuery: (query) =>
          defaultShouldDehydrateQuery(query) || query.state.status === "pending",
      },
      hydrate: {
        deserializeData: superjson.deserialize,
      },
    },
  });
}
