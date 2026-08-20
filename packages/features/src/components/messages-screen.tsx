"use client";

import { useSearchParams } from "next/navigation";

import { MessagesView } from "./messages-view.tsx";
import { PageHeader } from "./page-header.tsx";

/** Mensagens — conversation list, or one thread when ?conversa= is set. */
export function MessagesScreen() {
  // One route renders two screens, so the header has to follow. With a thread
  // open the arrow used to leave messaging altogether for `/perfil`, skipping
  // the inbox the visitor came from — and it sat directly above a second,
  // labelled back button that went somewhere else.
  const inThread = Boolean(useSearchParams().get("conversa"));

  return (
    <>
      <PageHeader
        title="Mensagens"
        subtitle={inThread ? "Conversa" : "Suas conversas com abrigos e prestadores"}
        backTo={inThread ? "/mensagens" : "/perfil"}
      />
      <main className="mx-auto max-w-md p-4">
        <MessagesView />
      </main>
    </>
  );
}
