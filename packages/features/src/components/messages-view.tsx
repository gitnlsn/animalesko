"use client";

import {
  Avatar,
  AvatarFallback,
  Badge,
  Button,
  Card,
  CardContent,
  Input,
  ListSkeleton,
  ScrollArea,
  ThreadSkeleton,
  cn,
  initials,
  toast,
} from "@animalesko/ui";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { ArrowLeft, MapPin, MessageCircle, Send } from "lucide-react";
import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useRef, useState } from "react";

import { MESSAGES_CONVERSATIONS_INPUT } from "../lib/query-inputs.ts";
import { useSession } from "../lib/session-context.tsx";
import { useTRPC } from "../trpc.ts";

/** How often an open thread re-polls. */
const THREAD_POLL_MS = 5_000;

/**
 * The inbox and one thread.
 *
 * The prototype held two hardcoded conversations and five hardcoded messages in
 * `useState`, so "sending" appended to an array that reset on reload and no
 * second person ever saw. These are rows, and the other side is notified.
 *
 * Freshness is polling, not a subscription: tRPC subscriptions need a WebSocket
 * or SSE transport that this deployment does not have. This is the seam where
 * that would go.
 */
export function MessagesView() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const active = searchParams.get("conversa");

  return active ? (
    <Thread conversationId={active} onBack={() => router.push("/mensagens")} />
  ) : (
    <ConversationList onOpen={(id) => router.push(`/mensagens?conversa=${id}`)} />
  );
}

