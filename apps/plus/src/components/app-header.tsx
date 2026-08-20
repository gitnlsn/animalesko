"use client";

import {
  Avatar,
  AvatarFallback,
  AvatarImage,
  Badge,
  Button,
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
  ScrollArea,
  cn,
  initials,
} from "@animalesko/ui";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  Bell,
  Building2,
  CalendarDays,
  CheckCheck,
  Dog,
  ExternalLink,
  LayoutDashboard,
  LogOut,
  PawPrint,
  Settings,
} from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";

import { ThemeToggle } from "./theme-toggle.tsx";
import { signOut } from "~/lib/auth-client.ts";
import { usePlus } from "~/lib/org-context.tsx";
import { useTRPC } from "~/trpc/react.tsx";

/**
 * The prototype's header: a logo that opens a shortcut menu, a notification
 * bell, a settings menu and an account control.
 */
export function AppHeader() {
  const { org, user } = usePlus();
  const router = useRouter();

  return (
    <header className="border-b bg-card shadow-brand-sm">
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between gap-4 px-4 sm:px-6 lg:px-8">
        <LogoMenu />

        <div className="flex items-center gap-2">
          <NotificationBell />

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon" aria-label="Configurações">
                <Settings size={18} />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent className="w-64">
              <DropdownMenuLabel>Configurações</DropdownMenuLabel>
              <DropdownMenuSeparator />
              <div className="flex items-center justify-between gap-4 px-2 py-1.5">
                <span className="text-sm">Modo escuro</span>
                <ThemeToggle />
              </div>
              <DropdownMenuSeparator />
              <DropdownMenuItem asChild>
                <Link href="/organizacao">
                  <Building2 size={16} />
                  Dados da organização
                </Link>
              </DropdownMenuItem>
              <DropdownMenuItem asChild>
                <a
                  href={process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000"}
                  target="_blank"
                  rel="noreferrer"
                >
                  <ExternalLink size={16} />
                  Ver como tutor
                </a>
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" className="gap-2 px-2">
                <Avatar className="size-8">
                  <AvatarImage src={user.image ?? undefined} alt="" />
                  <AvatarFallback className="bg-gradient-primary text-xs text-gradient-foreground">
                    {initials(user.name)}
                  </AvatarFallback>
                </Avatar>
                <span className="hidden text-sm font-medium sm:inline">{org.name}</span>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent className="w-64">
              <DropdownMenuLabel>
                <p className="font-medium">{user.name}</p>
                <p className="text-xs font-normal text-muted-foreground">{user.email}</p>
              </DropdownMenuLabel>
              <DropdownMenuSeparator />
              <OrganizationSwitcher />
              <DropdownMenuSeparator />
              <DropdownMenuItem
                className="text-destructive"
                onSelect={async () => {
                  await signOut();
                  router.refresh();
                  router.push("/entrar");
                }}
              >
                <LogOut size={16} />
                Sair
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>
    </header>
  );
}

/** The prototype's `LogoMenu` — the wordmark doubling as a shortcut menu. */
function LogoMenu() {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" className="gap-2 px-2">
          <span className="flex size-8 items-center justify-center rounded-lg bg-gradient-primary">
            <PawPrint size={18} className="text-gradient-foreground" />
          </span>
          <span className="text-lg font-bold text-primary">
            Animalesko <span className="text-secondary">Plus</span>
          </span>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start" className="w-56">
        {/* The wordmark opens this menu instead of linking home, so without a
            Painel entry the header offered no route back to the dashboard at
            all — only the sidebar did, and that is hidden below `lg`. */}
        <DropdownMenuItem asChild>
          <Link href="/">
            <LayoutDashboard size={16} />
            Painel
          </Link>
        </DropdownMenuItem>
        <DropdownMenuItem asChild>
          <Link href="/agenda">
            <CalendarDays size={16} />
            Agendamentos
          </Link>
        </DropdownMenuItem>
        <DropdownMenuItem asChild>
          <Link href="/animais">
            <Dog size={16} />
            Ficha dos animais
          </Link>
        </DropdownMenuItem>
        <DropdownMenuItem asChild>
          <Link href="/notificacoes">
            <Bell size={16} />
            Notificações
          </Link>
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem asChild>
          <Link href="/organizacao">
            <Settings size={16} />
            Configurações
          </Link>
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

/**
 * Lists the caller's organizations.
 *
 * Read-only for now: switching the active one writes
 * `Session.activeOrganizationId`, and Better Auth has no procedure for that
 * yet. Showing which is active beats hiding the fact that others exist.
 */
function OrganizationSwitcher() {
  const { org, organizations } = usePlus();

  if (organizations.length <= 1) return null;

  return (
    <>
      <DropdownMenuLabel className="text-xs">Organizações</DropdownMenuLabel>
      {organizations.map((candidate) => (
        <DropdownMenuItem key={candidate.id} disabled>
          <Building2 size={16} />
          <span className="flex-1 truncate">{candidate.name}</span>
          {candidate.id === org.id ? (
            <Badge variant="secondary" className="text-xs">
              Ativa
            </Badge>
          ) : null}
        </DropdownMenuItem>
      ))}
    </>
  );
}

/** The prototype's `NotificationBell`, backed by real rows. */
function NotificationBell() {
  const trpc = useTRPC();
  const queryClient = useQueryClient();

  const notifications = useQuery(
    trpc.notification.list.queryOptions({ onlyUnread: false, limit: 15 }),
  );
  const unread = useQuery(trpc.notification.unreadCount.queryOptions());

  const invalidate = () => queryClient.invalidateQueries({ queryKey: trpc.notification.pathKey() });

  const markAllRead = useMutation(
    trpc.notification.markAllRead.mutationOptions({ onSuccess: invalidate }),
  );
  const markRead = useMutation(
    trpc.notification.markRead.mutationOptions({ onSuccess: invalidate }),
  );

  const unreadCount = unread.data ?? 0;
  const items = notifications.data ?? [];

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          aria-label={unreadCount > 0 ? `Notificações, ${unreadCount} não lidas` : "Notificações"}
          className="relative"
        >
          <Bell size={18} />
          {unreadCount > 0 ? (
            <Badge className="absolute -top-1 -right-1 flex size-5 min-w-5 items-center justify-center bg-destructive p-0 text-destructive-foreground">
              {unreadCount > 9 ? "9+" : unreadCount}
            </Badge>
          ) : null}
        </Button>
      </DropdownMenuTrigger>

      <DropdownMenuContent className="w-80 p-0">
        <div className="flex items-center justify-between border-b p-3">
          <span className="font-semibold">Notificações</span>
          {unreadCount > 0 ? (
            <Button
              variant="ghost"
              size="sm"
              className="h-7 text-xs text-primary"
              loading={markAllRead.isPending}
              onClick={() => markAllRead.mutate()}
            >
              <CheckCheck size={14} />
              Marcar todas
            </Button>
          ) : null}
        </div>

        <ScrollArea className="h-80">
          {items.length === 0 ? (
            <p className="p-8 text-center text-sm text-muted-foreground">Nada por aqui ainda 🐾</p>
          ) : (
            <ul className="divide-y">
              {items.map((notification) => (
                <li key={notification.id}>
                  <button
                    type="button"
                    onClick={() => {
                      if (!notification.readAt) markRead.mutate({ id: notification.id });
                    }}
                    className={cn(
                      "block w-full p-3 text-left transition-colors hover:bg-muted/50",
                      !notification.readAt && "border-l-4 border-l-primary bg-primary/5",
                    )}
                  >
                    <p className="text-sm font-medium">{notification.title}</p>
                    {notification.body ? (
                      <p className="text-xs text-muted-foreground">{notification.body}</p>
                    ) : null}
                  </button>
                </li>
              ))}
            </ul>
          )}
        </ScrollArea>

        <div className="border-t p-2">
          <Button asChild variant="ghost" size="sm" className="w-full">
            <Link href="/notificacoes">Ver todas</Link>
          </Button>
        </div>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
