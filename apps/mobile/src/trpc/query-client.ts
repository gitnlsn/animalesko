import { defaultShouldDehydrateQuery, QueryClient } from "@tanstack/react-query";
import superjson from "superjson";

export function createQueryClient(): QueryClient {
  return new QueryClient({
    defaultOptions: {
      queries: {
        // Long enough that navigating back to a page doesn't refetch, short
        // enough that data isn't visibly stale.
        staleTime: 30 * 1000,
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
