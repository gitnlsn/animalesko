"use client";

import { cn } from "@animalesko/ui";
import { Calendar, Heart, Home, User } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";

/**
 * The four tabs are routes now, not `activeTab` state.
 *
 * The prototype held the whole app in one component and swapped its body on a
 * string, which meant the adoption feed was unlinkable and unindexable. Each
 * tab is a URL here, so `usePathname()` replaces the state and `Link` replaces
 * the `onTabChange` callback — and the back button works.
 */
export const TABS = [
  { href: "/", label: "Início", icon: Home },
  { href: "/adocao", label: "Adoção", icon: Heart },
  { href: "/servicos", label: "Serviços", icon: Calendar },
  { href: "/perfil", label: "Perfil", icon: User },
] as const;

/**
 * Tab matching that survives `trailingSlash`.
 *
 * apps/mobile builds with `output: "export"` and `trailingSlash: true`, so the
 * WebView's pathname is `/adocao/` while TABS carries `/adocao`. Comparing the
 * two with `===` therefore matched only `/`: on a device every tab but Início
 * lost its active pill, and the header fell back to "Animalesko" instead of the
 * screen's name. The web apps have no trailing slash, which is exactly why the
 * bug was invisible in a browser and obvious on the phone.
 */
export function isActiveTab(pathname: string | null, href: string): boolean {
  return stripTrailingSlash(pathname) === stripTrailingSlash(href);
}

function stripTrailingSlash(path: string | null): string {
  if (!path) return "/";
  let trimmed = path;
  while (trimmed.endsWith("/")) trimmed = trimmed.slice(0, -1);
  return trimmed === "" ? "/" : trimmed;
}

export function BottomNav() {
  const pathname = usePathname();

  /**
   * The pill follows the finger, not the router.
   *
   * A tab change is a route transition that fetches, so `usePathname()` keeps
   * reporting the *previous* tab for its whole duration — on a phone that is
   * long enough for the highlight to stay put and the tap to read as ignored,
   * on the four controls that are pressed more than anything else in the app.
   * The tapped href is recorded here and painted immediately.
   *
   * The pathname it was tapped *from* is stored alongside it, which is what
   * lets the guess expire without an effect: the moment the router reports any
   * other pathname the promise is spent, whether it arrived where the finger
   * pointed or somewhere else entirely through a back gesture. Clearing it from
   * an effect instead would mean setting state during a commit purely to
   * describe something `pathname` already says.
   */
  const [pending, setPending] = useState<{ href: string; from: string } | null>(null);

  const pendingHref = pending?.from === (pathname ?? "") ? pending.href : null;

  return (
    <nav
      aria-label="Navegação principal"
      className="fixed inset-x-0 bottom-0 z-50 border-t border-border bg-card shadow-brand-lg"
    >
      <div className="mx-auto flex max-w-md items-center justify-around px-4 py-2 pb-[max(0.5rem,env(safe-area-inset-bottom))]">
        {TABS.map((tab) => {
          const Icon = tab.icon;
          // `aria-current` stays on the real pathname: the pill is a promise
          // about where the tap is going, "current page" is a statement of fact.
          const isCurrent = isActiveTab(pathname, tab.href);
          const isActive = isActiveTab(pendingHref ?? pathname, tab.href);

          return (
            <Link
              key={tab.href}
              href={tab.href}
              aria-current={isCurrent ? "page" : undefined}
              onClick={() => setPending({ href: tab.href, from: pathname ?? "" })}
              className={cn(
                "flex min-w-0 flex-1 flex-col items-center justify-center gap-1 py-2 press-feedback active:opacity-70",
                isActive ? "text-primary" : "text-muted-foreground hover:text-primary",
              )}
            >
              <span
                className={cn(
                  "flex h-7 w-14 items-center justify-center rounded-full press-feedback active:scale-90",
                  isActive ? "bg-primary-light" : "active:bg-muted",
                )}
              >
                <Icon size={20} />
              </span>
              <span className="truncate text-xs font-medium">{tab.label}</span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
