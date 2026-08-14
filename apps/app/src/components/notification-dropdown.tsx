"use client";

import {
  Badge,
  Button,
  Popover,
  PopoverContent,
  PopoverTrigger,
  ScrollArea,
  cn,
} from "@animalesko/ui";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Bell, CheckCheck, Calendar, Heart, Clock, MessageCircle, Siren, Info } from "lucide-react";
import Link from "next/link";
import { useState } from "react";

import { useTRPC } from "~/trpc/react.tsx";

import type { NotificationType } from "@animalesko/api/schemas";

const ICONS: Record<NotificationType, typeof Calendar> = {
  SERVICE: Calendar,
  ADOPTION: Heart,
  REMINDER: Clock,
  MESSAGE: MessageCircle,
  ALERT: Siren,
  SYSTEM: Info,
};

const ICON_TONES: Record<NotificationType, string> = {
  SERVICE: "text-primary",
  ADOPTION: "text-accent",
  REMINDER: "text-secondary",
  MESSAGE: "text-primary",
  ALERT: "text-destructive",
  SYSTEM: "text-muted-foreground",
};

/** "Há 2 horas", "Ontem", "Agora" — the prototype stored these as fixed strings. */
function relativeTime(date: Date): string {
  const minutes = Math.round((Date.now() - date.getTime()) / 60_000);

  if (minutes < 1) return "Agora";
  if (minutes < 60) return `Há ${minutes} min`;

  const hours = Math.round(minutes / 60);
  if (hours < 24) return `Há ${hours} ${hours === 1 ? "hora" : "horas"}`;

  const days = Math.round(hours / 24);
  if (days === 1) return "Ontem";
  if (days < 7) return `Há ${days} dias`;

  return new Intl.DateTimeFormat("pt-BR", { day: "2-digit", month: "short" }).format(date);
}

/**
 * The bell in the header.
 *
 * Every notification carries an `href` rather than the prototype's
 * `action: () => void`, so tapping one navigates instead of mutating a tab
 * variable — and the same notification is meaningful on a second device.
 */
export function NotificationDropdown({ signedIn }: { signedIn: boolean }) {
  const trpc = useTRPC();
  const queryClient = useQueryClient();
  const [open, setOpen] = useState(false);

  const notifications = useQuery({
    ...trpc.notification.list.queryOptions({ onlyUnread: false, limit: 20 }),
    enabled: signedIn,
  });

  const unread = useQuery({
    ...trpc.notification.unreadCount.queryOptions(),
    enabled: signedIn,
  });

  const invalidate = () => queryClient.invalidateQueries({ queryKey: trpc.notification.pathKey() });

  const markRead = useMutation(
    trpc.notification.markRead.mutationOptions({ onSuccess: invalidate }),
  );
  const markAllRead = useMutation(
    trpc.notification.markAllRead.mutationOptions({ onSuccess: invalidate }),
  );

  const unreadCount = unread.data ?? 0;
  const items = notifications.data ?? [];

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          aria-label={unreadCount > 0 ? `Notificações, ${unreadCount} não lidas` : "Notificações"}
          className="relative text-primary-foreground hover:bg-primary-foreground/10 hover:text-primary-foreground"
        >
          <Bell size={20} />
          {unreadCount > 0 ? (
            <Badge className="absolute -top-1 -right-1 flex size-5 min-w-5 items-center justify-center border-2 border-primary bg-destructive p-0 text-destructive-foreground">
              {unreadCount > 9 ? "9+" : unreadCount}
            </Badge>
          ) : null}
        </Button>
      </PopoverTrigger>

      <PopoverContent className="w-80 border-border bg-card p-0" align="end" sideOffset={8}>
        <div className="flex items-center justify-between border-b border-border p-4">
          <h2 className="font-semibold text-foreground">Notificações</h2>
          {unreadCount > 0 ? (
            <Button
              variant="ghost"
              size="sm"
              className="h-8 text-xs text-primary"
              loading={markAllRead.isPending}
              onClick={() => markAllRead.mutate()}
            >
              <CheckCheck size={14} />
              Marcar todas
            </Button>
          ) : null}
        </div>

        <ScrollArea className="h-96">
          {items.length === 0 ? (
            <div className="flex flex-col items-center justify-center px-4 py-12 text-center">
              <Bell size={48} className="mb-3 text-muted-foreground/30" />
              <p className="text-muted-foreground">
                {signedIn
                  ? "Nenhuma notificação no momento 🐾"
                  : "Entre para ver suas notificações"}
              </p>
            </div>
          ) : (
            <ul className="divide-y divide-border">
              {items.map((notification) => {
                const Icon = ICONS[notification.type];
                const isUnread = notification.readAt === null;

                const content = (
                  <div className="flex gap-3">
                    <div className="mt-1 shrink-0">
                      <div className="flex size-8 items-center justify-center rounded-full bg-muted">
                        <Icon size={16} className={ICON_TONES[notification.type]} />
                      </div>
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="mb-1 flex items-start justify-between gap-2">
                        <h3
                          className={cn(
                            "text-sm text-foreground",
                            isUnread ? "font-semibold" : "font-medium",
                          )}
                        >
                          {notification.title}
                        </h3>
                        <span className="shrink-0 text-xs text-muted-foreground">
                          {relativeTime(notification.createdAt)}
                        </span>
                      </div>
                      {notification.body ? (
                        <p className="text-sm text-muted-foreground">{notification.body}</p>
                      ) : null}
                    </div>
                  </div>
                );

                const className = cn(
                  "block w-full p-4 text-left transition-colors hover:bg-muted/50",
                  isUnread && "border-l-4 border-l-primary bg-primary/5",
                );

                const onSelect = () => {
                  if (isUnread) markRead.mutate({ id: notification.id });
                  setOpen(false);
                };

                return (
                  <li key={notification.id}>
                    {notification.href ? (
                      <Link href={notification.href} className={className} onClick={onSelect}>
                        {content}
                      </Link>
                    ) : (
                      <button type="button" className={className} onClick={onSelect}>
                        {content}
                      </button>
                    )}
                  </li>
                );
              })}
            </ul>
          )}
        </ScrollArea>
      </PopoverContent>
    </Popover>
  );
}
