"use client";

import { useSession } from "@animalesko/features";
import { AppHeader } from "@animalesko/features/app-header";
import { BottomNav } from "@animalesko/features/bottom-nav";

/**
 * The four-tab shell, matching the web app's `(shell)` layout.
 *
 * The web version is an async Server Component that reads the session from
 * `headers()`. Here the session already sits in context — `MobileProviders`
 * fills it from the token in secure storage — so this is a plain client
 * component that reads it back out.
 *
 * `pb-24` leaves room for the fixed bottom nav, which adds
 * `env(safe-area-inset-bottom)` of its own on a notched device.
 */
export default function ShellLayout({ children }: { children: React.ReactNode }) {
  const { signedIn } = useSession();

  return (
    <div className="min-h-dvh bg-background">
      <AppHeader signedIn={signedIn} />

      <main className="mx-auto max-w-md pb-24">
        <div className="p-4">{children}</div>
      </main>

      <BottomNav />
    </div>
  );
}
