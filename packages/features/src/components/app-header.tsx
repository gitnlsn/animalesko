"use client";

import { usePathname } from "next/navigation";

import { NotificationDropdown } from "./notification-dropdown.tsx";
import { TABS, isActiveTab } from "./bottom-nav.tsx";
import { useSession } from "../lib/session-context.tsx";

/**
 * The gradient bar at the top of every tab.
 *
 * The prototype passed the title down as a prop computed from `activeTab` in
 * one giant ternary. With the tabs as routes it can be read from the pathname,
 * which keeps the title correct on a hard refresh or a shared link.
 */
export function AppHeader({
  signedIn,
  /**
   * Whether the session is still being worked out, which only happens in the
   * native shell. Optional, and it falls back to the session in context, so the
   * two web layouts that pass a server-resolved `signedIn` need no change and
   * the native shell gets the right answer whether or not it threads the prop.
   */
  resolving,
}: {
  signedIn: boolean;
  resolving?: boolean;
}) {
  const pathname = usePathname();
  const session = useSession();
  const title = TABS.find((tab) => isActiveTab(pathname, tab.href))?.label ?? "Animalesko";

  return (
    <header className="sticky top-0 z-40 bg-gradient-primary shadow-brand-md">
      {/* The top inset matters only in the native shell, where `viewportFit:
          cover` puts the layout under the status bar and the title would
          otherwise sit behind the clock. `env()` is 0 in a desktop browser, so
          `max()` leaves the web apps exactly as they were — the same approach
          the bottom nav already takes for the home indicator. */}
      <div className="mx-auto flex max-w-md items-center justify-between px-4 pt-[max(1rem,env(safe-area-inset-top))] pb-4">
        <div>
          <h1 className="text-lg font-bold text-gradient-foreground">{title}</h1>
          <p className="text-xs text-gradient-foreground/80">Animalesko</p>
        </div>

        <NotificationDropdown signedIn={signedIn} resolving={resolving ?? session.resolving} />
      </div>
    </header>
  );
}
