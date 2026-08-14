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
          const isActive = pathname === tab.href;

          return (
            <Link
              key={tab.href}
              href={tab.href}
              aria-current={isActive ? "page" : undefined}
              className={cn(
                "flex min-w-0 flex-1 flex-col items-center justify-center rounded-lg px-3 py-2 transition-smooth",
                isActive
                  ? "bg-primary-light text-primary"
                  : "text-muted-foreground hover:bg-muted hover:text-primary",
              )}
            >
              <Icon size={20} className={cn("mb-1 transition-smooth", isActive && "scale-110")} />
              <span className="truncate text-xs font-medium">{tab.label}</span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
