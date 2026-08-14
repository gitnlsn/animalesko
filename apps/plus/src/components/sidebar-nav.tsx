"use client";

import { Card, cn } from "@animalesko/ui";
import {
  Bell,
  Building2,
  CalendarDays,
  Dog,
  HeartHandshake,
  LayoutDashboard,
  Sparkles,
  Users,
} from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";

import { usePlus } from "~/lib/org-context.tsx";

/**
 * The prototype's five tabs, plus the three screens it never had.
 *
 * `Layout.tsx` held an `activeTab` string and swapped the body on it, so no
 * view was linkable. These are routes; `usePathname()` replaces the state.
 */
const ITEMS = [
  { href: "/", label: "Painel", icon: LayoutDashboard },
  { href: "/agenda", label: "Agenda", icon: CalendarDays },
  { href: "/animais", label: "Animais", icon: Dog },
  { href: "/clientes", label: "Clientes", icon: Users },
  { href: "/servicos", label: "Serviços", icon: Sparkles },
  { href: "/adocao", label: "Adoção", icon: HeartHandshake, shelterOnly: true },
  { href: "/notificacoes", label: "Notificações", icon: Bell },
  { href: "/organizacao", label: "Organização", icon: Building2 },
] as const;

function useVisibleItems() {
  const { org } = usePlus();

  // Only shelters publish animals for adoption; showing the tab to a dog
  // walker would lead to a screen they can never use.
  return ITEMS.filter((item) => !("shelterOnly" in item && item.shelterOnly) || org.isShelter);
}

export function SidebarNav() {
  const pathname = usePathname();
  const items = useVisibleItems();

  return (
    <nav aria-label="Navegação principal" className="hidden w-64 shrink-0 lg:block">
      <Card className="p-2">
        <ul className="space-y-1">
          {items.map((item) => {
            const Icon = item.icon;
            const isActive = pathname === item.href;

            return (
              <li key={item.href}>
                <Link
                  href={item.href}
                  aria-current={isActive ? "page" : undefined}
                  className={cn(
                    "flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors",
                    isActive
                      ? "bg-secondary text-secondary-foreground"
                      : "text-foreground hover:bg-muted",
                  )}
                >
                  <Icon size={16} className="shrink-0" />
                  {item.label}
                </Link>
              </li>
            );
          })}
        </ul>
      </Card>
    </nav>
  );
}

/** The same navigation as a scrollable strip, for narrow screens. */
export function MobileNav() {
  const pathname = usePathname();
  const items = useVisibleItems();

  return (
    <nav aria-label="Navegação principal" className="mb-6 lg:hidden">
      <Card className="overflow-x-auto p-2">
        <ul className="flex gap-2">
          {items.map((item) => {
            const Icon = item.icon;
            const isActive = pathname === item.href;

            return (
              <li key={item.href}>
                <Link
                  href={item.href}
                  aria-current={isActive ? "page" : undefined}
                  className={cn(
                    "flex h-auto w-20 flex-col items-center gap-1 rounded-lg p-2 text-center text-xs font-medium transition-colors",
                    isActive
                      ? "bg-secondary text-secondary-foreground"
                      : "text-foreground hover:bg-muted",
                  )}
                >
                  <Icon size={16} />
                  <span className="truncate">{item.label}</span>
                </Link>
              </li>
            );
          })}
        </ul>
      </Card>
    </nav>
  );
}
