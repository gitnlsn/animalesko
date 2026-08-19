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
 * Shared by the thread's own query and the prefetch the list fires on tap. A
 * tRPC key is derived from its input, so the two have to be the same value or
 * the prefetched entry is written under a key nothing ever reads.
 */
const THREAD_MESSAGE_LIMIT = 100;

/**
 * Marks a bubble that exists only in the cache so far.
 *
 * The row the server will return has a real cuid, so nothing it sends can
 * collide with this, and the id is the only place to carry the flag: the cache
 * holds `MessageDTO[]` and an extra field on one entry would not type.
 */
const OPTIMISTIC_PREFIX = "optimistic:";

/** Monotonic, so two sends in the same millisecond cannot share a React key. */
let optimisticSeq = 0;

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
  const trpc = useTRPC();
  const queryClient = useQueryClient();
  const searchParams = useSearchParams();
  const router = useRouter();
  const active = searchParams.get("conversa");

  return active ? (
    <Thread conversationId={active} onBack={() => router.push("/mensagens")} />
  ) : (
    <ConversationList
      onOpen={(id) => {
        // Opening a conversation is a route change, so this list unmounts and
        // the thread mounts with nothing — the request only starts once the
        // screen the reader is waiting on is already on screen. Starting it on
        // the tap buys back the whole navigation.
        void queryClient.prefetchQuery(
          trpc.message.thread.queryOptions({ conversationId: id, limit: THREAD_MESSAGE_LIMIT }),
        );
        router.push(`/mensagens?conversa=${id}`);
      }}
    />
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
              // The inbox's primary control, and `hover:` was all it had:
              // nothing at all answered the finger on a device.
              className="flex w-full items-center gap-3 rounded-xl border border-border bg-card p-3 text-left press-feedback hover:bg-muted/50 active:scale-[0.99] active:bg-muted"
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
  const { userId, name } = useSession();
  const [draft, setDraft] = useState("");
  const [locating, setLocating] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);

  const threadKey = trpc.message.thread.queryKey({
    conversationId,
    limit: THREAD_MESSAGE_LIMIT,
  });

  const markRead = useMutation(trpc.message.markRead.mutationOptions());

  /**
   * Sending, answered on the same frame as the tap.
   *
   * The bubble used to appear only after the round trip, the invalidate and the
   * refetch, with the text still sitting in the composer the whole time — which
   * on a phone reads as a send that did not happen, so people send it again.
   * The server is still the authority: `onSettled` refetches either way, and a
   * failure puts both the bubble and the draft back.
   */
  const send = useMutation(
    trpc.message.send.mutationOptions({
      onMutate: async (variables) => {
        await queryClient.cancelQueries({ queryKey: threadKey });

        const previousMessages = queryClient.getQueryData(threadKey);
        const previousDraft = draft;

        if (variables.body) setDraft("");

        queryClient.setQueryData(threadKey, (current) => [
          ...(current ?? []),
          {
            id: `${OPTIMISTIC_PREFIX}${++optimisticSeq}`,
            body: variables.body ?? null,
            imageUrl: variables.imageUrl ?? null,
            latitude: variables.latitude ?? null,
            longitude: variables.longitude ?? null,
            createdAt: new Date(),
            sender: { id: userId ?? "", name: name ?? "", image: null },
          },
        ]);

        // Returned rather than kept in a ref: whatever `onMutate` gives back
        // reaches `onError` as this call's context, so two sends in flight
        // each carry their own undo instead of sharing one slot.
        return () => {
          queryClient.setQueryData(threadKey, previousMessages);
          if (variables.body) setDraft(previousDraft);
        };
      },
      onError: (error, _variables, rollback) => {
        rollback?.();
        toast.error(error.message);
      },
      onSettled: async () => {
        await queryClient.invalidateQueries({ queryKey: trpc.message.pathKey() });
      },
    }),
  );

  const thread = useQuery({
    ...trpc.message.thread.queryOptions({ conversationId, limit: THREAD_MESSAGE_LIMIT }),
    // A poll landing mid-send returns a thread that does not contain the
    // optimistic bubble yet, which would blink the message out and back in.
    refetchInterval: send.isPending ? false : THREAD_POLL_MS,
  });

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
              const sending = message.id.startsWith(OPTIMISTIC_PREFIX);

              return (
                <li key={message.id} className={cn("flex", mine ? "justify-end" : "justify-start")}>
                  <div
                    className={cn(
                      "max-w-[80%] rounded-2xl px-3 py-2 text-sm",
                      mine
                        ? "rounded-br-sm bg-primary text-primary-foreground"
                        : "rounded-bl-sm bg-muted text-foreground",
                      sending && "opacity-70",
                    )}
                    aria-busy={sending || undefined}
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
                        className="mt-1 flex items-center gap-1 text-xs underline press-feedback active:opacity-60"
                      >
                        <MapPin size={12} />
                        Ver localização
                      </a>
                    ) : null}

                    {sending ? (
                      <span className="mt-1 block text-right text-[0.65rem] opacity-60">
                        Enviando…
                      </span>
                    ) : (
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
                    )}
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
        {/* Its own flag, and not the send button's. Acquiring a fix takes
            seconds and happens *before* the mutation exists, so `send.isPending`
            is false for the whole wait — while also spinning this button every
            time a plain text message was sent. */}
        <Button
          type="button"
          variant="outline"
          size="icon"
          aria-label="Enviar localização"
          loading={locating}
          onClick={() => {
            if (!navigator.geolocation) {
              toast.error("Seu navegador não expõe localização.");
              return;
            }

            setLocating(true);
            navigator.geolocation.getCurrentPosition(
              (position) =>
                send.mutate(
                  {
                    conversationId,
                    latitude: position.coords.latitude,
                    longitude: position.coords.longitude,
                  },
                  { onSettled: () => setLocating(false) },
                ),
              () => {
                setLocating(false);
                toast.error("Não foi possível obter sua localização.");
              },
            );
          }}
        >
          {locating ? null : <MapPin size={16} />}
        </Button>
        {/* No `loading` here: the pending bubble is the feedback, and blocking
            the button would stop the next message being written while the last
            one is still in flight. */}
        <Button type="submit" size="icon" aria-label="Enviar">
          <Send size={16} />
        </Button>
      </form>
    </div>
  );
}
