"use client";

import { MessagesView } from "./messages-view.tsx";
import { PageHeader } from "./page-header.tsx";

/** Mensagens — conversation list, or one thread when ?conversa= is set. */
export function MessagesScreen() {
  return (
    <>
      <PageHeader
        title="Mensagens"
        subtitle="Suas conversas com abrigos e prestadores"
        backTo="/perfil"
      />
      <main className="mx-auto max-w-md p-4">
        <MessagesView />
      </main>
    </>
  );
}
