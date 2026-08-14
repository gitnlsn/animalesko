"use client";

import { usePathname } from "next/navigation";

import { NotificationDropdown } from "./notification-dropdown.tsx";
import { TABS } from "./bottom-nav.tsx";

/**
 * The gradient bar at the top of every tab.
 *
 * The prototype passed the title down as a prop computed from `activeTab` in
 * one giant ternary. With the tabs as routes it can be read from the pathname,
 * which keeps the title correct on a hard refresh or a shared link.
 */
export function AppHeader({ signedIn }: { signedIn: boolean }) {
  const pathname = usePathname();
  const title = TABS.find((tab) => tab.href === pathname)?.label ?? "Animalesko";

  return (
    <header className="sticky top-0 z-40 bg-gradient-primary shadow-brand-md">
      <div className="mx-auto flex max-w-md items-center justify-between p-4">
        <div>
          <h1 className="text-lg font-bold text-primary-foreground">{title}</h1>
          <p className="text-xs text-primary-foreground/80">Animalesko</p>
        </div>

        <NotificationDropdown signedIn={signedIn} />
      </div>
    </header>
  );
}
