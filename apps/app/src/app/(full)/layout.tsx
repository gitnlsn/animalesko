import { auth } from "@animalesko/auth";
import { headers } from "next/headers";

import { SessionProvider } from "@animalesko/features";

/**
 * The secondary pages — favourites, history, Pet Alert, a listing — which the
 * prototype rendered full-bleed with their own back-arrow header instead of
 * the tab chrome. No `AppHeader`, no `BottomNav`; each page brings its own
 * `PageHeader`.
 */
export default async function FullLayout({ children }: { children: React.ReactNode }) {
  const session = await auth.api.getSession({ headers: await headers() });

  return (
    <SessionProvider
      value={{
        signedIn: Boolean(session?.user),
        userId: session?.user.id ?? null,
        name: session?.user.name ?? null,
      }}
    >
      <div className="min-h-dvh bg-background">{children}</div>
    </SessionProvider>
  );
}
