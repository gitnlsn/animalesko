"use client";

import { cn } from "@animalesko/ui";
import { Calendar, Heart, Home, User } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";

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

  return (
    <nav
      aria-label="Navegação principal"
      className="fixed inset-x-0 bottom-0 z-50 border-t border-border bg-card shadow-brand-lg"
    >
      <div className="mx-auto flex max-w-md items-center justify-around px-4 py-2 pb-[max(0.5rem,env(safe-area-inset-bottom))]">
        {TABS.map((tab) => {
          const Icon = tab.icon;
          const isActive = isActiveTab(pathname, tab.href);

          return (
            <Link
              key={tab.href}
              href={tab.href}
              aria-current={isActive ? "page" : undefined}
              className={cn(
                "flex min-w-0 flex-1 flex-col items-center justify-center gap-1 py-2 transition-smooth active:opacity-80",
                isActive ? "text-primary" : "text-muted-foreground hover:text-primary",
              )}
            >
              <span
                className={cn(
                  "flex h-7 w-14 items-center justify-center rounded-full transition-smooth",
                  isActive ? "bg-primary-light" : "active:bg-muted",
                )}
              >
                <Icon size={20} className="transition-smooth" />
              </span>
              <span className="truncate text-xs font-medium">{tab.label}</span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
