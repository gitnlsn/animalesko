"use client";

import {
  Badge,
  Button,
  Popover,
  PopoverContent,
  PopoverTrigger,
  ScrollArea,
  Skeleton,
  cn,
  toast,
} from "@animalesko/ui";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Bell, CheckCheck, Calendar, Heart, Clock, MessageCircle, Siren, Info } from "lucide-react";
import Link from "next/link";
import { useState } from "react";

import { useTRPC } from "../trpc.ts";

import type { NotificationType } from "@animalesko/api/schemas";

const ICONS: Record<NotificationType, typeof Calendar> = {
  SERVICE: Calendar,
  ADOPTION: Heart,
  REMINDER: Clock,
  MESSAGE: MessageCircle,
  ALERT: Siren,
  SYSTEM: Info,
};

/**
 * Hoisted so the optimistic writes below can rebuild the exact same query key.
 * A tRPC key is derived from its input, and an inline literal that drifts by a
 * field patches a cache entry nothing is reading.
 */
const LIST_INPUT = { onlyUnread: false, limit: 20 };

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

  // Absolute fallback for anything older than a week: pin to the venue
  // timezone so the date shown doesn't shift with the device's timezone.
  return new Intl.DateTimeFormat("pt-BR", {
    day: "2-digit",
    month: "short",
    timeZone: "America/Sao_Paulo",
  }).format(date);
}

/**
 * The bell in the header.
 *
 * Every notification carries an `href` rather than the prototype's
 * `action: () => void`, so tapping one navigates instead of mutating a tab
 * variable — and the same notification is meaningful on a second device.
 */
export function NotificationDropdown({
  signedIn,
  /** See `AppHeader` — true while nobody knows yet whether there is a session. */
  resolving = false,
}: {
  signedIn: boolean;
  resolving?: boolean;
}) {
  const trpc = useTRPC();
  const queryClient = useQueryClient();
  const [open, setOpen] = useState(false);

  const notifications = useQuery({
    ...trpc.notification.list.queryOptions(LIST_INPUT),
    enabled: signedIn,
  });

  const unread = useQuery({
    ...trpc.notification.unreadCount.queryOptions(),
    enabled: signedIn,
  });

  const invalidate = () => queryClient.invalidateQueries({ queryKey: trpc.notification.pathKey() });

  const listKey = trpc.notification.list.queryKey(LIST_INPUT);
  const countKey = trpc.notification.unreadCount.queryKey();

  /**
   * Write "read" into both caches and hand back the undo.
   *
   * Invalidating on success left the row bold and the badge counting a
   * notification the reader had just opened, for a round trip plus the refetch
   * that follows it — by which time the popover has usually closed and the only
   * visible result is a number that changes on its own later. Both caches are
   * patched, not just the list: the badge reads `unreadCount`, and writing one
   * of the two is how a control ends up half-answering.
   */
  const patchRead = (matches: (id: string) => boolean) => {
    const previousList = queryClient.getQueryData(listKey);
    const previousCount = queryClient.getQueryData(countKey);

    const readAt = new Date();
    const cleared = (previousList ?? []).filter(
      (row) => row.readAt === null && matches(row.id),
    ).length;

    queryClient.setQueryData(listKey, (old) =>
      old?.map((row) => (row.readAt === null && matches(row.id) ? { ...row, readAt } : row)),
    );
    // Left alone when the count has never loaded: an unknown badge is not a
    // number to subtract from.
    queryClient.setQueryData(countKey, (old) =>
      old === undefined ? old : Math.max(0, old - cleared),
    );

    return () => {
      queryClient.setQueryData(listKey, previousList);
      queryClient.setQueryData(countKey, previousCount);
    };
  };

  /** A refetch that started before the tap would otherwise land after it. */
  const cancelReads = () =>
    Promise.all([
      queryClient.cancelQueries({ queryKey: listKey }),
      queryClient.cancelQueries({ queryKey: countKey }),
    ]);

  /*
   * The undo travels as the mutation context.
   *
   * `onMutate` exists only on a mutation's *own* options — the second argument
   * to `mutate()` is `MutateOptions`, which carries onSuccess/onError/onSettled
   * and nothing else, so an `onMutate` passed there is accepted by the compiler
   * and then never called. That puts the callbacks on the useMutation options,
   * where a rollback closed over one render could be replaced by the next one
   * before the error arrives.
   *
   * Whatever `onMutate` returns is handed to `onError` for that same call, so
   * the undo is carried per mutation rather than per component. A ref would
   * also outlive the render, but it holds exactly one value: two rows marked
   * read in quick succession would leave the second overwriting the first's
   * undo, and a failure would then restore the wrong row.
   */
  const markRead = useMutation(
    trpc.notification.markRead.mutationOptions({
      onMutate: async ({ id }) => {
        await cancelReads();
        return patchRead((rowId) => rowId === id);
      },
      onError: (error, _variables, rollback) => {
        rollback?.();
        toast.error(error.message);
      },
      onSettled: invalidate,
    }),
  );

  const markAllRead = useMutation(
    trpc.notification.markAllRead.mutationOptions({
      onMutate: async () => {
        await cancelReads();
        return patchRead(() => true);
      },
      onError: (error, _variables, rollback) => {
        rollback?.();
        toast.error(error.message);
      },
      onSettled: invalidate,
    }),
  );

  const unreadCount = unread.data ?? 0;
  const items = notifications.data ?? [];

  // A disabled query reports `pending` forever, so this cannot be
  // `notifications.isPending` on its own — a signed-out visitor would sit under
  // a loading list instead of being told to sign in.
  const listPending = resolving || (signedIn && notifications.isPending);

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          aria-label={
            resolving || unreadCount === 0
              ? "Notificações"
              : `Notificações, ${unreadCount} não lidas`
          }
          aria-busy={resolving || undefined}
          // `active:` alongside `hover:`: the ghost variant's own
          // `active:bg-muted` would paint grey over the gradient header.
          className="relative text-primary-foreground hover:bg-primary-foreground/10 hover:text-primary-foreground active:bg-primary-foreground/25 active:text-primary-foreground"
        >
          <Bell size={20} className={cn(resolving && "opacity-60")} />
          {/* While the session is unresolved a bare bell is not "no unread
              notifications", it is "we have not asked yet" — so the corner
              carries a placeholder rather than an answer. */}
          {resolving ? (
            <span
              aria-hidden
              className="absolute -top-1 -right-1 size-5 animate-pulse rounded-full border-2 border-primary bg-primary-foreground/40"
            />
          ) : unreadCount > 0 ? (
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
          {/* "Nenhuma notificação no momento 🐾" over a list that is still in
              flight is a claim about data nobody has yet, and it corrects
              itself in front of the reader. The pending branch comes first. */}
          {listPending ? (
            <NotificationListSkeleton />
          ) : items.length === 0 ? (
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
                  "block w-full p-4 text-left press-feedback hover:bg-muted/50 active:bg-muted",
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

/** Four rows shaped like the real ones: icon disc, title, timestamp, body. */
function NotificationListSkeleton() {
  return (
    <ul className="divide-y divide-border">
      {Array.from({ length: 4 }, (_, i) => (
        <li key={i} className="flex gap-3 p-4">
          <Skeleton className="mt-1 size-8 shrink-0 rounded-full" />
          <div className="min-w-0 flex-1 space-y-2">
            <div className="flex items-start justify-between gap-2">
              <Skeleton className="h-5 w-32" />
              <Skeleton className="h-4 w-14 shrink-0" />
            </div>
            <Skeleton className="h-5 w-full" />
          </div>
        </li>
      ))}
    </ul>
  );
}
