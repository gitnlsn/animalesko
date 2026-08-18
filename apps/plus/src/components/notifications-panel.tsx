"use client";

import { Badge, Button, Card, CardContent, ListSkeleton, cn, toast } from "@animalesko/ui";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Bell, CheckCheck } from "lucide-react";
import Link from "next/link";

import { formatDateTimePtBR } from "~/lib/display.ts";
import { useTRPC } from "~/trpc/react.tsx";

/**
 * The prototype's "Alertas" tab was a permanent placeholder: a card reading
 * "Alertas em Desenvolvimento". These are real rows — bookings arriving from
 * the consumer app, adoption applications, messages.
 */
export function NotificationsPanel() {
  const trpc = useTRPC();
  const queryClient = useQueryClient();

  const notifications = useQuery(
    trpc.notification.list.queryOptions({ onlyUnread: false, limit: 50 }),
  );

  const invalidate = () => queryClient.invalidateQueries({ queryKey: trpc.notification.pathKey() });

  const markAllRead = useMutation(
    trpc.notification.markAllRead.mutationOptions({
      onSuccess: () => {
        toast.success("Tudo marcado como lido.");
        void invalidate();
      },
    }),
  );

  const markRead = useMutation(
    trpc.notification.markRead.mutationOptions({ onSuccess: invalidate }),
  );

  const items = notifications.data ?? [];
  const unread = items.filter((notification) => !notification.readAt).length;

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-primary">Notificações</h1>
          <p className="text-muted-foreground">
            {unread > 0 ? `${unread} não ${unread === 1 ? "lida" : "lidas"}` : "Tudo em dia"}
          </p>
        </div>

        {unread > 0 ? (
          <Button
            variant="outline"
            loading={markAllRead.isPending}
            onClick={() => markAllRead.mutate()}
          >
            <CheckCheck size={16} />
            Marcar todas como lidas
          </Button>
        ) : null}
      </div>

      {notifications.isPending ? (
        <ListSkeleton count={5} />
      ) : items.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center gap-3 p-12 text-center">
            <Bell className="size-10 text-muted-foreground" />
            <p className="font-medium">Nenhuma notificação</p>
            <p className="text-sm text-muted-foreground">
              Agendamentos feitos pelos tutores e candidaturas de adoção aparecem aqui.
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-2">
          {items.map((notification) => {
            const isUnread = !notification.readAt;

            const body = (
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className={cn("font-medium", isUnread && "font-semibold")}>
                    {notification.title}
                  </p>
                  {notification.body ? (
                    <p className="text-sm text-muted-foreground">{notification.body}</p>
                  ) : null}
                  <p className="mt-1 text-xs text-muted-foreground">
                    {formatDateTimePtBR(notification.createdAt)}
                  </p>
                </div>
                {isUnread ? <Badge className="shrink-0">Nova</Badge> : null}
              </div>
            );

            const className = cn(
              "block w-full rounded-lg border p-4 text-left transition-colors hover:bg-muted/50",
              isUnread && "border-l-4 border-l-primary bg-primary/5",
            );

            const onSelect = () => {
              if (isUnread) markRead.mutate({ id: notification.id });
            };

            /*
             * `href` points at consumer-app routes for notifications raised on
             * the tutor's behalf, so only same-app links are followed here — a
             * provider clicking "/historico" would land on a 404.
             */
            const internal =
              notification.href?.startsWith("/agenda") || notification.href?.startsWith("/adocao");

            return internal && notification.href ? (
              <Link
                key={notification.id}
                href={notification.href}
                className={className}
                onClick={onSelect}
              >
                {body}
              </Link>
            ) : (
              <button key={notification.id} type="button" className={className} onClick={onSelect}>
                {body}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
