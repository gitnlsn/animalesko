"use client";

import { usePathname } from "next/navigation";

import { NotificationDropdown } from "./notification-dropdown.tsx";
import { TABS, isActiveTab } from "./bottom-nav.tsx";

/**
 * The gradient bar at the top of every tab.
 *
 * The prototype passed the title down as a prop computed from `activeTab` in
 * one giant ternary. With the tabs as routes it can be read from the pathname,
 * which keeps the title correct on a hard refresh or a shared link.
 */
export function AppHeader({ signedIn }: { signedIn: boolean }) {
  const pathname = usePathname();
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

        <NotificationDropdown signedIn={signedIn} />
      </div>
    </header>
  );
}
