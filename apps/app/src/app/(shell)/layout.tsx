import { auth } from "@animalesko/auth";
import { headers } from "next/headers";

import { AppHeader } from "~/components/app-header.tsx";
import { BottomNav } from "~/components/bottom-nav.tsx";
import { SessionProvider } from "~/lib/session-context.tsx";

/**
 * The four-tab shell: sticky gradient header, `max-w-md` column, fixed bottom
 * nav. The prototype's `min-h-screen` / `pb-20` frame, mounted once here rather
 * than repeated by every tab.
 *
 * Reading the session makes these routes dynamic. That is not a regression for
 * indexing — they are still fully rendered on the server, so a crawler receives
 * complete HTML; they are simply not cacheable, which is unavoidable once the
 * header shows *your* unread count.
 */
export default async function ShellLayout({ children }: { children: React.ReactNode }) {
  const session = await auth.api.getSession({ headers: await headers() });

  return (
    <SessionProvider
      value={{
        signedIn: Boolean(session?.user),
        userId: session?.user.id ?? null,
        name: session?.user.name ?? null,
      }}
    >
      <div className="min-h-dvh bg-background">
        <AppHeader signedIn={Boolean(session?.user)} />

        <main className="mx-auto max-w-md pb-24">
          <div className="p-4">{children}</div>
        </main>

        <BottomNav />
      </div>
    </SessionProvider>
  );
}