function ConversationList({ onOpen }: { onOpen: (id: string) => void }) {
  const trpc = useTRPC();
  const conversations = useQuery(
    trpc.message.conversations.queryOptions(MESSAGES_CONVERSATIONS_INPUT),
  );

  if (conversations.isPending) {
    return <ListSkeleton count={5} withMedia />;
  }

  const items = conversations.data ?? [];

  if (items.length === 0) {
    return (
      <Card>
        <CardContent className="flex flex-col items-center gap-3 p-12 text-center">
          <MessageCircle className="size-10 text-muted-foreground" />
          <p className="font-medium">Nenhuma conversa ainda</p>
          <p className="text-sm text-muted-foreground">
            Fale com um abrigo a partir da página de um pet e a conversa aparece aqui.
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <ul className="space-y-2">
      {items.map((conversation) => {
        const name = conversation.org?.name ?? "Conversa";

        return (
          <li key={conversation.id}>
            <button
              type="button"
              onClick={() => onOpen(conversation.id)}
              className="flex w-full items-center gap-3 rounded-xl border border-border bg-card p-3 text-left transition-colors hover:bg-muted/50"
            >
              <Avatar className="size-12 shrink-0">
                <AvatarFallback className="bg-gradient-primary text-gradient-foreground">
                  {initials(name)}
                </AvatarFallback>
              </Avatar>

              <div className="min-w-0 flex-1">
                <div className="flex items-center justify-between gap-2">
                  <h3 className="truncate font-semibold">{name}</h3>
                  {conversation.unreadCount > 0 ? (
                    <Badge className="shrink-0">{conversation.unreadCount}</Badge>
                  ) : null}
                </div>
                <p className="truncate text-sm text-muted-foreground">
                  {conversation.lastMessage?.body ??
                    (conversation.lastMessage ? "Anexo" : "Sem mensagens ainda")}
                </p>
                {conversation.listing ? (
                  <p className="truncate text-xs text-muted-foreground">
                    Sobre {conversation.listing.pet.name}
                  </p>
                ) : null}
              </div>
            </button>
          </li>
        );
      })}
    </ul>
  );
}

function Thread({ conversationId, onBack }: { conversationId: string; onBack: () => void }) {
  const trpc = useTRPC();
  const queryClient = useQueryClient();
  const { userId } = useSession();
  const [draft, setDraft] = useState("");
  const bottomRef = useRef<HTMLDivElement>(null);

  const thread = useQuery({
    ...trpc.message.thread.queryOptions({ conversationId, limit: 100 }),
    refetchInterval: THREAD_POLL_MS,
  });

  const markRead = useMutation(trpc.message.markRead.mutationOptions());

  const send = useMutation(
    trpc.message.send.mutationOptions({
      onSuccess: async () => {
        setDraft("");
        await queryClient.invalidateQueries({ queryKey: trpc.message.pathKey() });
      },
      onError: (error) => toast.error(error.message),
    }),
  );

  // Opening a thread is reading it. Fired once per thread rather than on every
  // poll, which would be a write every five seconds.
  useEffect(() => {
    markRead.mutate({ conversationId });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [conversationId]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [thread.data?.length]);

  const messages = thread.data ?? [];

  return (
    // 8rem was a guess at the surrounding chrome, and a guess is wrong on any
    // device that adds to it: the iOS home indicator and Android's gesture bar
    // both sit inside the dynamic viewport, so the composer ended up under them
    // or below the fold entirely. Subtracting the inset the platform actually
    // reports keeps the last message and the text field on screen without
    // needing to know which platform is asking.
    <div className="flex h-[calc(100dvh-8rem-env(safe-area-inset-bottom))] flex-col">
      <Button variant="ghost" size="sm" className="mb-2 self-start" onClick={onBack}>
        <ArrowLeft size={16} />
        Todas as conversas
      </Button>

      <ScrollArea className="flex-1 rounded-xl border bg-card p-3">
        {thread.isPending ? (
          <ThreadSkeleton />
        ) : messages.length === 0 ? (
          <p className="p-8 text-center text-sm text-muted-foreground">
            Nenhuma mensagem ainda. Diga olá 👋
          </p>
        ) : (
          <ul className="space-y-3">
            {messages.map((message) => {
              const mine = message.sender.id === userId;

              return (
                <li key={message.id} className={cn("flex", mine ? "justify-end" : "justify-start")}>
                  <div
                    className={cn(
                      "max-w-[80%] rounded-2xl px-3 py-2 text-sm",
                      mine
                        ? "rounded-br-sm bg-primary text-primary-foreground"
                        : "rounded-bl-sm bg-muted text-foreground",
                    )}
                  >
                    {!mine ? (
                      <p className="mb-0.5 text-xs font-medium opacity-70">{message.sender.name}</p>
                    ) : null}

                    {message.body ? <p className="whitespace-pre-wrap">{message.body}</p> : null}

                    {message.latitude !== null && message.longitude !== null ? (
                      <a
                        href={`https://www.openstreetmap.org/?mlat=${message.latitude}&mlon=${message.longitude}#map=16/${message.latitude}/${message.longitude}`}
                        target="_blank"
                        rel="noreferrer"
                        className="mt-1 flex items-center gap-1 text-xs underline"
                      >
                        <MapPin size={12} />
                        Ver localização
                      </a>
                    ) : null}

                    <time
                      dateTime={message.createdAt.toISOString()}
                      className="mt-1 block text-right text-[0.65rem] opacity-60"
                    >
                      {/* Pinned to the venue timezone so a device set to a
                          different timezone doesn't shift the hour shown. */}
                      {new Intl.DateTimeFormat("pt-BR", {
                        hour: "2-digit",
                        minute: "2-digit",
                        timeZone: "America/Sao_Paulo",
                      }).format(message.createdAt)}
                    </time>
                  </div>
                </li>
              );
            })}
          </ul>
        )}
        <div ref={bottomRef} />
      </ScrollArea>

      <form
        className="mt-3 flex gap-2"
        onSubmit={(event) => {
          event.preventDefault();
          if (!draft.trim()) return;
          send.mutate({ conversationId, body: draft.trim() });
        }}
      >
        <Input
          value={draft}
          onChange={(event) => setDraft(event.target.value)}
          placeholder="Escreva uma mensagem…"
          aria-label="Mensagem"
        />
        <Button
          type="button"
          variant="outline"
          size="icon"
          aria-label="Enviar localização"
          loading={send.isPending}
          onClick={() => {
            if (!navigator.geolocation) {
              toast.error("Seu navegador não expõe localização.");
              return;
            }

            navigator.geolocation.getCurrentPosition(
              (position) =>
                send.mutate({
                  conversationId,
                  latitude: position.coords.latitude,
                  longitude: position.coords.longitude,
                }),
              () => toast.error("Não foi possível obter sua localização."),
            );
          }}
        >
          <MapPin size={16} />
        </Button>
        <Button type="submit" size="icon" aria-label="Enviar" loading={send.isPending}>
          <Send size={16} />
        </Button>
      </form>
    </div>
  );
}
