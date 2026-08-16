/**
 * The seams a host has to wire up, and nothing else.
 *
 * Components are deliberately absent: they are reached one file at a time
 * through the `./*` export (`@animalesko/features/pet-card`). Re-exporting all
 * twenty-eight from here would defeat the code splitting the app relies on —
 * `pet-alert-board` pulls the Leaflet map through `next/dynamic` precisely so
 * that a bundle for `/adocao` never contains a mapping library.
 */

export { TRPCProvider, useTRPC, useTRPCClient } from "./trpc.ts";
export { AuthClientProvider, useAuthClient } from "./lib/auth-context.tsx";
export { SessionProvider, useSession, type ClientSession } from "./lib/session-context.tsx";
export { useFavorites } from "./lib/use-favorites.ts";
